import { useState } from 'react';
import { useCarregar } from '@/hooks/useCarregar';
import { encarteService } from '@/services/encarteService';
import { catalogoService } from '@/services/catalogoService';
import { AreaTexto } from '@/components/ui/Campo';
import Botao from '@/components/ui/Botao';
import Icone from '@/components/ui/Icone';
import { Carregando } from '@/components/ui/Estados';
import styles from './EncartePainel.module.css';
import { useT } from '@/contexts/I18nContext';

/*
 * RF038–RF042 – O encarte digital, em abas:
 *   Artista | Álbum | Faixa | Minhas notas
 *
 * Cada aba de conteúdo é o MESMO componente (SecaoWiki) recebendo um
 * parâmetro diferente. Só a aba ativa é montada, então só ela busca dados:
 * abrir o encarte não dispara 3 requisições de uma vez.
 */

function SecaoWiki({ secao, artista, album, faixa }) {
  const t = useT();
  const [versao, setVersao] = useState(0);
  const { dados, carregando, erro } = useCarregar(
    () => encarteService.buscarSecao(secao, { artista, album, faixa }),
    [secao, artista, album, faixa, versao],
  );
  const [trocando, setTrocando] = useState(false);

  if (carregando) return <Carregando texto={t('encarte.folheando')} />;
  if (erro) return <p className={styles.aviso}>{t('encarte.erro', { erro: erro.message })}</p>;
  if (!dados?.conteudo) return <p className={styles.aviso}>{t('encarte.nada')}</p>;

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
        <p className={styles.aviso}>{t('encarte.desambiguacao')}</p>
      )}
      <p className={styles.texto}>{conteudo.texto}</p>

      <footer className={styles.rodape}>
        <a href={conteudo.url} target="_blank" rel="noreferrer" className={styles.fonte}>
          {t('encarte.fonte')} <Icone nome="externo" tamanho={12} />
        </a>
        {alternativas.length > 0 && (
          <button type="button" className={styles.trocar} onClick={() => setTrocando((v) => !v)} aria-expanded={trocando}>
            {t('encarte.naoEEsse')}
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
  const t = useT();
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
        rotulo={faixaId ? t('encarte.sobreFaixa') : t('encarte.sobreDisco')}
        placeholder={t('encarte.notasPh')}
        rows={5}
        value={texto}
        onChange={(e) => {
          setTexto(e.target.value);
          setEstado('ocioso');
        }}
      />
      <div className={styles.acoesNotas}>
        {estado === 'salvo' && <span className={styles.salvo}>{t('encarte.salvo')}</span>}
        <Botao tamanho="pequeno" carregando={estado === 'salvando'} onClick={salvar} disabled={texto === (textoSalvo || '')}>
          {t('encarte.salvarAnotacao')}
        </Botao>
      </div>
    </div>
  );
}

export default function EncartePainel({ item, artista, album, faixa, faixaId, compacto = false }) {
  const t = useT();
  const abas = [
    artista && artista !== 'Vários Artistas' && { id: 'artista', rotulo: t('encarte.aba.artista') },
    album && { id: 'album', rotulo: t('encarte.aba.album') },
    faixa && { id: 'faixa', rotulo: t('encarte.aba.faixa') },
    item?.id && { id: 'notas', rotulo: t('encarte.aba.notas') },
  ].filter(Boolean);

  const [aba, setAba] = useState(abas[0]?.id);
  const abaValida = abas.some((a) => a.id === aba) ? aba : abas[0]?.id;

  if (!abas.length) return null;

  return (
    <section className={`${styles.painel} ${compacto ? styles.compacto : ''}`} aria-label={t('encarte.digital')}>
      <div className={styles.cabecalho}>
        <h2>
          <Icone nome="livro" /> {t('encarte.titulo')}
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
