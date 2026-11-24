// Mapa de municípios: baixa o contorno dos municípios do estado (malhas territoriais do IBGE, GeoJSON) e guarda
// no pedido, já convertido para o desenho (SVG), em cena.malha = { uf, viewBox, areas: [{ cod, d }] }.
// Só para as cenas "mapa" cujos dados têm "mun" (código IBGE do município). Se falhar, a cena fica sem malha
// e mostra o estado aceso no mapa do Brasil, com a lista dos municípios.
// Uso: node scripts/malhas.mjs out/pedido.json
import { readFileSync, writeFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import { COD_UF, ehMunicipio } from './regras.mjs';

const LADO = 1000; // o lado maior do desenho
const PERTO = 0.6; // pontos mais perto que isso do anterior saem (deixa o arquivo menor sem mudar o desenho)

/** Endereço da malha de um estado com os municípios dentro (qualidade mínima: leve e suficiente para o vídeo) */
export const urlMalha = codUf =>
  `https://servicodados.ibge.gov.br/api/v3/malhas/estados/${codUf}?formato=application/vnd.geo+json&intrarregiao=municipio&qualidade=minima`;

const aneis = g =>
  !g ? [] : g.type === 'Polygon' ? g.coordinates : g.type === 'MultiPolygon' ? g.coordinates.flat() : [];

/** GeoJSON (FeatureCollection do IBGE) → { viewBox, areas: [{ cod, d }] }. Projeção simples (longitude encolhida pelo
    cosseno da latitude do meio), que fica certa para um estado. */
export function malhaSvg(geo) {
  const feats = ((geo && geo.features) || []).filter(f => f && f.geometry);
  let x0 = Infinity,
    x1 = -Infinity,
    y0 = Infinity,
    y1 = -Infinity;
  for (const f of feats)
    for (const anel of aneis(f.geometry))
      for (const [lon, lat] of anel) {
        x0 = Math.min(x0, lon);
        x1 = Math.max(x1, lon);
        y0 = Math.min(y0, lat);
        y1 = Math.max(y1, lat);
      }
  if (!feats.length || !(x1 > x0) || !(y1 > y0)) throw new Error('malha vazia');
  const cos = Math.cos((((y0 + y1) / 2) * Math.PI) / 180);
  const k = LADO / Math.max((x1 - x0) * cos, y1 - y0);
  const w = Math.ceil((x1 - x0) * cos * k),
    h = Math.ceil((y1 - y0) * k);
  const r = v => Math.round(v * 10) / 10;
  const areas = [];
  for (const f of feats) {
    const cod = String((f.properties && (f.properties.codarea || f.properties.CD_MUN)) || '');
    let d = '';
    for (const anel of aneis(f.geometry)) {
      let ant = null,
        n = 0,
        parte = '';
      for (const [lon, lat] of anel) {
        const x = r((lon - x0) * cos * k),
          y = r((y1 - lat) * k);
        if (ant && Math.hypot(x - ant[0], y - ant[1]) < PERTO) continue;
        parte += (n ? 'L' : 'M') + x + ',' + y;
        ant = [x, y];
        n++;
      }
      if (n >= 3) d += parte + 'Z';
    }
    if (d) areas.push({ cod, d });
  }
  return { viewBox: `0 0 ${w} ${h}`, areas };
}

async function baixa(codUf) {
  let erro;
  for (let i = 0; i < 3; i++) {
    try {
      const r = await fetch(urlMalha(codUf), { signal: AbortSignal.timeout(40000) });
      if (!r.ok) throw new Error('HTTP ' + r.status);
      return await r.json();
    } catch (e) {
      erro = e;
      await new Promise(ok => setTimeout(ok, 2000 * (i + 1)));
    }
  }
  throw erro;
}

async function principal(arq) {
  const p = JSON.parse(readFileSync(arq, 'utf8'));
  const porId = Object.fromEntries((p.dados || []).map(d => [d.id, d]));
  const cache = {};
  let mudou = false;
  for (const [i, c] of (p.cenas || []).entries()) {
    if (c.tipo !== 'mapa') continue;
    delete c.malha; // nunca confia em malha que veio no pedido: ela é sempre baixada aqui
    const mun = (c.dados || []).map(id => porId[id]).filter(d => d && ehMunicipio(d.mun));
    if (!mun.length) continue;
    const codUf = String(mun[0].mun).slice(0, 2);
    try {
      cache[codUf] = cache[codUf] || malhaSvg(await baixa(codUf));
      c.malha = { uf: COD_UF[codUf], ...cache[codUf] };
      console.log(`Cena ${i + 1}: malha de ${COD_UF[codUf]} com ${cache[codUf].areas.length} municípios`);
    } catch (e) {
      console.log(`Aviso: não consegui baixar a malha de ${COD_UF[codUf]} (${e.message}); a cena ${i + 1} mostra o estado no mapa do Brasil.`);
    }
    mudou = true;
  }
  if (mudou) writeFileSync(arq, JSON.stringify(p, null, 2));
}

if (import.meta.url === pathToFileURL(process.argv[1] || '').href) await principal(process.argv[2] || 'out/pedido.json');
