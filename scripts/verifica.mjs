// Uso: node scripts/verifica.mjs videos/<nome>/pedido.json [out/pedido.json]
// Se passar o segundo caminho, grava ali o pedido conferido (com as contas já feitas).
// Para o GitHub Actions com erro se algum número não estiver na tabela.
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import { validaPedido } from './regras.mjs';
import { confereAnimacoes } from './animacao-teste.mjs';

const arq = process.argv[2];
if (!arq) {
  console.error('Uso: node scripts/verifica.mjs videos/<nome>/pedido.json');
  process.exit(2);
}
let pedido;
try {
  pedido = JSON.parse(readFileSync(arq, 'utf8'));
} catch (err) {
  console.error(`::error::Não consegui ler ${arq}: ${err.message}`);
  process.exit(1);
}
const { erros, dados } = validaPedido(pedido);
if (erros.length) {
  for (const m of erros) console.error(`::error::${m}`);
  console.error(`\n${erros.length} problema(s). O vídeo não foi gerado.`);
  process.exit(1);
}
// cenas "animacao": roda o código num teste isolado; a que falhar vira texto (o vídeo sai do mesmo jeito)
for (const m of confereAnimacoes(pedido, dados)) console.log(`::warning::${m}`);
const saida = process.argv[3];
if (saida) {
  mkdirSync(dirname(saida), { recursive: true });
  writeFileSync(saida, JSON.stringify({ ...pedido, dados }, null, 2));
}
console.log(`Pedido ok: ${pedido.cenas.length} cenas, ${dados.length} dados, todos com fonte.`);
