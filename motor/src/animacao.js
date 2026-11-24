// Cena "animacao": o que o código da IA pode usar (a API) e como ele roda.
// O mesmo arquivo serve ao Remotion (no Chrome, criar = React.createElement) e ao teste isolado do Node (scripts/animacao-teste.mjs),
// que roda o código antes do vídeo. As regras do código (o que ele pode escrever) ficam em scripts/regras.mjs (checaCodigo).
import { NEGADOS, bateComTabela, numerosDoTexto } from '../scripts/regras.mjs';
import { COR, comUnidade, ehAno } from './estilo.js';

/** Peças que o desenho pode usar (HTML simples e SVG). Nada de imagem, link, script, iframe ou foreignObject. */
export const TAGS = new Set(
  'div span b i p svg g path circle rect line polyline polygon ellipse text tspan defs linearGradient radialGradient stop clipPath mask'.split(' ')
);
/** Nomes que o código recebe (nesta ordem) */
export const NOMES_API = ['h', 'f', 'fps', 'dur', 'p', 'L', 'A', 'u', 'vertical', 'cor', 'dados', 'valor', 'texto', 'rotulo', 'conta', 'entre', 'mola', 'onda', 'faixa', 'pega'];
/** Parâmetros da função: primeiro os nomes negados (todos recebem undefined: escondem window, fetch, document…), depois a API */
export const PARAMS = [...NEGADOS, ...NOMES_API];
export const MAX_PECAS = 2000; // peças por quadro
export const MAX_FAIXA = 200;

const limita = (x, a = 0, b = 1) => Math.min(b, Math.max(a, Number(x) || 0));
const ATRIBUTO = /^[a-zA-Z][a-zA-Z0-9-]*$/;
const ATRIBUTO_PROIBIDO = /^(on.*|href|xlinkhref|src|srcset|ref|dangerouslysetinnerhtml|action|formaction|is|xmlns.*)$/i;
const VALOR_PERIGOSO = /url\((?!\s*#)|javascript:|expression\(|@import/i;

/** Tira dos atributos o que poderia buscar algo fora (links, imagens, eventos) */
function limpaProps(pr) {
  const out = {};
  if (!pr || typeof pr !== 'object') return out;
  for (const [k, v] of Object.entries(pr)) {
    if (!ATRIBUTO.test(k) || ATRIBUTO_PROIBIDO.test(k)) continue;
    if (k === 'style') {
      if (!v || typeof v !== 'object') continue;
      const st = {};
      for (const [a, b] of Object.entries(v))
        if (ATRIBUTO.test(a) && (typeof b === 'number' || (typeof b === 'string' && !VALOR_PERIGOSO.test(b)))) st[a] = b;
      out.style = st;
    } else if (typeof v === 'number' || typeof v === 'boolean') out[k] = v;
    else if (typeof v === 'string' && !VALOR_PERIGOSO.test(v)) out[k] = v;
  }
  return out;
}

/** Mola simples (0 → 1) para quando não há a do Remotion (teste no Node) */
const molaSimples = ({ frame, fps }) => limita(1 - Math.exp((-frame / fps) * 6) * Math.cos((frame / fps) * 6));

/**
 * Monta a API de um quadro. o = { f, fps, dur, L, A, u, vertical, tabela (todos os dados), ids (os da cena), criar, spring }
 * Devolve { api, ehPeca }: ehPeca(x) diz se x saiu de h(…) (o código só pode devolver isso).
 */
export function montaApi(o) {
  const tabela = o.tabela || [];
  const porId = Object.fromEntries(tabela.map(d => [d.id, d]));
  const livres = new Set(); // textos que o próprio app formatou a partir da tabela
  const pecas = new WeakSet();
  let n = 0;
  const marca = s => (livres.add(s), s);
  const confere = s => {
    if (livres.has(s)) return;
    for (const x of numerosDoTexto(s))
      if (!bateComTabela(x, tabela))
        throw new Error(`o número "${x.texto}" não está na tabela (para mostrar números use texto(id) ou conta(id, k))`);
  };
  const h = (tag, props, ...filhos) => {
    if (++n > MAX_PECAS) throw new Error(`desenho grande demais (mais de ${MAX_PECAS} peças por quadro)`);
    if (typeof tag !== 'string' || !TAGS.has(tag)) throw new Error(`a peça "${String(tag)}" não pode ser usada`);
    const fl = filhos.flat(4).filter(x => x != null && x !== false && x !== true && x !== '');
    for (const x of fl) {
      if (typeof x === 'string' || typeof x === 'number') confere(String(x));
      else if (!pecas.has(x)) throw new Error('dentro de h(…) vão só textos e outras peças h(…)');
    }
    const el = o.criar(tag, limpaProps(props), ...fl);
    pecas.add(el);
    return el;
  };
  const d = id => porId[id] || null;
  const fps = o.fps || 30,
    dur = Math.max(1, o.dur || 4 * fps),
    f = Math.max(0, o.f || 0);
  const mola = (atraso = 0, rigidez = 200) =>
    (o.spring || molaSimples)({ frame: f - atraso, fps, config: { damping: rigidez } });
  const api = {
    h,
    f,
    fps,
    dur,
    p: limita(f / Math.max(1, dur - 1)),
    L: o.L || 900,
    A: o.A || 900,
    u: o.u || 1,
    vertical: !!o.vertical,
    cor: { ...COR, barras: [...COR.barras], ...(o.cor || {}) },
    dados: (o.ids || []).map(d).filter(Boolean).map(x => ({ id: x.id, rotulo: x.rotuloCurto || x.rotulo, valor: x.valor, unidade: x.unidade || '' })),
    valor: id => (d(id) ? d(id).valor : 0),
    texto: id => (d(id) ? marca(comUnidade(d(id))) : ''),
    rotulo: id => (d(id) ? marca(String(d(id).rotuloCurto || d(id).rotulo)) : ''),
    /** o valor do dado contando de 0 até ele (k de 0 a 1), já formatado: para números que sobem */
    conta: (id, k) => {
      const x = d(id);
      if (!x) return '';
      const c = limita(k);
      return marca(c >= 1 ? comUnidade(x) : ehAno(x) ? String(Math.round(x.valor * c)) : comUnidade({ ...x, casas: 0 }, x.valor * c));
    },
    /** de a até b enquanto o progresso da cena (p) vai de ini a fim, com aceleração suave */
    entre: (a, b, ini = 0, fim = 1) => {
      const t = limita((api.p - ini) / Math.max(1e-6, fim - ini));
      const e = t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2;
      return a + (b - a) * e;
    },
    mola,
    onda: (vel = 1) => Math.sin((2 * Math.PI * vel * f) / fps),
    faixa: k => Array.from({ length: Math.floor(limita(k, 0, MAX_FAIXA)) }, (_, i) => i),
    pega: (lista, i) => {
      if (!lista || typeof lista.length !== 'number' || !lista.length) return undefined;
      const k = ((Math.floor(Number(i) || 0) % lista.length) + lista.length) % lista.length;
      return lista.slice(k, k + 1).pop();
    }
  };
  return { api, ehPeca: x => !!x && typeof x === 'object' && pecas.has(x) };
}

/** Argumentos da função compilada: undefined para cada nome negado, depois a API */
export const argumentos = api => [...NEGADOS.map(() => undefined), ...NOMES_API.map(k => api[k])];

/** Compila o código (no Chrome do Remotion). Erro de sintaxe lança aqui. */
export function compila(codigo) {
  const fn = new Function(...PARAMS, '"use strict";\n' + codigo);
  return api => fn(...argumentos(api));
}

