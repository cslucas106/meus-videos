// Baixa as fotos do Wikimedia Commons das cenas (cena.foto) para public/fundos/foto-N.jpg e marca cena.imagem.
// Uso: node scripts/fotos.mjs out/pedido.json public/fundos
// Só baixa de https://upload.wikimedia.org (o resto é recusado). Foto que não baixar: a cena fica sem imagem, com aviso.
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
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
let n = 0;
for (const [i, c] of (pedido.cenas || []).entries()) {
  if (!c.foto) continue;
  if (!fotoValida(c.foto)) {
    console.log(`::warning::Cena ${i + 1}: foto recusada (endereço ou licença fora do esperado).`);
    delete c.foto;
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
      await new Promise(ok2 => setTimeout(ok2, 2000 * t));
    }
  }
  if (!ok) {
    console.log(`::warning::Cena ${i + 1}: não consegui baixar a foto; a cena fica sem imagem.`);
    delete c.foto;
  }
}
writeFileSync(arq, JSON.stringify(pedido, null, 2));
