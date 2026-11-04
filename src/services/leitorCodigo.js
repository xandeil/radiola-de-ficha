import { t as traduzir } from '@/i18n';
/*
 * Leitura de código de barras pela câmera ou por foto.
 *
 * Estratégia "melhor disponível":
 *  1. BarcodeDetector — API NATIVA do navegador (Chrome/Edge no Android e
 *     desktop). Rápida e sem baixar nada.
 *  2. ZXing — biblioteca em JavaScript que funciona em qualquer navegador
 *     (Safari, Firefox). Só é BAIXADA quando necessária, com import()
 *     dinâmico: quem tem o detector nativo nem carrega esses ~400 KB.
 *     Isso se chama code splitting / lazy loading (RNF009).
 */

const FORMATOS_NATIVOS = ['ean_13', 'ean_8', 'upc_a', 'upc_e'];

let detectorNativo; // undefined = ainda não testado; null = indisponível

async function obterDetectorNativo() {
  if (detectorNativo !== undefined) return detectorNativo;
  detectorNativo = null;
  if ('BarcodeDetector' in window) {
    try {
      const suportados = await window.BarcodeDetector.getSupportedFormats();
      const formatos = FORMATOS_NATIVOS.filter((f) => suportados.includes(f));
      if (formatos.length) detectorNativo = new window.BarcodeDetector({ formats: formatos });
    } catch {
      /* fica null e usamos o ZXing */
    }
  }
  return detectorNativo;
}

async function criarLeitorZxing() {
  const [{ BrowserMultiFormatReader }, { BarcodeFormat, DecodeHintType }] = await Promise.all([
    import('@zxing/browser'),
    import('@zxing/library'),
  ]);
  // Restringir os formatos deixa a leitura mais rápida e evita falsos positivos (QR codes, etc.)
  const dicas = new Map([
    [DecodeHintType.POSSIBLE_FORMATS, [BarcodeFormat.EAN_13, BarcodeFormat.EAN_8, BarcodeFormat.UPC_A, BarcodeFormat.UPC_E]],
    [DecodeHintType.TRY_HARDER, true],
  ]);
  return new BrowserMultiFormatReader(dicas, { delayBetweenScanAttempts: 150 });
}

/** Traduz os erros da câmera para algo que o usuário entende. */
export function mensagemErroCamera(erro) {
  if (!window.isSecureContext) return traduzir('scanner.erro.https');
  switch (erro?.name) {
    case 'NotAllowedError':
      return traduzir('scanner.erro.negado');
    case 'NotFoundError':
    case 'OverconstrainedError':
      return traduzir('scanner.erro.semCamera');
    case 'NotReadableError':
      return traduzir('scanner.erro.ocupada');
    default:
      return erro?.message || traduzir('scanner.erro.abrir');
  }
}

/**
 * Liga a câmera no <video> e chama aoLer(texto) a cada código encontrado.
 * Devolve uma função parar() — SEMPRE chame ao sair da tela, senão a
 * luzinha da câmera fica acesa.
 */
export async function iniciarLeituraCamera(video, aoLer) {
  if (!navigator.mediaDevices?.getUserMedia) throw Object.assign(new Error(traduzir('scanner.erro.navegador')), { name: 'NotFoundError' });

  const stream = await navigator.mediaDevices.getUserMedia({
    video: { facingMode: { ideal: 'environment' }, width: { ideal: 1280 }, height: { ideal: 720 } },
    audio: false,
  });
  video.srcObject = stream;
  video.setAttribute('playsinline', ''); // iOS: sem isso o vídeo abre em tela cheia
  await video.play();

  let ativo = true;
  let pararZxing = null;
  const nativo = await obterDetectorNativo();

  if (nativo) {
    const varrer = async () => {
      if (!ativo) return;
      try {
        const achados = await nativo.detect(video);
        if (achados[0]) aoLer(achados[0].rawValue);
      } catch {
        /* quadro ruim: tenta o próximo */
      }
      setTimeout(varrer, 200);
    };
    varrer();
  } else {
    const leitor = await criarLeitorZxing();
    const controles = await leitor.decodeFromVideoElement(video, (resultado) => {
      if (resultado && ativo) aoLer(resultado.getText());
    });
    pararZxing = () => controles.stop();
  }

  const [trilha] = stream.getVideoTracks();
  const recursos = trilha.getCapabilities?.() || {};

  return {
    temLanterna: Boolean(recursos.torch),
    lanterna: (ligar) => trilha.applyConstraints({ advanced: [{ torch: ligar }] }).catch(() => {}),
    parar() {
      ativo = false;
      pararZxing?.();
      stream.getTracks().forEach((t) => t.stop());
      video.srcObject = null;
    },
  };
}

/** Lê o código de uma FOTO (galeria do celular ou arquivo no computador). */
export async function lerCodigoDeImagem(arquivo) {
  const nativo = await obterDetectorNativo();
  if (nativo) {
    const bitmap = await createImageBitmap(arquivo);
    const achados = await nativo.detect(bitmap);
    if (achados[0]) return achados[0].rawValue;
  }
  const leitor = await criarLeitorZxing();
  const url = URL.createObjectURL(arquivo);
  try {
    const resultado = await leitor.decodeFromImageUrl(url);
    return resultado.getText();
  } catch {
    throw new Error(traduzir('scanner.erro.foto'));
  } finally {
    URL.revokeObjectURL(url);
  }
}

/** Bipe curtinho + vibração quando lê (feedback de que deu certo). */
export function avisarLeitura() {
  navigator.vibrate?.(80);
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = ctx.createOscillator();
    const ganho = ctx.createGain();
    osc.frequency.value = 1400;
    ganho.gain.setValueAtTime(0.08, ctx.currentTime);
    ganho.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.12);
    osc.connect(ganho).connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.12);
    osc.onended = () => ctx.close();
  } catch {
    /* sem áudio: tudo bem */
  }
}
