import { useEffect, useId, useState } from 'react';
import { Link, useLocation, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useConquistas } from '@/hooks/useConquistas';
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
import { ESTADOS_CAPA, GENEROS, ESTADOS_CONSERVACAO, LIMITE_PLANO_GRATUITO, SUBTIPOS, TEM_LADO, TIPOS_MIDIA } from '@/utils/constantes';
import { opcoesDominio, rotuloDominio } from '@/i18n/dominio';
import { t as traduzir } from '@/i18n';
import { formatarDuracao, lerDuracao } from '@/utils/formatadores';
import * as validar from '@/utils/validadores';
import estilosForm from '@/components/catalogo/Formulario.module.css';
import styles from './ItemFormularioPage.module.css';
import { useT } from '@/contexts/I18nContext';

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
  genero: '',
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
    titulo: duplicando ? traduzir('item.form.copia', { titulo: item.titulo }) : item.titulo,
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

/**
 * Dados vindos do scanner (ou de outra tela) pelo "state" da navegação.
 * O state viaja junto com a navegação sem aparecer na URL — bom para
 * objetos grandes como uma lista de faixas.
 */
function prefillParaForm(prefill) {
  return {
    ...FORM_VAZIO,
    ...prefill,
    faixas: (prefill.faixas || []).map((f, i) => ({
      ...f,
      numero: f.numero || i + 1,
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
    genero: (form.genero || '').trim(),
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
    titulo: validar.obrigatorio(form.titulo, traduzir('campo.titulo')),
    tipo_midia: validar.obrigatorio(form.tipo_midia, traduzir('campo.formato')),
    ano_lancamento: validar.ano(form.ano_lancamento),
    local_principal: validar.obrigatorio(form.localizacao.local_principal, traduzir('campo.localPrincipal')),
  };
  form.faixas.forEach((f, i) => {
    erros[`faixa_${i}_titulo`] = validar.obrigatorio(f.titulo, traduzir('campo.tituloFaixa'));
    if (f.duracao_texto && lerDuracao(f.duracao_texto) == null) erros[`faixa_${i}_duracao`] = traduzir('campo.usarMmss');
  });
  return validar.limparErros(erros);
}

export default function ItemFormularioPage() {
  const t = useT();
  const { id } = useParams();
  const [params] = useSearchParams();
  const navegar = useNavigate();
  const { usuario } = useAuth();
  const { verificar } = useConquistas();
  const idArtistas = useId();
  const idGeneros = useId();

  const idDuplicar = params.get('duplicar');
  const editando = Boolean(id);
  const idOrigem = id || idDuplicar;
  const { state: estadoNavegacao } = useLocation();
  const prefill = !idOrigem ? estadoNavegacao?.prefill : null;
  const fontePrefill = estadoNavegacao?.fonte;

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
      setForm(prefill ? prefillParaForm(prefill) : FORM_VAZIO);
      return;
    }
    setCarregando(true);
    catalogoService
      .buscarPorId(idOrigem)
      .then((item) => setForm(itemParaForm(item, !editando)))
      .catch(setErroCarga)
      .finally(() => setCarregando(false));
    // prefill fica de fora: ele só importa na primeira montagem da tela
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
      setErroGeral(t('item.form.confira'));
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    setSalvando(true);
    setErroGeral('');
    try {
      const dados = formParaItem(form);
      const salvo = editando ? await catalogoService.atualizar(id, dados) : await catalogoService.criar(dados);
      verificar(); // sem await: a conquista aparece como toast enquanto a ficha abre
      navegar(`/catalogo/${salvo.id}`, { replace: true });
    } catch (erro) {
      setErroGeral(erro.message);
      setSalvando(false);
    }
  };

  if (carregando) return <Carregando />;
  if (erroCarga) return <EstadoErro erro={erroCarga} />;

  const titulo = editando ? t('item.form.editar') : idDuplicar ? t('item.form.duplicar') : t('item.form.novo');

  return (
    <form onSubmit={salvar} noValidate>
      <TituloPagina
        sobretitulo={t('item.catalogo')}
        titulo={titulo}
        subtitulo={editando ? form.titulo : t('item.form.subtitulo')}
      />

      {prefill && fontePrefill !== 'manual' && (
        <div className={styles.alerta}>
          <Alerta tipo="info" titulo={t('item.form.scanner', { fonte: fontePrefill })}>
            {t('item.form.scannerTexto')}
          </Alerta>
        </div>
      )}

      {limiteAtingido && (
        <div className={styles.alerta}>
          <Alerta tipo="aviso" titulo={t('item.form.limiteTitulo')}>
            {t('item.form.limiteTexto', { limite: LIMITE_PLANO_GRATUITO })} <Link to="/planos">{t('item.form.verPlanos')}</Link>
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
            <h2 className={estilosForm.secaoTitulo}>{t('item.form.basicas')}</h2>
            <p className={estilosForm.secaoDescricao}>{t('item.form.basicasDesc')}</p>

            <div className={estilosForm.tipos} role="radiogroup" aria-label={t('campo.formato')}>
              {TIPOS_MIDIA.map((tipo) => (
                <label key={tipo.valor} className={estilosForm.tipo}>
                  <input type="radio" name="tipo_midia" value={tipo.valor} checked={form.tipo_midia === tipo.valor} onChange={() => mudarTipo(tipo.valor)} />
                  <span>{rotuloDominio('tipo', tipo.valor)}</span>
                </label>
              ))}
            </div>

            <div className={estilosForm.grade}>
              <Entrada className={estilosForm.largo} rotulo={t('campo.titulo')} obrigatorio value={form.titulo} onChange={mudar('titulo')} erro={erros.titulo} />
              <Entrada rotulo={t('campo.artistaBanda')} list={idArtistas} value={form.artista} onChange={mudar('artista')} />
              <datalist id={idArtistas}>
                {artistasMock.map((a) => (
                  <option key={a.id} value={a.nome} />
                ))}
              </datalist>
              <Selecao rotulo={t('campo.subtipo')} vazio={t('comum.selecione')} opcoes={opcoesDominio('subtipo', SUBTIPOS[form.tipo_midia])} value={form.subtipo} onChange={mudar('subtipo')} />
              <Entrada rotulo={t('campo.genero')} list={idGeneros} placeholder={t('campo.generoPh')} value={form.genero || ''} onChange={mudar('genero')} />
              <datalist id={idGeneros}>
                {GENEROS.map((g) => (
                  <option key={g} value={g} />
                ))}
              </datalist>
              <Entrada rotulo={t('campo.anoLancamento')} type="number" inputMode="numeric" value={form.ano_lancamento} onChange={mudar('ano_lancamento')} erro={erros.ano_lancamento} />
              <Entrada rotulo={t('campo.gravadora')} value={form.gravadora} onChange={mudar('gravadora')} />
              <Entrada rotulo={t('campo.paisOrigem')} value={form.pais_origem} onChange={mudar('pais_origem')} />
              <Entrada rotulo={t('campo.numeroCatalogo')} value={form.numero_catalogo} onChange={mudar('numero_catalogo')} />
              <Entrada rotulo={t('campo.codigoBarras')} inputMode="numeric" value={form.codigo_barras} onChange={mudar('codigo_barras')} dica={t('campo.codigoBarrasDica')} />
              <Selecao rotulo={t('campo.conservacao')} vazio={t('comum.selecione')} opcoes={opcoesDominio('conservacao', ESTADOS_CONSERVACAO)} value={form.estado_conservacao} onChange={mudar('estado_conservacao')} />
              <Selecao rotulo={t('campo.estadoCapa')} vazio={t('comum.selecione')} opcoes={opcoesDominio('conservacao', ESTADOS_CAPA)} value={form.estado_capa} onChange={mudar('estado_capa')} />
              <Entrada rotulo={t('campo.precoPagoRs')} type="number" min="0" step="0.01" value={form.preco_pago} onChange={mudar('preco_pago')} />
              <Entrada rotulo={t('campo.valorEstimadoRs')} type="number" min="0" step="0.01" value={form.valor_estimado} onChange={mudar('valor_estimado')} />
              <AreaTexto className={estilosForm.largo} rotulo={t('campo.notasPessoais')} placeholder={t('campo.notasPessoaisPh')} value={form.notas_pessoais} onChange={mudar('notas_pessoais')} />
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
          <span className={styles.previaRotulo}>{t('item.form.previa')}</span>
          <CapaMidia item={{ ...form, faixas: [], titulo: form.titulo || t('campo.titulo'), artista: form.artista || t('catalogo.col.artista') }} />
          <div className={styles.previaCampos}>
            <Entrada rotulo={t('campo.corCapa')} type="color" value={form.cor_capa} onChange={mudar('cor_capa')} dica={t('campo.corCapaDica')} />
            <Entrada rotulo={t('campo.urlCapa')} type="url" placeholder="https://..." value={form.capa_imagem || ''} onChange={mudar('capa_imagem')} dica={t('campo.urlCapaDica')} />
            <Caixa rotulo={t('campo.publico')} checked={form.publico} onChange={(e) => mudarCampo('publico', e.target.checked)} />
          </div>
        </aside>
      </div>

      <div className={styles.rodape}>
        <Botao variante="secundario" onClick={() => navegar(-1)}>
          {t('item.form.cancelar')}
        </Botao>
        <Botao type="submit" carregando={salvando} disabled={limiteAtingido}>
          {editando ? t('item.form.salvarAlteracoes') : t('item.form.cadastrar')}
        </Botao>
      </div>
    </form>
  );
}
