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
import { useT } from '@/contexts/I18nContext';
import { idiomaAtual } from '@/i18n';

/*
 * RF094/RF095 + seção 7.2 – Backup do usuário.
 *
 * Importar tem DOIS passos de propósito: primeiro lemos e validamos o arquivo
 * e mostramos uma PRÉVIA ("23 itens, 2 com problema"); só depois de o usuário
 * confirmar é que gravamos. Ação que pode apagar dados precisa de prévia.
 */

const TOM_RESTAURACAO = { pendente: 'aviso', em_andamento: 'info', concluida: 'sucesso', falha: 'erro' };

export default function SecaoBackup() {
  const { mostrar } = useToast();
  const t = useT();
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
    mostrar(t('suporte.backup.baixado', { n: dados.itens.length }));
  };

  const lerArquivo = async (e) => {
    const arquivo = e.target.files?.[0];
    e.target.value = '';
    if (!arquivo) return;
    if (arquivo.size > 10 * 1024 * 1024) return mostrar(t('suporte.backup.grande'), { tipo: 'erro' });
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
      t('suporte.backup.importados', { n: r.importados }) +
        (r.pulados ? t('suporte.backup.jaExistiam', { n: r.pulados }) : '') +
        (r.barradosPeloLimite ? t('suporte.backup.limite', { n: r.barradosPeloLimite }) : ''),
    );
  };

  const solicitar = async () => {
    try {
      await backupService.solicitarRestauracao(Number(idBackup), t('suporte.backup.pedidoObs'));
      mostrar(t('suporte.backup.pedido'));
      setIdBackup('');
      disponiveis.recarregar();
    } catch (err) {
      mostrar(err.message, { tipo: 'erro' });
    }
  };

  const d = disponiveis.dados;

  return (
    <section className={styles.secao}>
      <h2>{t('suporte.backup.titulo')}</h2>
      <p className={styles.descricao}>{t('suporte.backup.desc')}</p>

      <div className={styles.linhaBotoes}>
        <Botao variante="secundario" carregando={exportando} onClick={exportar}>{t('suporte.backup.baixar')}</Botao>
        <Botao variante="secundario" onClick={() => inputArquivo.current.click()}>{t('suporte.backup.restaurarArquivo')}</Botao>
        <input ref={inputArquivo} type="file" accept="application/json,.json" hidden onChange={lerArquivo} />
      </div>

      <h3 className={styles.subtitulo}>{t('suporte.backup.automaticos')}</h3>
      {!d ? null : d.retencao_dias === 0 ? (
        <p className={styles.descricao}>
          {t('suporte.backup.gratuito')} <Link to="/planos">{t('suporte.backup.verPlanos')}</Link>
        </p>
      ) : (
        <>
          <p className={styles.descricao}>{t('suporte.backup.diario', { n: d.retencao_dias })}</p>
          <div className={styles.linhaBotoes}>
            <Selecao
              aria-label={t('suporte.backup.data')}
              vazio={t('suporte.backup.escolhaData')}
              opcoes={d.backups.map((b) => ({ valor: String(b.id), rotulo: new Date(b.data_inicio).toLocaleString(idiomaAtual(), { dateStyle: 'short', timeStyle: 'short' }) }))}
              value={idBackup}
              onChange={(e) => setIdBackup(e.target.value)}
            />
            <Botao variante="secundario" disabled={!idBackup} onClick={solicitar}>{t('suporte.backup.pedirRestauracao')}</Botao>
          </div>
        </>
      )}

      {d?.solicitacoes.length > 0 && (
        <ul className={styles.solicitacoes}>
          {d.solicitacoes.map((s) => (
            <li key={s.id}>
              <span>{t('suporte.backup.pedidaEm', { data: formatarData(s.data_solicitacao) })}</span>
              <Etiqueta tom={TOM_RESTAURACAO[s.status]}>{t(`suporte.backup.status.${s.status}`)}</Etiqueta>
              {s.resultado && <small>{s.resultado}</small>}
            </li>
          ))}
        </ul>
      )}

      <Modal
        aberto={Boolean(previa)}
        titulo={t('suporte.backup.restaurar')}
        aoFechar={() => setPrevia(null)}
        acoes={
          <>
            <Botao variante="secundario" onClick={() => setPrevia(null)}>{t('suporte.backup.cancelar')}</Botao>
            <Botao variante={modo === 'substituir' ? 'perigo' : 'primario'} carregando={importando} disabled={!previa?.itens.length} onClick={confirmarImportacao}>
              {modo === 'substituir' ? t('suporte.backup.apagarRestaurar') : t('suporte.backup.importar')}
            </Botao>
          </>
        }
      >
        {previa && (
          <div className={styles.previa}>
            <p>
              {t('suporte.backup.de', { nome: previa.usuario?.nome || t('suporte.backup.colecionador'), data: formatarData(previa.exportado_em) })}{' '}
              <strong>{t('suporte.backup.validos', { n: previa.itens.length })}</strong>.
            </p>
            {previa.ignorados > 0 && (
              <Alerta tipo="aviso" titulo={t('suporte.backup.ignorado', { count: previa.ignorados })}>
                {previa.erros.slice(0, 3).join(' · ')}
                {previa.erros.length > 3 && ' …'}
              </Alerta>
            )}
            <Selecao
              rotulo={t('suporte.backup.como')}
              vazio={null}
              opcoes={[
                { valor: 'mesclar', rotulo: t('suporte.backup.mesclar') },
                { valor: 'substituir', rotulo: t('suporte.backup.substituir') },
              ]}
              value={modo}
              onChange={(e) => setModo(e.target.value)}
            />
            {modo === 'substituir' && <Alerta tipo="erro">{t('suporte.backup.aviso')}</Alerta>}
          </div>
        )}
      </Modal>
    </section>
  );
}
