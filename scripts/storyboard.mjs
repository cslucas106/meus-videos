// Storyboard: uma foto de cada cena (e da tela de fontes), para conferir antes de gastar o render do vídeo inteiro.
// Lê out/props.json (gravado pelo narrar.py, com a duração de cada cena) e grava em <pasta>:
//   cena-01.jpg, cena-02.jpg, …, fontes.jpg   fotos em meia resolução, sem legenda
//   notas.md                                 texto do Release, com os tempos de cada cena num comentário <!-- storyboard:{…} -->
//                                             (o PocketCode AI lê esse comentário para tocar a narração a partir de cada cena)
// Uso: node scripts/storyboard.mjs out/props.json out/storyboard
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';

const ESCALA = 0.5; // meia resolução: fica rápido e leve, e dá para ver bem no celular

/** Quadros das fotos: cada cena a ~3/4 (as animações já terminaram e o número já chegou no valor), e a tela de fontes. */
export function quadros(props) {
  const fps = props.fps || 30;
  let ini = 0;
  const l = (props.cenas || []).map((c, i) => {
    const dur = c.frames || 4 * fps;
    const q = { n: i + 1, tipo: c.tipo, arquivo: `cena-${String(i + 1).padStart(2, '0')}.jpg`, quadro: ini + Math.min(dur - 1, Math.floor(dur * 0.78)), inicio: +(ini / fps).toFixed(2), fim: +((ini + dur) / fps).toFixed(2) };
    // animação da IA que falhou no teste (virou texto): o app mostra o motivo
    if (c.animacaoErro) q.aviso = String(c.animacaoErro).replace(/--+>|[<>]/g, '').slice(0, 300);
    ini += dur;
    return q;
  });
  const fontes = props.fontesFrames || 5 * fps;
  l.push({ n: l.length + 1, tipo: 'fontes', arquivo: 'fontes.jpg', quadro: ini + Math.min(fontes - 1, Math.round(2.5 * fps)), inicio: +(ini / fps).toFixed(2), fim: +((ini + fontes) / fps).toFixed(2) });
  return l;
}

/** Texto do Release do storyboard (a pessoa vê no GitHub; o app lê os tempos do comentário) */
export const notas = (props, l) =>
  `Storyboard de **${String(props.titulo || '').replace(/[<>]/g, '')}**: uma foto de cada cena e a narração (\`narracao.mp3\`). ` +
  'Confira e, se estiver bom, aprove no PocketCode AI para gerar o vídeo.\n\n' +
  `<!-- storyboard:${JSON.stringify(l.map(({ n, tipo, arquivo, inicio, fim, aviso }) => ({ n, tipo, arquivo, inicio, fim, ...(aviso ? { aviso } : {}) })))} -->\n`;

async function principal(entrada, pasta) {
  const { bundle } = await import('@remotion/bundler');
  const { openBrowser, renderStill, selectComposition } = await import('@remotion/renderer');
  const props = { ...JSON.parse(readFileSync(entrada, 'utf8')), legenda: false };
  mkdirSync(pasta, { recursive: true });
  const l = quadros(props);
  console.log('Montando as cenas…');
  const serveUrl = await bundle({ entryPoint: join(process.cwd(), 'src/index.jsx') });
  const browser = await openBrowser('chrome');
  try {
    const composition = await selectComposition({ serveUrl, id: 'Video', inputProps: props, puppeteerInstance: browser });
    for (const q of l) {
      await renderStill({
        composition,
        serveUrl,
        inputProps: props,
        frame: q.quadro,
        output: join(pasta, q.arquivo),
        imageFormat: 'jpeg',
        jpegQuality: 80,
        scale: ESCALA,
        puppeteerInstance: browser
      });
      console.log(`Foto ${q.n} de ${l.length}: ${q.tipo} (${q.inicio}s)`);
    }
  } finally {
    await browser.close({ silent: true });
  }
  writeFileSync(join(pasta, 'notas.md'), notas(props, l));
}

if (import.meta.url === pathToFileURL(process.argv[1] || '').href)
  await principal(process.argv[2] || 'out/props.json', process.argv[3] || 'out/storyboard');
