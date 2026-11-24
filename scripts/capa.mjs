// Prepara a capa do vídeo (kit para postar): grava out/props-capa.json (sem legenda) e imprime o quadro da capa,
// já com o título inteiro na tela (3/4 da primeira cena). O workflow tira a foto desse quadro com "remotion still".
// Uso: node scripts/capa.mjs out/props.json out/props-capa.json
import { readFileSync, writeFileSync } from 'node:fs';

const [entrada, saida] = process.argv.slice(2);
const p = JSON.parse(readFileSync(entrada, 'utf8'));
const primeira = (p.cenas && p.cenas[0] && p.cenas[0].frames) || 4 * (p.fps || 30);
writeFileSync(saida, JSON.stringify({ ...p, legenda: false }));
console.log(Math.max(0, Math.floor(primeira * 0.75)));
