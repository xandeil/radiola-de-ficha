import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useCarregar } from '@/hooks/useCarregar';
import { socialService } from '@/services/socialService';
import TituloPagina from '@/components/ui/TituloPagina';
import NavSocial from '@/components/social/NavSocial';
import Botao from '@/components/ui/Botao';
import Icone from '@/components/ui/Icone';
import Modal from '@/components/ui/Modal';
import Alerta from '@/components/ui/Alerta';
import { AreaTexto, Entrada, Selecao } from '@/components/ui/Campo';
import { Carregando, EstadoErro, EstadoVazio } from '@/components/ui/Estados';
import * as validar from '@/utils/validadores';
import styles from './Grupos.module.css';

/*
 * RF073–RF075 – Comunidades por gênero e por formato.
 * O filtro é feito no front porque a lista de grupos é pequena;
 * com milhares de grupos, ele viraria parâmetro da API (?categoria=).
 */

const FILTROS = [
  { valor: '', rotulo: 'Todos' },
  { valor: 'meus', rotulo: 'Meus grupos' },
  { valor: 'genero', rotulo: 'Por gênero' },
  { valor: 'formato', rotulo: 'Por formato' },
];

const CORES = ['#b4462a', '#3f6d7a', '#5c7a4f', '#a14d6b', '#c9a227', '#4a3b2a'];

function CriarGrupo({ aberto, aoFechar, aoCriar }) {
  const [form, setForm] = useState({ nome: '', descricao: '', categoria: 'genero', cor: CORES[0] });
  const [erros, setErros] = useState({});
  const [erroGeral, setErroGeral] = useState('');
  const [salvando, setSalvando] = useState(false);
  const mudar = (campo) => (e) => setForm({ ...form, [campo]: e.target.value });

  const salvar = async (e) => {
    e.preventDefault();
    const novos = validar.limparErros({
      nome: validar.obrigatorio(form.nome, 'Nome') || (form.nome.trim().length < 3 ? 'Mínimo 3 caracteres' : null),
      descricao: validar.obrigatorio(form.descricao, 'Descrição'),
    });
    setErros(novos);
    if (Object.keys(novos).length) return;
    setSalvando(true);
    try {
      await aoCriar(form);
    } catch (err) {
      setErroGeral(err.message);
      setSalvando(false);
    }
  };

  return (
    <Modal aberto={aberto} titulo="Criar grupo" aoFechar={aoFechar}>
      <form className={styles.formGrupo} onSubmit={salvar} noValidate>
        {erroGeral && <Alerta tipo="erro">{erroGeral}</Alerta>}
        <Entrada rotulo="Nome" obrigatorio value={form.nome} onChange={mudar('nome')} erro={erros.nome} maxLength={60} />
        <AreaTexto rotulo="Descrição" value={form.descricao} onChange={mudar('descricao')} erro={erros.descricao} maxLength={300} />
        <Selecao
          rotulo="Tipo"
          vazio={null}
          opcoes={[{ valor: 'genero', rotulo: 'Gênero musical' }, { valor: 'formato', rotulo: 'Formato (vinil, K7...)' }, { valor: 'outro', rotulo: 'Outro' }]}
          value={form.categoria}
          onChange={mudar('categoria')}
        />
        <div className={styles.cores} role="radiogroup" aria-label="Cor do grupo">
          {CORES.map((c) => (
            <button key={c} type="button" role="radio" aria-checked={form.cor === c} aria-label={`Cor ${c}`} style={{ background: c }} onClick={() => setForm({ ...form, cor: c })} />
          ))}
        </div>
        <div className={styles.acoesModal}>
          <Botao variante="secundario" onClick={aoFechar}>Cancelar</Botao>
          <Botao type="submit" carregando={salvando}>Criar grupo</Botao>
        </div>
      </form>
    </Modal>
  );
}

export default function GruposPage() {
  const navegar = useNavigate();
  const grupos = useCarregar(() => socialService.grupos(), []);
  const [filtro, setFiltro] = useState('');
  const [criando, setCriando] = useState(false);

  const visiveis = (grupos.dados || []).filter((g) =>
    !filtro ? true : filtro === 'meus' ? g.sou_membro : g.categoria === filtro,
  );

  const criar = async (dados) => {
    const grupo = await socialService.criarGrupo(dados);
    navegar(`/grupos/${grupo.id}`);
  };

  return (
    <>
      <TituloPagina
        titulo="Grupos"
        subtitulo="Comunidades por gênero e formato."
        acoes={<Botao icone={<Icone nome="mais" />} onClick={() => setCriando(true)}>Criar grupo</Botao>}
      />
      <NavSocial />

      <div className={styles.filtros} role="group" aria-label="Filtrar grupos">
        {FILTROS.map((f) => (
          <button key={f.valor} type="button" aria-pressed={filtro === f.valor} onClick={() => setFiltro(f.valor)}>
            {f.rotulo}
          </button>
        ))}
      </div>

      {grupos.carregando && !grupos.dados ? (
        <Carregando />
      ) : grupos.erro ? (
        <EstadoErro erro={grupos.erro} aoTentarDeNovo={grupos.recarregar} />
      ) : visiveis.length === 0 ? (
        <EstadoVazio titulo={filtro === 'meus' ? 'Você ainda não entrou em nenhum grupo' : 'Nenhum grupo aqui'} />
      ) : (
        <div className={styles.grade}>
          {visiveis.map((g) => (
            <Link key={g.id} to={`/grupos/${g.id}`} className={styles.cartaoGrupo}>
              <span className={styles.faixa} style={{ background: g.cor }} aria-hidden="true" />
              <div className={styles.corpoGrupo}>
                <span className={styles.categoria}>{{ genero: 'Gênero', formato: 'Formato', outro: 'Comunidade' }[g.categoria]}</span>
                <h2>{g.nome}</h2>
                <p>{g.descricao}</p>
                <span className={styles.membros}>
                  {g.total_membros} {g.total_membros === 1 ? 'membro' : 'membros'}
                  {g.sou_membro && <strong> · você participa</strong>}
                </span>
              </div>
            </Link>
          ))}
        </div>
      )}

      {/* key força um formulário limpo a cada abertura */}
      <CriarGrupo key={String(criando)} aberto={criando} aoFechar={() => setCriando(false)} aoCriar={criar} />
    </>
  );
}
