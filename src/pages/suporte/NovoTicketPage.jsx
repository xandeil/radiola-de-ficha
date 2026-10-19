import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useCarregar } from '@/hooks/useCarregar';
import { useDebounce } from '@/hooks/useDebounce';
import { useToast } from '@/contexts/ToastContext';
import { suporteService, CATEGORIAS_TICKET } from '@/services/suporteService';
import TituloPagina from '@/components/ui/TituloPagina';
import Botao from '@/components/ui/Botao';
import { AreaTexto, Entrada, Selecao } from '@/components/ui/Campo';
import * as validar from '@/utils/validadores';
import styles from './Suporte.module.css';

/*
 * Abertura de ticket. Enquanto a pessoa digita o assunto, sugerimos artigos
 * parecidos — muitas vezes a resposta já existe e ela resolve na hora.
 *
 * Anexos: no mock guardamos só nome e tamanho. No back real, o arquivo vai
 * por upload (multipart/form-data) com limite de tamanho e checagem de tipo
 * NO SERVIDOR — o "accept" do input é só uma dica para o navegador.
 */

const TAMANHO_MAX = 5 * 1024 * 1024; // 5 MB
const TIPOS = ['image/png', 'image/jpeg', 'image/webp', 'application/pdf', 'text/plain'];

export default function NovoTicketPage() {
  const [params] = useSearchParams();
  const navegar = useNavigate();
  const { mostrar } = useToast();
  const [form, setForm] = useState({ categoria: '', assunto: params.get('assunto') || '', descricao: '' });
  const [anexos, setAnexos] = useState([]);
  const [erros, setErros] = useState({});
  const [enviando, setEnviando] = useState(false);

  const assuntoAtrasado = useDebounce(form.assunto, 400);
  const sugestoes = useCarregar(() => (assuntoAtrasado.trim().length >= 4 ? suporteService.artigos(assuntoAtrasado) : Promise.resolve([])), [assuntoAtrasado]);

  const mudar = (campo) => (e) => setForm({ ...form, [campo]: e.target.value });

  const adicionarAnexos = (e) => {
    const arquivos = [...(e.target.files || [])];
    e.target.value = '';
    const recusados = arquivos.filter((a) => a.size > TAMANHO_MAX || !TIPOS.includes(a.type));
    if (recusados.length) mostrar(`Ignorados: ${recusados.map((a) => a.name).join(', ')} (até 5 MB; imagem, PDF ou texto)`, { tipo: 'erro' });
    const aceitos = arquivos.filter((a) => !recusados.includes(a)).map((a) => ({ nome: a.name, tamanho: a.size, tipo: a.type }));
    setAnexos((lista) => [...lista, ...aceitos].slice(0, 3));
  };

  const enviar = async (e) => {
    e.preventDefault();
    const novos = validar.limparErros({
      categoria: validar.obrigatorio(form.categoria, 'Categoria'),
      assunto: validar.obrigatorio(form.assunto, 'Assunto'),
      descricao: form.descricao.trim().length < 15 ? 'Descreva com pelo menos 15 caracteres' : null,
    });
    setErros(novos);
    if (Object.keys(novos).length) return;
    setEnviando(true);
    try {
      const ticket = await suporteService.abrirTicket({ ...form, anexos });
      mostrar(`Ticket #${ticket.id} aberto. Respondemos por aqui e por e-mail.`);
      navegar(`/suporte/tickets/${ticket.id}`, { replace: true });
    } catch (err) {
      mostrar(err.message, { tipo: 'erro' });
      setEnviando(false);
    }
  };

  return (
    <>
      <TituloPagina sobretitulo="Suporte" titulo="Abrir ticket" subtitulo="Conte o que aconteceu. Assinantes têm resposta em até 48h." />

      <form className={styles.formTicket} onSubmit={enviar} noValidate>
        <Selecao rotulo="Categoria" obrigatorio opcoes={CATEGORIAS_TICKET} value={form.categoria} onChange={mudar('categoria')} erro={erros.categoria} />
        <Entrada rotulo="Assunto" obrigatorio value={form.assunto} onChange={mudar('assunto')} erro={erros.assunto} maxLength={120} />

        {sugestoes.dados?.length > 0 && (
          <div className={styles.sugestoes} role="status">
            <strong>Talvez isto resolva:</strong>
            <ul>
              {sugestoes.dados.slice(0, 3).map((a) => (
                <li key={a.id}>
                  <Link to={`/suporte/artigos/${a.slug}`} target="_blank">{a.titulo}</Link>
                </li>
              ))}
            </ul>
          </div>
        )}

        <AreaTexto rotulo="Descrição" obrigatorio rows={6} placeholder="O que você fez, o que esperava e o que aconteceu." value={form.descricao} onChange={mudar('descricao')} erro={erros.descricao} maxLength={4000} />

        <div className={styles.anexosForm}>
          <label className={styles.botaoArquivo}>
            <input type="file" multiple accept={TIPOS.join(',')} onChange={adicionarAnexos} disabled={anexos.length >= 3} />
            <span>📎 Anexar (até 3)</span>
          </label>
          {anexos.map((a) => (
            <span key={a.nome} className={styles.chip}>
              {a.nome}
              <button type="button" onClick={() => setAnexos((l) => l.filter((x) => x.nome !== a.nome))} aria-label={`Remover ${a.nome}`}>×</button>
            </span>
          ))}
        </div>

        <div className={styles.acoes}>
          <Botao variante="secundario" para="/suporte">Cancelar</Botao>
          <Botao type="submit" carregando={enviando}>Enviar</Botao>
        </div>
      </form>
    </>
  );
}
