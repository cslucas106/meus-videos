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

test('dado informado pela pessoa: link opcional, mas fonte e data obrigatórias', () => {
  const p = exemplo();
  p.dados.push({ id: 'cap', rotulo: 'População do Recife', valor: 1488920, unidade: 'habitantes', fonte: 'IBGE (informado)', data: '2022', manual: true });
  p.cenas[4].narracao = 'O Recife tem 1,5 milhão de habitantes.';
  assert.deepEqual(validaPedido(p).erros, []);
  p.dados.at(-1).url = 'http://inseguro';
  assert.match(validaPedido(p).erros.join('\n'), /começar com https/);
  delete p.dados.at(-1).fonte;
  assert.match(validaPedido(p).erros.join('\n'), /falta a fonte/);
});

test('número falado em partes vira um só ("2 milhões e 500 mil")', () => {
  const n = numerosDoTexto('Com mais de 2 milhões e 500 mil habitantes, e 3 mil e 40 casas; 1 bilhão, 200 milhões');
  assert.deepEqual(n.map(x => x.valor), [2500000, 3040, 1200000000]);
  assert.equal(n[0].limite, 'min');
  assert.equal(n[0].texto, 'mais de 2 milhões e 500 mil');
  assert.deepEqual(numerosDoTexto('200 mil, 150 mil e 100 mil').map(x => x.valor), [200000, 150000, 100000]);
});

test('"mais de", "quase" e "cerca de" só passam se forem verdade e perto do valor', () => {
  const d = [{ rotulo: 'Fortaleza', valor: 2428708, fonte: 'IBGE', data: '2022' }];
  const b = t => bateComTabela(numerosDoTexto(t)[0], d);
  assert.ok(b('mais de 2 milhões e 400 mil'));
  assert.ok(b('quase 2,5 milhões'));
  assert.ok(b('cerca de 2,4 milhões'));
  assert.ok(!b('mais de 2 milhões e 500 mil'), 'falso: 2.428.708 não é mais de 2,5 milhões');
  assert.ok(!b('menos de 2 milhões'), 'falso');
  assert.ok(!b('mais de 1 milhão'), 'verdade, mas longe demais do valor');
});

test('cenas novas: ranking, comparação, mapa e ícones conferem os dados que usam', () => {
  const p = exemplo();
  assert.deepEqual(validaPedido(p).erros, [], 'o exemplo usa comparação, mapa e ícones');
  const q = exemplo();
  q.cenas.push({ tipo: 'ranking', dados: ['fort2022', 'fort2025'], narracao: 'Ranking.' });
  q.cenas.push({ tipo: 'comparacao', dados: ['fort2022'], narracao: 'Só um.' });
  q.cenas.push({ tipo: 'mapa', dados: ['fort2022'], narracao: 'Sem estado.' });
  q.cenas.push({ tipo: 'icones', dado: 'fort2022', narracao: 'Não é porcentagem.' });
  q.cenas.push({ tipo: 'texto', texto: 'x', narracao: 'x', transicao: 'explosao', imagem: '../segredo.jpg' });
  q.musica = 'rock';
  const e = validaPedido(q).erros.join('\n');
  assert.match(e, /ranking precisa de 3 a 10 dados/);
  assert.match(e, /comparacao precisa de exatamente 2 dados/);
  assert.match(e, /precisa do campo uf/);
  assert.match(e, /ícones mostram uma porcentagem/);
  assert.match(e, /transição "explosao" não existe/);
  assert.match(e, /nome de imagem inválido/);
  assert.match(e, /musica deve ser/);
});
