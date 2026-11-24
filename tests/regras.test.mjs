import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { bateComTabela, calcula, lerNumero, numerosDoTexto, validaPedido } from '../scripts/regras.mjs';

const exemplo = () => JSON.parse(readFileSync(new URL('../videos/exemplo/pedido.json', import.meta.url), 'utf8'));
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

test('ordinais, séculos e décadas não são dado (não são barrados)', () => {
  for (const t of ['no século 19', 'nos séculos 18 e 19', 'o 1º lugar e a 2ª vez', 'o 21º colocado', 'nos anos 90', 'nos anos 1990 e 2000', 'na década de 80', 'anos 80 e 90'])
    assert.deepEqual(numerosDoTexto(t), [], t);
  // continuam sendo conferidos: idade, temperatura, ano solto e "anos 90 mil"
  for (const t of ['tinha 90 anos', 'fez 30°C', 'em 1904', 'anos 90 mil']) assert.equal(numerosDoTexto(t).length, 1, t);
});

test('dados da cena como objeto dão erro claro (e não "[object Object]")', () => {
  const p = exemplo();
  const c = p.cenas.find(x => Array.isArray(x.dados));
  c.dados = c.dados.map(id => ({ id }));
  const erros = validaPedido(p).erros.join('\n');
  assert.match(erros, /só o id do dado/);
  assert.doesNotMatch(erros, /object Object/);
});

const ano = (id, valor, url = 'https://pt.wikipedia.org/wiki/Thelema') => ({ id, rotulo: 'ano ' + valor, valor, unidade: 'ano', fonte: 'Wikipédia · Thelema', url, data: 'consultado em 2026-11' });
const base = extra => ({ titulo: 'T', formato: 'vertical', dados: [], ...extra });

test('linha do tempo: eventos com dados de ano; ano não entra em gráfico', () => {
  const p = base({
    dados: [ano('a1904', 1904), ano('a1920', 1920)],
    cenas: [{ tipo: 'linhaTempo', titulo: 'x', eventos: [{ dado: 'a1904', texto: 'Livro da Lei' }, { dado: 'a1920', texto: 'Abadia em Cefalù' }], narracao: 'Em 1904 e em 1920.' }]
  });
  assert.deepEqual(validaPedido(p).erros, []);
  p.cenas[0].eventos = [{ dado: 'a1904', texto: 'x' }];
  assert.match(validaPedido(p).erros.join('\n'), /2 a 6 eventos/);
  p.cenas[0].eventos = [{ dado: 'a1904', texto: 'x' }, { dado: 'nada', texto: 'y' }];
  assert.match(validaPedido(p).erros.join('\n'), /"nada" não está na tabela/);
  const g = base({ dados: [ano('a1904', 1904), ano('a1920', 1920)], cenas: [{ tipo: 'barras', dados: ['a1904', 'a1920'], narracao: 'x' }] });
  assert.match(validaPedido(g).erros.join('\n'), /é um ano; ano não entra em barras/);
  const n = base({ dados: [{ id: 'pop', rotulo: 'p', valor: 10, fonte: 'f', url: 'https://x.org', data: '2020' }], cenas: [{ tipo: 'linhaTempo', eventos: [{ dado: 'pop', texto: 'a' }, { dado: 'pop', texto: 'b' }], narracao: 'x' }] });
  assert.match(validaPedido(n).erros.join('\n'), /precisa ter unidade "ano"/);
});

test('lista: 2 a 6 itens de texto, e os números dos itens também são conferidos', () => {
  const p = base({ cenas: [{ tipo: 'lista', titulo: 'Dicas', itens: ['Beba água', 'Durma bem'], narracao: 'Duas dicas.' }] });
  assert.deepEqual(validaPedido(p).erros, []);
  p.cenas[0].itens.push('Ande 8000 passos');
  assert.match(validaPedido(p).erros.join('\n'), /"8000" não está na tabela/);
  p.cenas[0].itens = ['só um'];
  assert.match(validaPedido(p).erros.join('\n'), /2 a 6 itens/);
});

test('roteiro livre: só dados informados pela pessoa ou anos da Wikipédia', () => {
  const ok = base({ livre: true, dados: [ano('a1904', 1904), { id: 'meu1', rotulo: 'm', valor: 7, fonte: 'eu', data: '2026', manual: true }], cenas: [{ tipo: 'texto', texto: 'Oi', narracao: 'Em 1904.' }] });
  assert.deepEqual(validaPedido(ok).erros, []);
  const ruim = base({ livre: true, dados: [{ id: 'pop', rotulo: 'p', valor: 10, fonte: 'IBGE', url: 'https://ibge.gov.br', data: '2020' }, ano('a1', 1999, 'https://exemplo.com')], cenas: [{ tipo: 'texto', texto: 'Oi', narracao: 'x' }] });
  const e = validaPedido(ruim).erros.join('\n');
  assert.match(e, /dado 1 \(pop\): no roteiro livre/);
  assert.match(e, /dado 2 \(a1\): no roteiro livre/);
  assert.match(validaPedido(base({ livre: true, cenas: [{ tipo: 'texto', texto: 'Oi', narracao: 'Há 300 anos' }] })).erros.join('\n'), /"300" não está na tabela/);
});

test('post do kit: texto, hashtags e números conferidos', () => {
  const p = base({ dados: [ano('a1904', 1904)], cenas: [{ tipo: 'texto', texto: 'x', narracao: 'x' }], post: { texto: 'Tudo começou em 1904.', hashtags: ['#história', '#Thelema'] } });
  assert.deepEqual(validaPedido(p).erros, []);
  p.post.texto = 'Mais de 5000 seguidores.';
  assert.match(validaPedido(p).erros.join('\n'), /post: o número "Mais de 5000"/);
  p.post = { texto: 'ok', hashtags: ['sem cerquilha'] };
  assert.match(validaPedido(p).erros.join('\n'), /hashtags/);
});

test('tema, efeitos e foto do Wikimedia Commons (com crédito)', () => {
  const foto = {
    url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/a/ab/X.jpg/1280px-X.jpg',
    pagina: 'https://commons.wikimedia.org/wiki/File:X.jpg',
    autor: 'Fulano',
    licenca: 'CC BY-SA 4.0'
  };
  const p = base({ tema: 'neon', efeitos: true, cenas: [{ tipo: 'texto', texto: 'Oi', narracao: 'Oi', foto }] });
  assert.deepEqual(validaPedido(p).erros, []);
  p.tema = 'rosa';
  assert.match(validaPedido(p).erros.join('\n'), /tema deve ser/);
  p.tema = 'escuro';
  p.cenas[0].foto = { ...foto, url: 'https://evil.com/x.jpg' };
  assert.match(validaPedido(p).erros.join('\n'), /foto inválida/);
  p.cenas[0].foto = { ...foto, licenca: 'Fair use' };
  assert.match(validaPedido(p).erros.join('\n'), /foto inválida/);
  p.cenas[0].foto = foto;
  p.cenas[0].imagem = 'foto-1.jpg';
  assert.deepEqual(validaPedido(p).erros, []);
});
