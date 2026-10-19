import { useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { scannerService } from '@/services/scannerService';
import { catalogoService } from '@/services/catalogoService';
import { avisarLeitura, lerCodigoDeImagem } from '@/services/leitorCodigo';
import { analisarCodigo } from '@/utils/codigoBarras';
import LeitorCamera from '@/components/scanner/LeitorCamera';
import TituloPagina from '@/components/ui/TituloPagina';
import Botao from '@/components/ui/Botao';
import Alerta from '@/components/ui/Alerta';
import Icone from '@/components/ui/Icone';
import { Entrada } from '@/components/ui/Campo';
import CapaMidia from '@/components/catalogo/CapaMidia';
import { Carregando } from '@/components/ui/Estados';
import styles from './ScannerPage.module.css';

/*
 * RF012 / Seção 6 – Catalogação pelo código de barras.
 *
 * A página é uma pequena MÁQUINA DE ESTADOS. Em vez de vários booleanos
 * soltos (carregando, temResultado, deuErro...) que podem ficar
 * contraditórios, um único "etapa" diz onde estamos:
 *
 *   'ler' -> 'buscando' -> 'edicoes' -> 'abrindo' -> (vai para o cadastro)
 *                       \-> 'nada'  (nenhuma edição: cadastro manual)
 */

const MODOS = [
  { id: 'camera', rotulo: 'Câmera', icone: 'camera' },
  { id: 'foto', rotulo: 'Foto', icone: 'arquivo' },
  { id: 'digitar', rotulo: 'Digitar', icone: 'codigo' },
  { id: 'texto', rotulo: 'Sem código', icone: 'busca' },
];

export default function ScannerPage() {
  const navegar = useNavigate();
  const inputFoto = useRef(null);
  const [modo, setModo] = useState('camera');
  const [etapa, setEtapa] = useState('ler');
  const [analise, setAnalise] = useState(null);
  const [edicoes, setEdicoes] = useState([]);
  const [origem, setOrigem] = useState('');
  const [jaTenho, setJaTenho] = useState(null);
  const [erro, setErro] = useState('');
  const [digitado, setDigitado] = useState('');
  const [busca, setBusca] = useState({ titulo: '', artista: '' });

  const recomecar = () => {
    setEtapa('ler');
    setAnalise(null);
    setEdicoes([]);
    setErro('');
    setJaTenho(null);
  };

  // Passos 4 a 6: com o código válido, procura as edições
  const pesquisar = async (resultado) => {
    avisarLeitura();
    setAnalise(resultado);
    setErro('');
    setEtapa('buscando');
    try {
      const [{ edicoes: achadas, origem: fonte }, colecao] = await Promise.all([
        scannerService.buscarPorCodigo(resultado),
        catalogoService.listar(),
      ]);
      // Avisa se o item já está na coleção (evita cadastro duplicado)
      setJaTenho(colecao.find((i) => i.codigo_barras && analisarCodigo(i.codigo_barras).codigo === resultado.codigo) || null);
      setEdicoes(achadas);
      setOrigem(fonte);
      setEtapa(achadas.length ? 'edicoes' : 'nada');
    } catch (e) {
      setErro(e.message);
      setEtapa('nada');
    }
  };

  const pesquisarTexto = async (e) => {
    e.preventDefault();
    if (!busca.titulo.trim()) return setErro('Informe ao menos o título');
    setErro('');
    setAnalise(null);
    setEtapa('buscando');
    try {
      const achadas = await scannerService.buscarPorTexto(busca.titulo, busca.artista);
      setEdicoes(achadas);
      setOrigem('MusicBrainz');
      setEtapa(achadas.length ? 'edicoes' : 'nada');
    } catch (err) {
      setErro(err.message);
      setEtapa('nada');
    }
  };

  const enviarDigitado = (e) => {
    e.preventDefault();
    const resultado = analisarCodigo(digitado);
    if (!resultado.valido) return setErro(resultado.erro);
    pesquisar(resultado);
  };

  const aoEscolherFoto = async (e) => {
    const arquivo = e.target.files?.[0];
    e.target.value = '';
    if (!arquivo) return;
    setErro('');
    setEtapa('buscando');
    try {
      const texto = await lerCodigoDeImagem(arquivo);
      const resultado = analisarCodigo(texto);
      if (!resultado.valido) throw new Error(`Li "${texto}", mas ${resultado.erro.toLowerCase()}`);
      pesquisar(resultado);
    } catch (err) {
      setErro(err.message);
      setEtapa('ler');
    }
  };

  // Passo 7: o usuário escolheu a edição -> carrega faixas e abre o cadastro preenchido
  const escolher = async (edicao) => {
    setEtapa('abrindo');
    try {
      const completa = await scannerService.detalhar(edicao);
      navegar('/catalogo/novo', { state: { prefill: scannerService.paraCadastro(completa, analise?.codigo), fonte: completa.fonte } });
    } catch (e) {
      setErro(`${e.message}. Abrindo sem as faixas.`);
      navegar('/catalogo/novo', { state: { prefill: scannerService.paraCadastro(edicao, analise?.codigo), fonte: edicao.fonte } });
    }
  };

  // Seção 6.2.4 – "cadastro manual parcial": só com o código preenchido
  const cadastrarManual = () => navegar('/catalogo/novo', { state: { prefill: { codigo_barras: analise?.codigo || '', titulo: busca.titulo, artista: busca.artista }, fonte: 'manual' } });

  return (
    <>
      <TituloPagina
        sobretitulo="Catálogo"
        titulo="Escanear código de barras"
        subtitulo="Aponte a câmera para o código do LP, CD, DVD ou fita e a ficha se preenche sozinha."
      />

      {etapa === 'ler' && (
        <div className={styles.layout}>
          <div className={styles.modos} role="tablist" aria-label="Como ler o código">
            {MODOS.map((m) => (
              <button key={m.id} type="button" role="tab" aria-selected={modo === m.id} onClick={() => { setModo(m.id); setErro(''); }}>
                <Icone nome={m.icone} tamanho={16} /> {m.rotulo}
              </button>
            ))}
          </div>

          {erro && <Alerta tipo="erro" aoFechar={() => setErro('')}>{erro}</Alerta>}

          {modo === 'camera' && <LeitorCamera aoLer={pesquisar} />}

          {modo === 'foto' && (
            <div className={styles.cartao}>
              <p>Tire uma foto do código (ou escolha da galeria). Funciona bem quando a câmera ao vivo não ajuda.</p>
              {/* capture="environment" abre direto a câmera traseira no celular */}
              <input ref={inputFoto} type="file" accept="image/*" capture="environment" hidden onChange={aoEscolherFoto} />
              <Botao icone={<Icone nome="camera" />} onClick={() => inputFoto.current.click()}>
                Escolher foto
              </Botao>
            </div>
          )}

          {modo === 'digitar' && (
            <form className={styles.cartao} onSubmit={enviarDigitado} noValidate>
              <Entrada
                rotulo="Código de barras"
                inputMode="numeric"
                placeholder="7891234567895"
                value={digitado}
                onChange={(e) => setDigitado(e.target.value)}
                dica="EAN-13, UPC ou ISBN. Teste com 7891234567895 (demonstração)."
              />
              <Botao type="submit">Buscar</Botao>
            </form>
          )}

          {modo === 'texto' && (
            <form className={styles.cartao} onSubmit={pesquisarTexto} noValidate>
              <p>Discos antigos (antes de 1980) quase nunca têm código. Busque pelo nome:</p>
              <Entrada rotulo="Título do álbum" value={busca.titulo} onChange={(e) => setBusca({ ...busca, titulo: e.target.value })} />
              <Entrada rotulo="Artista" value={busca.artista} onChange={(e) => setBusca({ ...busca, artista: e.target.value })} />
              <Botao type="submit">Buscar edições</Botao>
            </form>
          )}
        </div>
      )}

      {(etapa === 'buscando' || etapa === 'abrindo') && (
        <Carregando texto={etapa === 'buscando' ? `Procurando ${analise ? analise.codigo : 'edições'}...` : 'Carregando as faixas...'} />
      )}

      {(etapa === 'edicoes' || etapa === 'nada') && (
        <div className={styles.resultado}>
          {analise && (
            <p className={styles.codigoLido}>
              <Icone nome="codigo" /> <strong>{analise.codigo}</strong> <span>{analise.tipo}</span>
            </p>
          )}

          {jaTenho && (
            <Alerta tipo="aviso" titulo="Você já tem um item com esse código">
              "{jaTenho.titulo}" está em {jaTenho.localizacao?.local_principal || 'sua coleção'}.{' '}
              <Link to={`/catalogo/${jaTenho.id}`}>Ver ficha</Link>
            </Alerta>
          )}

          {erro && <Alerta tipo="erro">{erro}</Alerta>}

          {etapa === 'edicoes' ? (
            <>
              <h2 className={styles.tituloLista}>
                {edicoes.length === 1 ? 'Encontrei esta edição' : `Encontrei ${edicoes.length} edições — qual é a sua?`}
              </h2>
              <p className={styles.fonte}>Fonte: {origem === 'cache' ? 'cache (busca recente)' : origem}</p>
              <ul className={styles.edicoes}>
                {edicoes.map((ed) => (
                  <li key={ed.id}>
                    <button type="button" className={styles.edicao} onClick={() => escolher(ed)}>
                      <span className={styles.capa}>
                        <CapaMidia item={{ titulo: ed.titulo, artista: ed.artista, tipo_midia: ed.formato, capa_imagem: ed.capa_imagem, cor_capa: ed.cor_capa }} tamanho="miniatura" />
                      </span>
                      <span className={styles.infoEdicao}>
                        <strong>{ed.titulo}</strong>
                        <span>{ed.artista}</span>
                        <small>{[ed.ano, ed.pais, ed.gravadora, ed.numero_catalogo].filter(Boolean).join(' · ')}</small>
                        <small className={styles.formato}>{ed.descricao_formato || ed.formato}</small>
                      </span>
                      <Icone nome="voltar" tamanho={18} className={styles.seta} />
                    </button>
                  </li>
                ))}
              </ul>
            </>
          ) : (
            <div className={styles.cartao}>
              <h2 className={styles.tituloLista}>Não achei esse item nas bases de dados</h2>
              <p>Acontece com edições raras, nacionais antigas ou caseiras. Você pode cadastrar manualmente — o código já vai preenchido.</p>
            </div>
          )}

          <div className={styles.rodape}>
            <Botao variante="secundario" onClick={recomecar}>
              Escanear outro
            </Botao>
            <Botao variante="fantasma" onClick={cadastrarManual}>
              Cadastrar manualmente
            </Botao>
          </div>
        </div>
      )}
    </>
  );
}
