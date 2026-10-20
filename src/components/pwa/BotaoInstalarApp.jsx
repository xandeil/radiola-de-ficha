import { useState } from 'react';
import { useT } from '@/contexts/I18nContext';
import { useToast } from '@/contexts/ToastContext';
import { ehIos, instalarApp, usePwa } from '@/pwa/pwa';
import Botao from '@/components/ui/Botao';
import Modal from '@/components/ui/Modal';
import Icone from '@/components/ui/Icone';

/*
 * Botão "Instalar o app" (Fase 6). Três situações:
 *  - Já instalado (abrindo pelo ícone): só informa.
 *  - Chrome/Edge/Android: o navegador nos deu o convite → botão abre o diálogo nativo.
 *  - iPhone: o Safari não tem convite; mostramos o passo a passo.
 *  - Nenhum dos casos (ex.: Firefox no computador): não mostra nada.
 */
export default function BotaoInstalarApp() {
  const t = useT();
  const { mostrar } = useToast();
  const { podeInstalar, instalado } = usePwa();
  const [ajudaIos, setAjudaIos] = useState(false);

  if (instalado) {
    return (
      <span style={{ color: 'var(--c-text-muted)', fontSize: 14 }}>
        ✓ {t('pwa.instalado')}
      </span>
    );
  }

  if (podeInstalar) {
    return (
      <Botao icone={<Icone nome="download" />} onClick={async () => (await instalarApp()) && mostrar(t('pwa.instalouToast'))}>
        {t('pwa.instalar')}
      </Botao>
    );
  }

  if (!ehIos()) return null;

  return (
    <>
      <Botao icone={<Icone nome="download" />} onClick={() => setAjudaIos(true)}>
        {t('pwa.instalar')}
      </Botao>
      <Modal aberto={ajudaIos} titulo={t('pwa.iosTitulo')} aoFechar={() => setAjudaIos(false)} acoes={<Botao onClick={() => setAjudaIos(false)}>{t('pwa.iosEntendi')}</Botao>}>
        <ol>
          <li>{t('pwa.iosPasso1')}</li>
          <li>{t('pwa.iosPasso2')}</li>
          <li>{t('pwa.iosPasso3')}</li>
        </ol>
      </Modal>
    </>
  );
}
