import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ehMunicipio, ufDoMunicipio, validaPedido } from '../scripts/regras.mjs';
import { malhaSvg, urlMalha } from '../scripts/malhas.mjs';
import { notas, quadros } from '../scripts/storyboard.mjs';

const mun = (id, cod, valor) => ({ id, rotulo: 'População de ' + id, rotuloCurto: id, mun: cod, valor, unidade: 'habitantes', fonte: 'IBGE · Censo 2022', url: 'https://servicodados.ibge.gov.br/api/v3/agregados/4709', data: '2022' });
const pedido = (dados, extra = {}) => ({
  versao: 1,
  formato: 'vertical',
  titulo: 'Cidades do Ceará',
  dados,
  cenas: [{ tipo: 'mapa', titulo: 'As maiores', dados: dados.map(d => d.id), narracao: 'As maiores cidades do Ceará.', ...extra }]
});

test('código IBGE de município: 7 dígitos, de um estado que existe', () => {
  assert.equal(ufDoMunicipio(2304400), 'CE');
  assert.equal(ufDoMunicipio('3550308'), 'SP');
  assert.ok(!ehMunicipio('230440'));
  assert.ok(!ehMunicipio('9904400'));
  assert.equal(ufDoMunicipio('abc'), null);
});

test('mapa de municípios: um estado só, sem misturar com estados', () => {
  const ok = pedido([mun('fortaleza', 2304400, 2428708), mun('caucaia', '2303709', 355679)]);
  assert.deepEqual(validaPedido(ok).erros, []);
  const doisEstados = pedido([mun('fortaleza', 2304400, 2428708), mun('saopaulo', 3550308, 11451999)]);
  assert.match(validaPedido(doisEstados).erros.join('\n'), /um estado só/);
  const misturado = pedido([mun('fortaleza', 2304400, 2428708), { ...mun('ceara', null, 8794957), mun: undefined, uf: 'CE' }]);
  assert.match(validaPedido(misturado).erros.join('\n'), /todos os dados são de municípios/);
  const errado = pedido([mun('fortaleza', 230440, 2428708)]);
  assert.match(validaPedido(errado).erros.join('\n'), /mun inválido/);
  const repetido = pedido([mun('fortaleza', 2304400, 2428708), mun('fortaleza2', 2304400, 2428708)]);
  assert.match(validaPedido(repetido).erros.join('\n'), /duas vezes/);
  const muitos = pedido(Array.from({ length: 31 }, (_, i) => mun('c' + i, 2300000 + i * 10, 1000 + i)));
  assert.match(validaPedido(muitos).erros.join('\n'), /1 a 30 dados/);
});

test('malha do IBGE vira desenho: um caminho por município, dentro da caixa', () => {
  assert.match(urlMalha(23), /\/malhas\/estados\/23\?formato=application\/vnd\.geo\+json&intrarregiao=municipio/);
  const geo = {
    type: 'FeatureCollection',
    features: [
      { properties: { codarea: '2304400' }, geometry: { type: 'Polygon', coordinates: [[[-38.6, -3.7], [-38.4, -3.7], [-38.4, -3.9], [-38.6, -3.9], [-38.6, -3.7]]] } },
      {
        properties: { codarea: '2303709' },
        geometry: { type: 'MultiPolygon', coordinates: [[[[-39, -3.5], [-38.6, -3.5], [-38.6, -3.9], [-39, -3.5]]], [[[-39, -4], [-38.9, -4], [-38.9, -4.1], [-39, -4]]]] }
      },
      { properties: { codarea: '2300000' }, geometry: null }
    ]
  };
  const s = malhaSvg(geo);
  assert.deepEqual(s.areas.map(a => a.cod), ['2304400', '2303709']);
  const [, , w, h] = s.viewBox.split(' ').map(Number);
  assert.equal(Math.max(w, h), 1000);
  for (const a of s.areas) {
    assert.match(a.d, /^M[\d.]+,[\d.]+(L[\d.]+,[\d.]+)+Z/);
    for (const [, x, y] of a.d.matchAll(/([\d.]+),([\d.]+)/g)) assert.ok(+x <= w && +y <= h, a.d);
  }
  assert.equal(s.areas[1].d.split('Z').filter(Boolean).length, 2, 'as duas partes do município');
  assert.throws(() => malhaSvg({ features: [] }), /vazia/);
});

test('storyboard: uma foto em ~3/4 de cada cena e a tela de fontes, com os tempos para o app', () => {
  const props = { titulo: 'T <b>', fps: 30, cenas: [{ tipo: 'titulo', frames: 100 }, { tipo: 'numero', frames: 60 }], fontesFrames: 150 };
  const q = quadros(props);
  assert.deepEqual(q.map(x => [x.arquivo, x.quadro, x.inicio, x.fim]), [
    ['cena-01.jpg', 78, 0, 3.33],
    ['cena-02.jpg', 146, 3.33, 5.33],
    ['fontes.jpg', 235, 5.33, 10.33]
  ]);
  const n = notas(props, q);
  assert.ok(!n.includes('<b>'));
  const j = JSON.parse(/<!-- storyboard:(.*) -->/.exec(n)[1]);
  assert.deepEqual(j[1], { n: 2, tipo: 'numero', arquivo: 'cena-02.jpg', inicio: 3.33, fim: 5.33 });
});

import { checaCodigo } from '../scripts/regras.mjs';
import { confereAnimacoes, testaAnimacao } from '../scripts/animacao-teste.mjs';

const COPO = `const k = mola(5);
const alt = 788 * k * valor('pct') / 100;
return h('svg', { viewBox: '0 0 1000 1000', width: L, height: A },
  h('rect', { x: 312, y: 900 - alt, width: 376, height: alt, fill: cor.destaque }),
  ...faixa(6).map(i => h('circle', { cx: 350 + i * 60, cy: 880 - ((f * 4 + i * 90) % 700), r: 10, fill: pega(cor.barras, i) })),
  h('text', { x: 500, y: 980, fill: cor.texto, fontSize: 70, textAnchor: 'middle' }, conta('pct', entre(0, 1, 0.1, 0.6))));`;
const tabelaAnim = [{ id: 'pct', rotulo: 'Parte', valor: 27.6, unidade: '%', fonte: 'IBGE', data: '2022' }];

test('animação: o código seguro passa; laço, this, new, colchetes, construtor e nomes da página não passam', () => {
  assert.deepEqual(checaCodigo(COPO), []);
  const ruins = {
    'for (let i = 0; i < 3; i++) {} return h("div")': /laços/,
    'return this': /"this"/,
    'return new Date()': /"new"/,
    'const x = pega; return x[0]': /colchetes/,
    'return (x => 1).constructor("return 1")()': /constructor/,
    'const { constructor: F } = h; return F': /constructor/,
    'const o = { ["con" + "structor"]: 1 }; return o': /chave calculada/,
    'return fetch("https://x")': /fetch/,
    'return globalThis': /globalThis/,
    'const s = "\\u0063onstructor"; return s': /\\u/,
    'return h("div")._owner': /_owner/,
    'return "a".repeat(9)': /repeat/,
    'h("div")': /return h/
  };
  for (const [c, re] of Object.entries(ruins)) assert.match(checaCodigo(c).join(' | '), re, c);
  assert.match(checaCodigo('x'.repeat(5000)).join(' '), /longo demais/);
});

test('animação: o teste isolado roda o código e troca por texto o que falha (número fora da tabela, peça proibida, erro)', () => {
  testaAnimacao({ codigo: COPO, dados: ['pct'] }, tabelaAnim);
  assert.throws(() => testaAnimacao({ codigo: "return h('div', {}, 'São 300 milhões')" }, tabelaAnim), /300 milhões" não está na tabela/);
  assert.throws(() => testaAnimacao({ codigo: "return h('img', {})" }, tabelaAnim), /"img" não pode/);
  assert.throws(() => testaAnimacao({ codigo: 'return 5' }, tabelaAnim), /não devolveu um desenho/);
  assert.throws(() => testaAnimacao({ codigo: "return h('div', {}, 'a'" }, tabelaAnim), /erro de escrita/);
  const ped = {
    formato: 'vertical',
    cenas: [
      { tipo: 'animacao', titulo: 'O copo', codigo: COPO, dados: ['pct'], narracao: 'a' },
      { tipo: 'animacao', titulo: 'Quebrada', codigo: 'return 5', narracao: 'b', transicao: 'zoom' }
    ]
  };
  const avisos = confereAnimacoes(ped, tabelaAnim);
  assert.equal(avisos.length, 1);
  assert.equal(ped.cenas[0].tipo, 'animacao');
  assert.deepEqual(
    { tipo: ped.cenas[1].tipo, texto: ped.cenas[1].texto, transicao: ped.cenas[1].transicao, codigo: ped.cenas[1].codigo },
    { tipo: 'texto', texto: 'Quebrada', transicao: 'zoom', codigo: undefined }
  );
  assert.match(ped.cenas[1].animacaoErro, /não devolveu um desenho/);
  const sb = quadros({ fps: 30, cenas: [{ tipo: 'texto', frames: 30, animacaoErro: 'x --> <b>y' }] });
  assert.equal(sb[0].aviso, 'x  by');
});

test('animação no pedido: precisa de título, no máximo 2 por vídeo, código conferido', () => {
  const base = {
    versao: 1,
    formato: 'vertical',
    titulo: 'T',
    dados: tabelaAnim.map(d => ({ ...d, url: 'https://servicodados.ibge.gov.br/x' })),
    cenas: [{ tipo: 'animacao', titulo: 'O copo', codigo: COPO, dados: ['pct'], narracao: 'Um copo.' }]
  };
  assert.deepEqual(validaPedido(base).erros, []);
  const sem = structuredClone(base);
  delete sem.cenas[0].titulo;
  assert.match(validaPedido(sem).erros.join(' '), /precisa de um titulo/);
  const tres = structuredClone(base);
  tres.cenas = [0, 1, 2].map(() => structuredClone(base.cenas[0]));
  assert.match(validaPedido(tres).erros.join(' '), /no máximo 2 cenas de animação/);
  const ruim = structuredClone(base);
  ruim.cenas[0].codigo = 'return window';
  assert.match(validaPedido(ruim).erros.join(' '), /cena 1 \(animação\): não use "window"/);
});
