// Baixa as fotos do Wikimedia Commons das cenas (cena.foto) para public/fundos/foto-N.jpg e marca cena.imagem.
// Uso: node scripts/fotos.mjs out/pedido.json public/fundos
// O app (1.13.0+) já baixa as fotos e grava em videos/<nome>/fundos/foto-N.jpg (com cena.imagem): essas ficam como estão.
// A Wikimedia costuma responder 429 aos servidores do GitHub, por isso o app baixa antes; aqui é só a segunda chance.
// Só baixa de https://upload.wikimedia.org (o resto é recusado). Foto que não baixar: a cena fica sem imagem, com aviso.
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fotoValida } from './regras.mjs';

const [arq, pasta] = process.argv.slice(2);
if (!arq || !pasta) {
  console.error('Uso: node scripts/fotos.mjs out/pedido.json public/fundos');
  process.exit(2);
}
const pedido = JSON.parse(readFileSync(arq, 'utf8'));
mkdirSync(pasta, { recursive: true });
const MAX = 15 * 1024 * 1024;
// numeração das fotos baixadas aqui continua depois das que o app mandou (foto-1, foto-2…)
let n = Math.max(
  0,
  ...readdirSync(pasta)
    .map(f => /^foto-(\d+)\./.exec(f))
    .filter(Boolean)
    .map(m => Number(m[1]))
);
for (const [i, c] of (pedido.cenas || []).entries()) {
  if (!c.foto) continue;
  if (!fotoValida(c.foto)) {
    console.log(`::warning::Cena ${i + 1}: foto recusada (endereço ou licença fora do esperado).`);
    delete c.foto;
    if (/^foto-/.test(String(c.imagem || ''))) delete c.imagem;
    continue;
  }
  if (/^foto-\d+\.(jpg|png)$/.test(String(c.imagem || '')) && existsSync(join(pasta, c.imagem))) {
    console.log(`Cena ${i + 1}: ${c.imagem} (veio do app) · ${c.foto.autor} · ${c.foto.licenca}`);
    continue;
  }
  let ok = false;
  for (let t = 1; t <= 3 && !ok; t++) {
    try {
      const r = await fetch(c.foto.url, {
        headers: { 'User-Agent': 'meus-videos/1.0 (PocketCode AI; github.com/cslucas106/meus-videos)' },
        signal: AbortSignal.timeout(30000)
      });
      const tipo = r.headers.get('content-type') || '';
      if (!r.ok || !/^image\/(jpeg|png)/.test(tipo)) throw new Error(`resposta ${r.status} ${tipo}`);
      const buf = Buffer.from(await r.arrayBuffer());
      if (buf.length > MAX) throw new Error('arquivo grande demais');
      const nome = `foto-${++n}.${/png/.test(tipo) ? 'png' : 'jpg'}`;
      writeFileSync(join(pasta, nome), buf);
      c.imagem = nome;
      ok = true;
      console.log(`Cena ${i + 1}: ${nome} (${Math.round(buf.length / 1024)} KB) · ${c.foto.autor} · ${c.foto.licenca}`);
    } catch (e) {
      console.log(`Cena ${i + 1}: tentativa ${t} falhou: ${e.message}`);
      // 429 = a Wikimedia pediu para esperar: espera mais (até 20 s)
      const espera = /resposta 429/.test(e.message) ? 7000 * t : 2000 * t;
      await new Promise(ok2 => setTimeout(ok2, Math.min(20000, espera)));
    }
  }
  if (!ok) {
    console.log(`::warning::Cena ${i + 1}: não consegui baixar a foto; a cena fica sem imagem.`);
    delete c.foto;
    if (/^foto-/.test(String(c.imagem || ''))) delete c.imagem;
  }
}
writeFileSync(arq, JSON.stringify(pedido, null, 2));
