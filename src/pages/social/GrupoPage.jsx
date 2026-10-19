import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useCarregar } from '@/hooks/useCarregar';
import { useToast } from '@/contexts/ToastContext';
import { socialService } from '@/services/socialService';
import Avatar from '@/components/social/Avatar';
import Botao from '@/components/ui/Botao';
import Icone from '@/components/ui/Icone';
import { AreaTexto, Entrada } from '@/components/ui/Campo';
import { Carregando, EstadoErro, EstadoVazio } from '@/components/ui/Estados';
import { tempoRelativo } from '@/utils/formatadores';
import styles from './Grupos.module.css';

/** RF073–RF076 – Página de um grupo: tópicos, membros, entrar/sair. */
export default function GrupoPage() {
  const { id } = useParams();
  const { mostrar } = useToast();
  const grupo = useCarregar(() => socialService.grupo(id), [id]);
  const [titulo, setTitulo] = useState('');
  const [conteudo, setConteudo] = useState('');
  const [ocupado, setOcupado] = useState(false);

  if (grupo.carregando && !grupo.dados) return <Carregando />;
  if (grupo.erro) return <EstadoErro erro={grupo.erro} />;
  const g = grupo.dados;

  const acao = async (fn, mensagem) => {
    setOcupado(true);
    try {
      await fn();
      if (mensagem) mostrar(mensagem);
      grupo.recarregar();
    } catch (e) {
      mostrar(e.message, { tipo: 'erro' });
    } finally {
      setOcupado(false);
    }
  };

  const publicar = (e) => {
    e.preventDefault();
    if (!titulo.trim() || !conteudo.trim()) return mostrar('Preencha título e mensagem', { tipo: 'erro' });
    acao(async () => {
      await socialService.postarNoGrupo(g.id, { titulo, conteudo });
      setTitulo('');
      setConteudo('');
    }, 'Tópico publicado');
  };

  return (
    <>
      <Link to="/grupos" className={styles.voltar}>
        <Icone nome="voltar" tamanho={16} /> Grupos
      </Link>

      <header className={styles.capaGrupo} style={{ '--cor-grupo': g.cor }}>
        <div>
          <span className={styles.categoria}>{{ genero: 'Gênero', formato: 'Formato', outro: 'Comunidade' }[g.categoria]}</span>
          <h1>{g.nome}</h1>
          <p>{g.descricao}</p>
          <span className={styles.membros}>{g.membros.length} membros</span>
        </div>
        {g.sou_membro ? (
          <Botao variante="secundario" carregando={ocupado} onClick={() => acao(() => socialService.sairDoGrupo(g.id), `Você saiu de ${g.nome}`)}>
            Sair do grupo
          </Botao>
        ) : (
          <Botao carregando={ocupado} onClick={() => acao(() => socialService.entrarNoGrupo(g.id), `Bem-vindo ao ${g.nome}!`)}>
            Participar
          </Botao>
        )}
      </header>

      <div className={styles.colunasGrupo}>
        <div>
          {g.sou_membro && (
            <form className={styles.novoTopico} onSubmit={publicar} noValidate>
              <Entrada aria-label="Título do tópico" placeholder="Título do tópico" value={titulo} onChange={(e) => setTitulo(e.target.value)} maxLength={120} />
              <AreaTexto aria-label="Mensagem" placeholder="Escreva para o grupo..." value={conteudo} onChange={(e) => setConteudo(e.target.value)} maxLength={3000} />
              <div className={styles.acoesModal}>
                <Botao type="submit" carregando={ocupado}>Publicar tópico</Botao>
              </div>
            </form>
          )}

          {g.posts.length === 0 ? (
            <EstadoVazio titulo="Nenhum tópico ainda" mensagem={g.sou_membro ? 'Abra a primeira conversa.' : 'Participe para abrir a primeira conversa.'} />
          ) : (
            <div className={styles.topicos}>
              {g.posts.map((p) => (
                <article key={p.id} className={styles.topico}>
                  <header>
                    <Avatar usuario={p.autor} tamanho={32} />
                    <div>
                      <Link to={`/perfil/${p.autor?.apelido}`}>{p.autor?.nome}</Link>
                      <small> · {tempoRelativo(p.data_publicacao)}</small>
                    </div>
                  </header>
                  <h2>{p.titulo}</h2>
                  <p>{p.conteudo}</p>
                </article>
              ))}
            </div>
          )}
        </div>

        <aside className={styles.cartaoMembros}>
          <h2>Membros</h2>
          <ul>
            {g.membros.map((m) => (
              <li key={m.id}>
                <Avatar usuario={m} tamanho={30} />
                <Link to={`/perfil/${m.apelido}`}>{m.nome}</Link>
                {m.funcao !== 'membro' && <span className={styles.funcao}>{m.funcao}</span>}
              </li>
            ))}
          </ul>
        </aside>
      </div>
    </>
  );
}
