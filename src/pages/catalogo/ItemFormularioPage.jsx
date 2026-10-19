import { useEffect, useId, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { catalogoService } from '@/services/catalogoService';
import { artistasMock } from '@/mocks/dados';
import TituloPagina from '@/components/ui/TituloPagina';
import Botao from '@/components/ui/Botao';
import Alerta from '@/components/ui/Alerta';
import { AreaTexto, Caixa, Entrada, Selecao } from '@/components/ui/Campo';
import { Carregando, EstadoErro } from '@/components/ui/Estados';
import CapaMidia from '@/components/catalogo/CapaMidia';
import CamposEspecificos from '@/components/catalogo/CamposEspecificos';
import EditorFaixas, { gerarChave } from '@/components/catalogo/EditorFaixas';
import CamposLocalizacao from '@/components/catalogo/CamposLocalizacao';
import { ESTADOS_CAPA, ESTADOS_CONSERVACAO, LIMITE_PLANO_GRATUITO, SUBTIPOS, TEM_LADO, TIPOS_MIDIA } from '@/utils/constantes';
import { formatarDuracao, lerDuracao } from '@/utils/formatadores';
import * as validar from '@/utils/validadores';
import estilosForm from '@/components/catalogo/Formulario.module.css';
import styles from './ItemFormularioPage.module.css';

/*
 * UMA página para três situações: cadastrar, editar e duplicar.
 *   /catalogo/novo                 -> cadastro em branco
 *   /catalogo/novo?duplicar=3      -> cadastro pré-preenchido com o item 3 (RF018)
 *   /catalogo/3/editar             -> edição do item 3
 * Reaproveitar a mesma tela evita dois formulários que "quase" se parecem
 * e que com o tempo começam a ter regras diferentes sem ninguém perceber.
 */

const FORM_VAZIO = {
  tipo_midia: 'LP',
  subtipo: '',
  titulo: '',
  artista: '',
  ano_lancamento: '',
  gravadora: '',
  pais_origem: 'Brasil',
  numero_catalogo: '',
  codigo_barras: '',
  estado_conservacao: '',
  estado_capa: '',
  preco_pago: '',
  valor_estimado: '',
  notas_pessoais: '',
  capa_imagem: '',
  cor_capa: '#3f6d7a',
  publico: false,
  velocidade: '33⅓',
  localizacao: { local_principal: '', movel: '', prateleira: '', posicao: '' },
  faixas: [],
};

/** Converte o item da API para o formato do formulário (inputs trabalham com string). */
function itemParaForm(item, duplicando) {
  const { id, id_usuario, data_cadastro, data_atualizacao, ...resto } = item;
  return {
    ...FORM_VAZIO,
    ...resto,
    titulo: duplicando ? `${item.titulo} (cópia)` : item.titulo,
    ano_lancamento: item.ano_lancamento ?? '',
    preco_pago: item.preco_pago ?? '',
    valor_estimado: item.valor_estimado ?? '',
    localizacao: { ...FORM_VAZIO.localizacao, ...item.localizacao },
    faixas: (item.faixas || []).map((f) => ({
      ...f,
      id: duplicando ? undefined : f.id,
      chaveLocal: gerarChave(),
      duracao_texto: f.duracao_segundos ? formatarDuracao(f.duracao_segundos) : '',
    })),
  };
}

/** O caminho inverso: limpa o formulário para mandar à API. */
function formParaItem(form) {
  const numero = (v) => (v === '' || v == null ? null : Number(v));
  const { faixas, ...resto } = form;
  return {
    ...resto,
    titulo: form.titulo.trim(),
    artista: form.artista.trim(),
    ano_lancamento: numero(form.ano_lancamento),
    ano_gravacao: numero(form.ano_gravacao),
    preco_pago: numero(form.preco_pago),
    valor_estimado: numero(form.valor_estimado),
    velocidade: form.tipo_midia === 'LP' ? form.velocidade : 'N/A',
    faixas: faixas.map(({ chaveLocal, duracao_texto, ...f }) => ({
      ...f,
      titulo: f.titulo.trim(),
      lado: TEM_LADO.includes(form.tipo_midia) ? f.lado : null,
      duracao_segundos: lerDuracao(duracao_texto),
    })),
  };
}

function validarForm(form) {
  const erros = {
    titulo: validar.obrigatorio(form.titulo, 'Título'),
    tipo_midia: validar.obrigatorio(form.tipo_midia, 'Formato'),
    ano_lancamento: validar.ano(form.ano_lancamento),
    local_principal: validar.obrigatorio(form.localizacao.local_principal, 'Local principal'),
  };
  form.faixas.forEach((f, i) => {
    erros[`faixa_${i}_titulo`] = validar.obrigatorio(f.titulo, 'Título da faixa');
    if (f.duracao_texto && lerDuracao(f.duracao_texto) == null) erros[`faixa_${i}_duracao`] = 'Use mm:ss';
  });
  return validar.limparErros(erros);
}

export default function ItemFormularioPage() {
  const { id } = useParams();
  const [params] = useSearchParams();
  const navegar = useNavigate();
  const { usuario } = useAuth();
  const idArtistas = useId();

  const idDuplicar = params.get('duplicar');
  const editando = Boolean(id);
  const idOrigem = id || idDuplicar;

  const [form, setForm] = useState(FORM_VAZIO);
  const [carregando, setCarregando] = useState(Boolean(idOrigem));
  const [erroCarga, setErroCarga] = useState(null);
  const [erros, setErros] = useState({});
  const [erroGeral, setErroGeral] = useState('');
  const [salvando, setSalvando] = useState(false);
  const [locais, setLocais] = useState([]);
  const [totalItens, setTotalItens] = useState(0);

  useEffect(() => {
    catalogoService.locais().then(setLocais).catch(() => {});
    catalogoService.listar().then((l) => setTotalItens(l.length)).catch(() => {});
  }, []);

  useEffect(() => {
    if (!idOrigem) {
      setForm(FORM_VAZIO);
      return;
    }
    setCarregando(true);
    catalogoService
      .buscarPorId(idOrigem)
      .then((item) => setForm(itemParaForm(item, !editando)))
      .catch(setErroCarga)
      .finally(() => setCarregando(false));
  }, [idOrigem, editando]);

  const mudarCampo = (campo, valor) => setForm((f) => ({ ...f, [campo]: valor }));
  const mudar = (campo) => (e) => mudarCampo(campo, e.target.value);

  const mudarTipo = (tipo) =>
    setForm((f) => ({
      ...f,
      tipo_midia: tipo,
      subtipo: SUBTIPOS[tipo].includes(f.subtipo) ? f.subtipo : '',
      faixas: f.faixas.map((faixa) => ({ ...faixa, lado: TEM_LADO.includes(tipo) ? faixa.lado || 'A' : null })),
    }));

  const limiteAtingido = !editando && usuario?.plano === 'gratuito' && totalItens >= LIMITE_PLANO_GRATUITO;

  const salvar = async (e) => {
    e.preventDefault();
    const novosErros = validarForm(form);
    setErros(novosErros);
    if (Object.keys(novosErros).length) {
      setErroGeral('Confira os campos destacados.');
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    setSalvando(true);
    setErroGeral('');
    try {
      const dados = formParaItem(form);
      const salvo = editando ? await catalogoService.atualizar(id, dados) : await catalogoService.criar(dados);
      navegar(`/catalogo/${salvo.id}`, { replace: true });
    } catch (erro) {
      setErroGeral(erro.message);
      setSalvando(false);
    }
  };

  if (carregando) return <Carregando />;
  if (erroCarga) return <EstadoErro erro={erroCarga} />;

  const titulo = editando ? 'Editar item' : idDuplicar ? 'Duplicar item' : 'Novo item';

  return (
    <form onSubmit={salvar} noValidate>
      <TituloPagina
        sobretitulo="Catálogo"
        titulo={titulo}
        subtitulo={editando ? form.titulo : 'Preencha a ficha do seu disco, CD, DVD ou fita.'}
      />

      {limiteAtingido && (
        <div className={styles.alerta}>
          <Alerta tipo="aviso" titulo="Limite do plano gratuito atingido">
            A Radiola Básica permite até {LIMITE_PLANO_GRATUITO} itens. Os planos Premium chegam na Fase 4.
          </Alerta>
        </div>
      )}
      {erroGeral && (
        <div className={styles.alerta}>
          <Alerta tipo="erro" aoFechar={() => setErroGeral('')}>{erroGeral}</Alerta>
        </div>
      )}

      <div className={styles.layout}>
        <div>
          <section className={estilosForm.secao}>
            <h2 className={estilosForm.secaoTitulo}>Informações básicas</h2>
            <p className={estilosForm.secaoDescricao}>Escolha o formato primeiro: os campos se ajustam a ele.</p>

            <div className={estilosForm.tipos} role="radiogroup" aria-label="Formato">
              {TIPOS_MIDIA.map((t) => (
                <label key={t.valor} className={estilosForm.tipo}>
                  <input type="radio" name="tipo_midia" value={t.valor} checked={form.tipo_midia === t.valor} onChange={() => mudarTipo(t.valor)} />
                  <span>{t.rotulo}</span>
                </label>
              ))}
            </div>

            <div className={estilosForm.grade}>
              <Entrada className={estilosForm.largo} rotulo="Título" obrigatorio value={form.titulo} onChange={mudar('titulo')} erro={erros.titulo} />
              <Entrada rotulo="Artista / banda" list={idArtistas} value={form.artista} onChange={mudar('artista')} />
              <datalist id={idArtistas}>
                {artistasMock.map((a) => (
                  <option key={a.id} value={a.nome} />
                ))}
              </datalist>
              <Selecao rotulo="Subtipo" opcoes={SUBTIPOS[form.tipo_midia]} value={form.subtipo} onChange={mudar('subtipo')} />
              <Entrada rotulo="Ano de lançamento" type="number" inputMode="numeric" value={form.ano_lancamento} onChange={mudar('ano_lancamento')} erro={erros.ano_lancamento} />
              <Entrada rotulo="Gravadora" value={form.gravadora} onChange={mudar('gravadora')} />
              <Entrada rotulo="País de origem" value={form.pais_origem} onChange={mudar('pais_origem')} />
              <Entrada rotulo="Nº de catálogo" value={form.numero_catalogo} onChange={mudar('numero_catalogo')} />
              <Entrada rotulo="Código de barras" inputMode="numeric" value={form.codigo_barras} onChange={mudar('codigo_barras')} dica="EAN-13 ou UPC. O scanner chega na Fase 3.5" />
              <Selecao rotulo="Conservação" opcoes={ESTADOS_CONSERVACAO} value={form.estado_conservacao} onChange={mudar('estado_conservacao')} />
              <Selecao rotulo="Estado da capa" opcoes={ESTADOS_CAPA} value={form.estado_capa} onChange={mudar('estado_capa')} />
              <Entrada rotulo="Preço pago (R$)" type="number" min="0" step="0.01" value={form.preco_pago} onChange={mudar('preco_pago')} />
              <Entrada rotulo="Valor estimado (R$)" type="number" min="0" step="0.01" value={form.valor_estimado} onChange={mudar('valor_estimado')} />
              <AreaTexto className={estilosForm.largo} rotulo="Notas pessoais" placeholder="Onde comprou, memórias, detalhes da prensagem..." value={form.notas_pessoais} onChange={mudar('notas_pessoais')} />
            </div>
          </section>

          <CamposEspecificos valores={form} aoMudar={mudarCampo} />

          <EditorFaixas
            faixas={form.faixas}
            temLado={TEM_LADO.includes(form.tipo_midia)}
            erros={erros}
            aoMudar={(faixas) => mudarCampo('faixas', faixas)}
          />

          <CamposLocalizacao
            valores={form.localizacao}
            locaisSugeridos={locais}
            erros={erros}
            aoMudar={(localizacao) => mudarCampo('localizacao', localizacao)}
          />
        </div>

        {/* Prévia ao vivo da ficha: o usuário vê o resultado enquanto digita */}
        <aside className={styles.previa}>
          <span className={styles.previaRotulo}>Prévia da ficha</span>
          <CapaMidia item={{ ...form, faixas: [], titulo: form.titulo || 'Título', artista: form.artista || 'Artista' }} />
          <div className={styles.previaCampos}>
            <Entrada rotulo="Cor da capa" type="color" value={form.cor_capa} onChange={mudar('cor_capa')} dica="Usada quando não há imagem" />
            <Entrada rotulo="URL da imagem da capa" type="url" placeholder="https://..." value={form.capa_imagem || ''} onChange={mudar('capa_imagem')} dica="Upload de imagem chega com o back-end" />
            <Caixa rotulo="Mostrar na estante pública" checked={form.publico} onChange={(e) => mudarCampo('publico', e.target.checked)} />
          </div>
        </aside>
      </div>

      <div className={styles.rodape}>
        <Botao variante="secundario" onClick={() => navegar(-1)}>
          Cancelar
        </Botao>
        <Botao type="submit" carregando={salvando} disabled={limiteAtingido}>
          {editando ? 'Salvar alterações' : 'Cadastrar item'}
        </Botao>
      </div>
    </form>
  );
}
