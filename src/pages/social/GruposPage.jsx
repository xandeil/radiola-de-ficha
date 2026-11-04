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
import { useT } from '@/contexts/I18nContext';

/*
 * RF073–RF075 – Comunidades por gênero e por formato.
 * O filtro é feito no front porque a lista de grupos é pequena;
 * com milhares de grupos, ele viraria parâmetro da API (?categoria=).
 */

const FILTROS = [
  { valor: '', chave: 'todos' },
  { valor: 'meus', chave: 'meus' },
  { valor: 'genero', chave: 'genero' },
  { valor: 'formato', chave: 'formato' },
];

const CORES = ['#b4462a', '#3f6d7a', '#5c7a4f', '#a14d6b', '#c9a227', '#4a3b2a'];

function CriarGrupo({ aberto, aoFechar, aoCriar }) {
  const t = useT();
  const [form, setForm] = useState({ nome: '', descricao: '', categoria: 'genero', cor: CORES[0] });
  const [erros, setErros] = useState({});
  const [erroGeral, setErroGeral] = useState('');
  const [salvando, setSalvando] = useState(false);
  const mudar = (campo) => (e) => setForm({ ...form, [campo]: e.target.value });

  const salvar = async (e) => {
    e.preventDefault();
    const novos = validar.limparErros({
      nome: validar.obrigatorio(form.nome, t('social.grupos.nome')) || (form.nome.trim().length < 3 ? t('social.grupos.minimo3') : null),
      descricao: validar.obrigatorio(form.descricao, t('social.grupos.descricao')),
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
    <Modal aberto={aberto} titulo={t('social.grupos.criar')} aoFechar={aoFechar}>
      <form className={styles.formGrupo} onSubmit={salvar} noValidate>
        {erroGeral && <Alerta tipo="erro">{erroGeral}</Alerta>}
        <Entrada rotulo={t('social.grupos.nome')} obrigatorio value={form.nome} onChange={mudar('nome')} erro={erros.nome} maxLength={60} />
        <AreaTexto rotulo={t('social.grupos.descricao')} value={form.descricao} onChange={mudar('descricao')} erro={erros.descricao} maxLength={300} />
        <Selecao
          rotulo={t('social.grupos.tipo')}
          vazio={null}
          opcoes={[{ valor: 'genero', rotulo: t('social.grupos.tipoGenero') }, { valor: 'formato', rotulo: t('social.grupos.tipoFormato') }, { valor: 'outro', rotulo: t('social.grupos.tipoOutro') }]}
          value={form.categoria}
          onChange={mudar('categoria')}
        />
        <div className={styles.cores} role="radiogroup" aria-label={t('social.grupos.cor')}>
          {CORES.map((c) => (
            <button key={c} type="button" role="radio" aria-checked={form.cor === c} aria-label={t('social.grupos.corX', { cor: c })} style={{ background: c }} onClick={() => setForm({ ...form, cor: c })} />
          ))}
        </div>
        <div className={styles.acoesModal}>
          <Botao variante="secundario" onClick={aoFechar}>{t('social.grupos.cancelar')}</Botao>
          <Botao type="submit" carregando={salvando}>{t('social.grupos.criar')}</Botao>
        </div>
      </form>
    </Modal>
  );
}

export default function GruposPage() {
  const navegar = useNavigate();
  const t = useT();
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
        titulo={t('social.grupos.titulo')}
        subtitulo={t('social.grupos.subtitulo')}
        acoes={<Botao icone={<Icone nome="mais" />} onClick={() => setCriando(true)}>{t('social.grupos.criar')}</Botao>}
      />
      <NavSocial />

      <div className={styles.filtros} role="group" aria-label={t('social.grupos.filtrar')}>
        {FILTROS.map((f) => (
          <button key={f.valor} type="button" aria-pressed={filtro === f.valor} onClick={() => setFiltro(f.valor)}>
            {t(`social.grupos.filtro.${f.chave}`)}
          </button>
        ))}
      </div>

      {grupos.carregando && !grupos.dados ? (
        <Carregando />
      ) : grupos.erro ? (
        <EstadoErro erro={grupos.erro} aoTentarDeNovo={grupos.recarregar} />
      ) : visiveis.length === 0 ? (
        <EstadoVazio titulo={filtro === 'meus' ? t('social.grupos.nenhumMeu') : t('social.grupos.nenhum')} />
      ) : (
        <div className={styles.grade}>
          {visiveis.map((g) => (
            <Link key={g.id} to={`/grupos/${g.id}`} className={styles.cartaoGrupo}>
              <span className={styles.faixa} style={{ background: g.cor }} aria-hidden="true" />
              <div className={styles.corpoGrupo}>
                <span className={styles.categoria}>{t(`social.grupos.cat.${g.categoria}`)}</span>
                <h2>{g.nome}</h2>
                <p>{g.descricao}</p>
                <span className={styles.membros}>
                  {t('social.grupos.membros', { count: g.total_membros })}
                  {g.sou_membro && <strong>{t('social.grupos.participa')}</strong>}
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
