import { useState } from 'react';
import { useCarregar } from '@/hooks/useCarregar';
import { encarteService } from '@/services/encarteService';
import { catalogoService } from '@/services/catalogoService';
import { AreaTexto } from '@/components/ui/Campo';
import Botao from '@/components/ui/Botao';
import Icone from '@/components/ui/Icone';
import { Carregando } from '@/components/ui/Estados';
import styles from './EncartePainel.module.css';

/*
 * RF038–RF042 – O encarte digital, em abas:
 *   Artista | Álbum | Faixa | Minhas notas
 *
 * Cada aba de conteúdo é o MESMO componente (SecaoWiki) recebendo um
 * parâmetro diferente. Só a aba ativa é montada, então só ela busca dados:
 * abrir o encarte não dispara 3 requisições de uma vez.
 */

function SecaoWiki({ secao, artista, album, faixa }) {
  const [versao, setVersao] = useState(0);
  const { dados, carregando, erro } = useCarregar(
    () => encarteService.buscarSecao(secao, { artista, album, faixa }),
    [secao, artista, album, faixa, versao],
  );
  const [trocando, setTrocando] = useState(false);

  if (carregando) return <Carregando texto="Folheando o encarte..." />;
  if (erro) return <p className={styles.aviso}>Não deu para buscar o encarte agora ({erro.message}).</p>;
  if (!dados?.conteudo) return <p className={styles.aviso}>Nada encontrado na Wikipédia para esta seção.</p>;

  const { conteudo, alternativas, contexto } = dados;

  const escolher = (titulo) => {
    encarteService.escolherPagina(contexto, titulo);
    setTrocando(false);
    setVersao((v) => v + 1); // força buscar de novo com a página escolhida
  };

  return (
    <article className={styles.conteudo}>
      {conteudo.imagem && <img src={conteudo.imagem} alt="" className={styles.imagem} loading="lazy" />}
      <h3 className={styles.tituloConteudo}>{conteudo.titulo}</h3>
      {conteudo.desambiguacao && (
        <p className={styles.aviso}>Esta é uma página de desambiguação: escolha a página certa abaixo.</p>
      )}
      <p className={styles.texto}>{conteudo.texto}</p>

      <footer className={styles.rodape}>
        <a href={conteudo.url} target="_blank" rel="noreferrer" className={styles.fonte}>
          Fonte: Wikipédia <Icone nome="externo" tamanho={12} />
        </a>
        {alternativas.length > 0 && (
          <button type="button" className={styles.trocar} onClick={() => setTrocando((t) => !t)} aria-expanded={trocando}>
            Não é esse?
          </button>
        )}
      </footer>

      {trocando && (
        <ul className={styles.alternativas}>
          {alternativas.map((titulo) => (
            <li key={titulo}>
              <button type="button" onClick={() => escolher(titulo)}>
                {titulo}
              </button>
            </li>
          ))}
        </ul>
      )}
    </article>
  );
}

function MinhasNotas({ item, faixaId }) {
  const textoSalvo = faixaId ? item.anotacoes?.faixas?.[faixaId] : item.anotacoes?.item;
  const [texto, setTexto] = useState(textoSalvo || '');
  const [estado, setEstado] = useState('ocioso'); // 'ocioso' | 'salvando' | 'salvo'

  const salvar = async () => {
    setEstado('salvando');
    const anotacoes = await catalogoService.salvarAnotacao(item.id, faixaId, texto);
    item.anotacoes = anotacoes; // mantém o objeto da tela em dia sem recarregar
    setEstado('salvo');
  };

  return (
    <div className={styles.notas}>
      <AreaTexto
        rotulo={faixaId ? 'Sobre esta faixa' : 'Sobre este disco'}
        placeholder="Onde você estava quando ouviu pela primeira vez? Quem te apresentou?"
        rows={5}
        value={texto}
        onChange={(e) => {
          setTexto(e.target.value);
          setEstado('ocioso');
        }}
      />
      <div className={styles.acoesNotas}>
        {estado === 'salvo' && <span className={styles.salvo}>Salvo ✓</span>}
        <Botao tamanho="pequeno" carregando={estado === 'salvando'} onClick={salvar} disabled={texto === (textoSalvo || '')}>
          Salvar anotação
        </Botao>
      </div>
    </div>
  );
}

export default function EncartePainel({ item, artista, album, faixa, faixaId, compacto = false }) {
  const abas = [
    artista && artista !== 'Vários Artistas' && { id: 'artista', rotulo: 'Artista' },
    album && { id: 'album', rotulo: 'Álbum' },
    faixa && { id: 'faixa', rotulo: 'Faixa' },
    item?.id && { id: 'notas', rotulo: 'Minhas notas' },
  ].filter(Boolean);

  const [aba, setAba] = useState(abas[0]?.id);
  const abaValida = abas.some((a) => a.id === aba) ? aba : abas[0]?.id;

  if (!abas.length) return null;

  return (
    <section className={`${styles.painel} ${compacto ? styles.compacto : ''}`} aria-label="Encarte digital">
      <div className={styles.cabecalho}>
        <h2>
          <Icone nome="livro" /> Encarte
        </h2>
        <div className={styles.abas} role="tablist">
          {abas.map((a) => (
            <button key={a.id} type="button" role="tab" aria-selected={abaValida === a.id} onClick={() => setAba(a.id)}>
              {a.rotulo}
            </button>
          ))}
        </div>
      </div>

      <div role="tabpanel">
        {abaValida === 'notas' ? (
          // key: ao trocar de faixa o React cria um MinhasNotas novo, com o texto daquela faixa
          <MinhasNotas key={faixaId || 'disco'} item={item} faixaId={faixaId} />
        ) : (
          <SecaoWiki secao={abaValida} artista={artista} album={album} faixa={faixa} />
        )}
      </div>
    </section>
  );
}
