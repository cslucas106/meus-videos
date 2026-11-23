import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { bateComTabela, calcula, lerNumero, numerosDoTexto, validaPedido } from '../scripts/regras.mjs';

const exemplo = () => JSON.parse(readFileSync(new URL('../pedidos/exemplo.json', import.meta.url), 'utf8'));
const dados = [{ id: 'a', rotulo: 'Censo 2022', valor: 203080756, fonte: 'IBGE', data: '2022-08-01' }];

test('lê números do jeito brasileiro', () => {
  assert.equal(lerNumero('11.451.999'), 11451999);
  assert.equal(lerNumero('6,5'), 6.5);
  assert.equal(lerNumero('3.5'), 3.5);
  assert.deepEqual(numerosDoTexto('eram 190,8 milhões e 6,5%').map(n => n.valor), [190.8e6, 6.5]);
});

test('arredondamentos honestos batem com a tabela', () => {
  for (const t of ['203.080.756', '203 milhões', '203,1 milhões'])
    assert.ok(bateComTabela(numerosDoTexto(t)[0], dados), t);
  assert.ok(!bateComTabela(numerosDoTexto('210 milhões')[0], dados));
  assert.ok(!bateComTabela(numerosDoTexto('47%')[0], dados));
  assert.ok(bateComTabela(numerosDoTexto('em 2022')[0], dados), 'ano no rótulo');
  assert.ok(bateComTabela(numerosDoTexto('as 3 capitais')[0], dados), 'contagem pequena');
});

test('contas só com ids da tabela', () => {
  assert.equal(calcula('(a - b) / b * 100', { a: 110, b: 100 }), 10);
  assert.throws(() => calcula('c * 2', { a: 1 }), /não está na tabela/);
  assert.throws(() => calcula('a; process.exit()', { a: 1 }), /não permitidos/);
});

test('o exemplo passa', () => {
  assert.deepEqual(validaPedido(exemplo()).erros, []);
});

test('número inventado na narração é barrado', () => {
  const p = exemplo();
  p.cenas[1].narracao = 'O Brasil tem 215 milhões de habitantes.';
  assert.match(validaPedido(p).erros.join('\n'), /215 milhões/);
});

test('dado sem fonte ou sem link é barrado', () => {
  const p = exemplo();
  delete p.dados[0].fonte;
  delete p.dados[1].url;
  const erros = validaPedido(p).erros.join('\n');
  assert.match(erros, /falta a fonte/);
  assert.match(erros, /link https/);
});

test('conta que não bate com o valor informado é barrada', () => {
  const p = exemplo();
  p.dados[2].valor = 9;
  assert.match(validaPedido(p).erros.join('\n'), /não bate com a conta/);
});
