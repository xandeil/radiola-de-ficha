import { useState } from 'react';
import { usePlayer } from '@/contexts/PlayerContext';
import { AreaTexto, Selecao } from '@/components/ui/Campo';
import Botao from '@/components/ui/Botao';
import Alerta from '@/components/ui/Alerta';
import styles from './NovoPost.module.css';
import { useT } from '@/contexts/I18nContext';

/*
 * Caixa de publicação do feed. Um formulário, quatro "modos":
 *  - Texto livre
 *  - Ouvindo agora (RF062): puxa a faixa que está tocando no player
 *  - Resenha (RF063): item da coleção + nota de 1 a 5 + texto
 *  - Recomendar (RF064): item da coleção + amigo que vai receber
 * A validação muda conforme o modo (cada um tem seus obrigatórios).
 */

const MODOS = ['texto', 'ouvindo', 'resenha', 'recomendacao'];
const VISIBILIDADES = ['amigos', 'publico', 'privado'];

const referenciaDoItem = (item) => ({ titulo: item.titulo, artista: item.artista, formato: item.tipo_midia, cor_capa: item.cor_capa });

export default function NovoPost({ itens = [], amigos = [], aoPublicar }) {
  const t = useT();
  const { atual } = usePlayer();
  const [modo, setModo] = useState('texto');
  const [texto, setTexto] = useState('');
  const [idItem, setIdItem] = useState('');
  const [idAmigo, setIdAmigo] = useState('');
  const [nota, setNota] = useState(0);
  const [visibilidade, setVisibilidade] = useState('amigos');
  const [erro, setErro] = useState('');
  const [enviando, setEnviando] = useState(false);

  const item = itens.find((i) => i.id === Number(idItem));

  const montar = () => {
    if (modo === 'texto') {
      if (!texto.trim()) return t('social.post.erro.escreva');
      return { tipo_post: 'texto', conteudo_texto: texto.trim() };
    }
    if (modo === 'ouvindo') {
      if (atual) {
        return {
          tipo_post: 'ouvindo',
          id_item: atual.item.id,
          referencia: { titulo: atual.titulo, artista: atual.item.artista, formato: atual.fonte === 'spotify' ? 'Spotify' : atual.item.tipo_midia, cor_capa: atual.item.cor_capa, link: atual.link },
          conteudo_texto: texto.trim(),
        };
      }
      if (!item) return t('social.post.erro.ouvindo');
      return { tipo_post: 'ouvindo', id_item: item.id, referencia: referenciaDoItem(item), conteudo_texto: texto.trim() };
    }
    if (!item) return t('social.post.erro.item');
    if (modo === 'resenha') {
      if (!nota) return t('social.post.erro.nota');
      if (texto.trim().length < 20) return t('social.post.erro.resenha');
      return { tipo_post: 'resenha', id_item: item.id, referencia: referenciaDoItem(item), nota, conteudo_texto: texto.trim() };
    }
    if (!idAmigo) return t('social.post.erro.destino');
    return { tipo_post: 'recomendacao', id_item: item.id, id_destinatario: Number(idAmigo), referencia: referenciaDoItem(item), conteudo_texto: texto.trim() };
  };

  const enviar = async (e) => {
    e.preventDefault();
    const resultado = montar();
    if (typeof resultado === 'string') return setErro(resultado);

    setErro('');
    setEnviando(true);
    try {
      await aoPublicar({ ...resultado, visibilidade });
      setTexto('');
      setIdItem('');
      setIdAmigo('');
      setNota(0);
    } catch (err) {
      setErro(err.message);
    } finally {
      setEnviando(false);
    }
  };

  const precisaItem = modo === 'resenha' || modo === 'recomendacao' || (modo === 'ouvindo' && !atual);
  const placeholder = t(`social.post.ph.${modo}`);

  return (
    <form className={styles.caixa} onSubmit={enviar} noValidate>
      <div className={styles.modos} role="tablist" aria-label={t('social.post.tipo')}>
        {MODOS.map((m) => (
          <button key={m} type="button" role="tab" aria-selected={modo === m} onClick={() => { setModo(m); setErro(''); }}>
            {t(`social.post.modo.${m}`)}
          </button>
        ))}
      </div>

      {modo === 'ouvindo' && atual && (
        <p className={styles.tocando}>
          🎧 <strong>{atual.titulo}</strong> — {atual.item.artista}
        </p>
      )}

      {(precisaItem || modo === 'recomendacao') && (
        <div className={styles.linha}>
          {precisaItem && (
            <Selecao
              rotulo={t('social.post.item')}
              vazio={t('comum.selecione')}
              opcoes={itens.map((i) => ({ valor: String(i.id), rotulo: `${i.titulo} — ${i.artista} (${i.tipo_midia})` }))}
              value={idItem}
              onChange={(e) => setIdItem(e.target.value)}
            />
          )}
          {modo === 'recomendacao' && (
            <Selecao
              rotulo={t('social.post.paraQuem')}
              vazio={amigos.length ? t('social.post.escolhaAmigo') : t('social.post.addAmigos')}
              opcoes={amigos.map((a) => ({ valor: String(a.usuario.id), rotulo: a.usuario.nome }))}
              value={idAmigo}
              onChange={(e) => setIdAmigo(e.target.value)}
            />
          )}
        </div>
      )}

      {modo === 'resenha' && (
        <div className={styles.nota} role="radiogroup" aria-label={t('social.post.nota')}>
          {[1, 2, 3, 4, 5].map((n) => (
            <button key={n} type="button" role="radio" aria-checked={nota === n} aria-label={t('social.post.estrelas', { n })} className={n <= nota ? styles.estrelaCheia : ''} onClick={() => setNota(n)}>
              ★
            </button>
          ))}
        </div>
      )}

      <AreaTexto aria-label={t('social.post.texto')} placeholder={placeholder} value={texto} onChange={(e) => setTexto(e.target.value)} maxLength={2000} rows={modo === 'resenha' ? 4 : 2} />

      {erro && <Alerta tipo="erro">{erro}</Alerta>}

      <div className={styles.rodape}>
        <Selecao aria-label={t('social.post.quemVe')} opcoes={VISIBILIDADES.map((v) => ({ valor: v, rotulo: t(`social.post.vis.${v}`) }))} vazio={null} value={visibilidade} onChange={(e) => setVisibilidade(e.target.value)} className={styles.visibilidade} />
        <Botao type="submit" carregando={enviando}>
          {t('social.post.publicar')}
        </Botao>
      </div>
    </form>
  );
}
