import { useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useCarregar } from '@/hooks/useCarregar';
import { useToast } from '@/contexts/ToastContext';
import { backupService, baixarJson } from '@/services/backupService';
import Botao from '@/components/ui/Botao';
import Alerta from '@/components/ui/Alerta';
import Modal from '@/components/ui/Modal';
import { Selecao } from '@/components/ui/Campo';
import { Etiqueta } from '@/components/ui/Tabela';
import { formatarData } from '@/utils/formatadores';
import styles from './ConfiguracoesPage.module.css';

/*
 * RF094/RF095 + seção 7.2 – Backup do usuário.
 *
 * Importar tem DOIS passos de propósito: primeiro lemos e validamos o arquivo
 * e mostramos uma PRÉVIA ("23 itens, 2 com problema"); só depois de o usuário
 * confirmar é que gravamos. Ação que pode apagar dados precisa de prévia.
 */

const STATUS_RESTAURACAO = { pendente: ['aviso', 'Aguardando a equipe'], em_andamento: ['info', 'Em andamento'], concluida: ['sucesso', 'Concluída'], falha: ['erro', 'Falhou'] };

export default function SecaoBackup() {
  const { mostrar } = useToast();
  const inputArquivo = useRef(null);
  const disponiveis = useCarregar(() => backupService.disponiveis(), []);
  const [exportando, setExportando] = useState(false);
  const [previa, setPrevia] = useState(null);
  const [modo, setModo] = useState('mesclar');
  const [importando, setImportando] = useState(false);
  const [idBackup, setIdBackup] = useState('');

  const exportar = async () => {
    setExportando(true);
    const dados = await backupService.exportar();
    baixarJson(dados, `radiola-backup-${new Date().toISOString().slice(0, 10)}.json`);
    setExportando(false);
    mostrar(`Backup com ${dados.itens.length} itens baixado`);
  };

  const lerArquivo = async (e) => {
    const arquivo = e.target.files?.[0];
    e.target.value = '';
    if (!arquivo) return;
    if (arquivo.size > 10 * 1024 * 1024) return mostrar('Arquivo maior que 10 MB', { tipo: 'erro' });
    try {
      setPrevia(backupService.analisarArquivo(await arquivo.text()));
      setModo('mesclar');
    } catch (err) {
      mostrar(err.message, { tipo: 'erro' });
    }
  };

  const confirmarImportacao = async () => {
    setImportando(true);
    const r = await backupService.importar(previa.itens, modo);
    setImportando(false);
    setPrevia(null);
    mostrar(
      `${r.importados} itens importados` +
        (r.pulados ? `, ${r.pulados} já existiam` : '') +
        (r.barradosPeloLimite ? `, ${r.barradosPeloLimite} não couberam no limite do plano` : ''),
    );
  };

  const solicitar = async () => {
    try {
      await backupService.solicitarRestauracao(Number(idBackup), 'Pedido pelo usuário nas configurações');
      mostrar('Pedido enviado. A equipe avisa quando concluir.');
      setIdBackup('');
      disponiveis.recarregar();
    } catch (err) {
      mostrar(err.message, { tipo: 'erro' });
    }
  };

  const d = disponiveis.dados;

  return (
    <section className={styles.secao}>
      <h2>Backup da coleção</h2>
      <p className={styles.descricao}>Seu catálogo é seu: baixe uma cópia completa quando quiser e restaure em qualquer conta.</p>

      <div className={styles.linhaBotoes}>
        <Botao variante="secundario" carregando={exportando} onClick={exportar}>Baixar backup (JSON)</Botao>
        <Botao variante="secundario" onClick={() => inputArquivo.current.click()}>Restaurar de um arquivo</Botao>
        <input ref={inputArquivo} type="file" accept="application/json,.json" hidden onChange={lerArquivo} />
      </div>

      <h3 className={styles.subtitulo}>Backups automáticos</h3>
      {!d ? null : d.retencao_dias === 0 ? (
        <p className={styles.descricao}>
          No plano gratuito o backup é manual (botão acima). Assinantes têm backup diário automático com 7 ou 30 dias de histórico. <Link to="/planos">Ver planos</Link>
        </p>
      ) : (
        <>
          <p className={styles.descricao}>Backup diário do sistema, com {d.retencao_dias} dias de histórico no seu plano. Peça a restauração da sua coleção para uma data:</p>
          <div className={styles.linhaBotoes}>
            <Selecao
              aria-label="Data do backup"
              vazio="Escolha a data..."
              opcoes={d.backups.map((b) => ({ valor: String(b.id), rotulo: new Date(b.data_inicio).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' }) }))}
              value={idBackup}
              onChange={(e) => setIdBackup(e.target.value)}
            />
            <Botao variante="secundario" disabled={!idBackup} onClick={solicitar}>Pedir restauração</Botao>
          </div>
        </>
      )}

      {d?.solicitacoes.length > 0 && (
        <ul className={styles.solicitacoes}>
          {d.solicitacoes.map((s) => (
            <li key={s.id}>
              <span>Restauração pedida em {formatarData(s.data_solicitacao)}</span>
              <Etiqueta tom={STATUS_RESTAURACAO[s.status][0]}>{STATUS_RESTAURACAO[s.status][1]}</Etiqueta>
              {s.resultado && <small>{s.resultado}</small>}
            </li>
          ))}
        </ul>
      )}

      <Modal
        aberto={Boolean(previa)}
        titulo="Restaurar backup"
        aoFechar={() => setPrevia(null)}
        acoes={
          <>
            <Botao variante="secundario" onClick={() => setPrevia(null)}>Cancelar</Botao>
            <Botao variante={modo === 'substituir' ? 'perigo' : 'primario'} carregando={importando} disabled={!previa?.itens.length} onClick={confirmarImportacao}>
              {modo === 'substituir' ? 'Apagar e restaurar' : 'Importar'}
            </Botao>
          </>
        }
      >
        {previa && (
          <div className={styles.previa}>
            <p>
              Backup de <strong>{previa.usuario?.nome || 'colecionador'}</strong> feito em {formatarData(previa.exportado_em)}: <strong>{previa.itens.length} itens válidos</strong>.
            </p>
            {previa.ignorados > 0 && (
              <Alerta tipo="aviso" titulo={previa.ignorados === 1 ? '1 item será ignorado' : `${previa.ignorados} itens serão ignorados`}>
                {previa.erros.slice(0, 3).join(' · ')}
                {previa.erros.length > 3 && ' …'}
              </Alerta>
            )}
            <Selecao
              rotulo="Como restaurar"
              vazio={null}
              opcoes={[
                { valor: 'mesclar', rotulo: 'Juntar com a minha coleção (pula repetidos)' },
                { valor: 'substituir', rotulo: 'Apagar minha coleção atual e usar só o backup' },
              ]}
              value={modo}
              onChange={(e) => setModo(e.target.value)}
            />
            {modo === 'substituir' && <Alerta tipo="erro">Isto apaga todos os itens atuais da sua coleção. Não dá para desfazer.</Alerta>}
          </div>
        )}
      </Modal>
    </section>
  );
}
