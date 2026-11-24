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
