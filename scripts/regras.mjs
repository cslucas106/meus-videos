// Regras que todo pedido de vídeo precisa cumprir antes de virar vídeo.
// A ideia central: nenhum número aparece no vídeo se não estiver na tabela
// de dados, com fonte e data. O PocketCode AI roda as mesmas regras antes
// de mandar o pedido; aqui elas rodam de novo, por garantia.

export const FORMATOS = { vertical: [1080, 1920], horizontal: [1920, 1080] };
export const TIPOS = ['titulo', 'numero', 'barras', 'linha', 'texto'];
export const VOZES = [
  'pt-BR-FranciscaNeural',
  'pt-BR-AntonioNeural',
  'pt-BR-ThalitaMultilingualNeural',
  'pt-PT-RaquelNeural',
  'pt-PT-DuarteNeural'
];
export const MAX_CENAS = 12;
export const MAX_DADOS = 40;
export const MAX_NARRACAO = 600;

const MULT = { mil: 1e3, milhao: 1e6, milhoes: 1e6, bilhao: 1e9, bilhoes: 1e9, trilhao: 1e12, trilhoes: 1e12 };
const semAcento = s => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

/** Converte "11.451.999", "11,4", "3.5" (ponto decimal) em número. */
export function lerNumero(t) {
  if (/,/.test(t)) return Number(t.replace(/\./g, '').replace(',', '.'));
  // Só pontos: "11.451.999" é milhar; "3.5" é decimal
  if (/^\d{1,3}(\.\d{3})+$/.test(t)) return Number(t.replace(/\./g, ''));
  return Number(t);
}

/** Acha os números escritos num texto, já multiplicados por "mil", "milhões" etc. */
export function numerosDoTexto(texto) {
  const achados = [];
  const re = /(\d[\d.,]*\d|\d)\s*(%|por cento|mil\b|milh(?:ão|ao|ões|oes)\b|bilh(?:ão|ao|ões|oes)\b|trilh(?:ão|ao|ões|oes)\b)?/gi;
  for (const m of String(texto || '').matchAll(re)) {
    let v = lerNumero(m[1]);
    if (!Number.isFinite(v)) continue;
    const suf = m[2] ? semAcento(m[2]) : '';
    if (MULT[suf]) v *= MULT[suf];
    achados.push({ texto: m[0].trim(), valor: v, porcento: suf === '%' || suf === 'por cento' });
  }
  return achados;
}

/** Calcula um dado derivado, tipo "(d2 - d1) / d1 * 100". Só aceita ids, números e + - * / ( ).
    Sem eval: um leitor pequeno de contas (o app roda com CSP que proíbe eval). */
export function calcula(expr, valores) {
  const s = String(expr || '');
  if (!/^[\sa-z0-9_.+\-*/()]+$/i.test(s)) throw new Error(`conta com caracteres não permitidos: ${s}`);
  const fichas = s.match(/[a-z_][a-z0-9_]*|\d+(?:\.\d+)?|[-+*/()]/gi) || [];
  let i = 0;
  const olha = () => fichas[i];
  const pega = () => fichas[i++];
  const fator = () => {
    const f = pega();
    if (f === undefined) throw new Error(`conta incompleta: ${s}`);
    if (f === '-') return -fator();
    if (f === '+') return fator();
    if (f === '(') {
      const v = soma();
      if (pega() !== ')') throw new Error(`falta fechar parêntese: ${s}`);
      return v;
    }
    if (/^\d/.test(f)) return Number(f);
    if (/^[a-z_]/i.test(f)) {
      if (!Object.hasOwn(valores, f)) throw new Error(`a conta usa "${f}", que não está na tabela`);
      return Number(valores[f]);
    }
    throw new Error(`conta inválida: ${s}`);
  };
  const produto = () => {
    let v = fator();
    while (olha() === '*' || olha() === '/') v = pega() === '*' ? v * fator() : v / fator();
    return v;
  };
  const soma = () => {
    let v = produto();
    while (olha() === '+' || olha() === '-') v = pega() === '+' ? v + produto() : v - produto();
    return v;
  };
  const r = soma();
  if (i < fichas.length) throw new Error(`conta inválida: ${s}`);
  if (!Number.isFinite(r)) throw new Error(`a conta "${s}" não deu um número`);
  return r;
}

const perto = (x, v) => {
  const tol = Math.max(Math.abs(v) * 0.01, 0.05);
  return Math.abs(x - v) <= tol;
};

/** Um número do texto "bate" com a tabela? (aceita arredondamento de até 1%) */
export function bateComTabela(n, dados) {
  for (const d of dados) {
    if (perto(n.valor, d.valor)) return true;
    // Arredondado para inteiro ou uma casa ("6%" ou "6,5%" para 6,47)
    if (n.valor === Math.round(d.valor) || n.valor === Math.round(d.valor * 10) / 10) return true;
    // "11,4 milhões" bate com 11.451.999; "11 milhões" também (até 1% ou arredondado)
    if (Math.abs(d.valor) >= 1000) {
      for (const m of [1e3, 1e6, 1e9]) {
        if (Math.abs(d.valor) < m) break;
        if (Math.abs(n.valor - Math.round(d.valor / m * 10) / 10 * m) < 1e-6 * m) return true;
        if (Math.abs(n.valor - Math.round(d.valor / m) * m) < 1e-6 * m) return true;
      }
    }
  }
  // Anos e números que já estão escritos no nome ou na data de um dado (ex.: "Censo 2022")
  const nomes = dados.map(d => `${d.rotulo} ${d.data} ${d.fonte}`).join(' ');
  if (Number.isInteger(n.valor) && new RegExp(`(^|\\D)${n.valor}(\\D|$)`).test(nomes)) return true;
  // Contagens pequenas ("as 3 capitais") são permitidas
  if (!n.porcento && Number.isInteger(n.valor) && n.valor >= 0 && n.valor <= 10) return true;
  return false;
}

/**
 * Confere o pedido inteiro. Devolve { erros: [...], dados: [...com valor calculado] }.
 * Se erros estiver vazio, o pedido pode virar vídeo.
 */
export function validaPedido(p) {
  const erros = [];
  const e = m => erros.push(m);
  if (!p || typeof p !== 'object') return { erros: ['o pedido não é um objeto JSON'], dados: [] };
  if (!p.titulo || typeof p.titulo !== 'string') e('falta o título do vídeo');
  if (!(p.formato in FORMATOS)) e(`formato deve ser ${Object.keys(FORMATOS).join(' ou ')}`);
  if (p.voz && !VOZES.includes(p.voz)) e(`voz desconhecida: ${p.voz}`);
  if (p.velocidade && !/^[+-]\d{1,2}%$/.test(p.velocidade)) e('velocidade deve ser tipo "+10%" ou "-5%"');

  const dados = Array.isArray(p.dados) ? p.dados : [];
  if (!Array.isArray(p.dados)) e('falta a tabela de dados (pode ser vazia)');
  if (dados.length > MAX_DADOS) e(`no máximo ${MAX_DADOS} dados`);
  const valores = Object.create(null);
  const prontos = [];
  for (const [i, d0] of dados.entries()) {
    const d = { ...d0 };
    const onde = `dado ${i + 1}${d.id ? ` (${d.id})` : ''}`;
    if (!/^[a-z][a-z0-9_]{0,30}$/i.test(d.id || '')) { e(`${onde}: id inválido`); continue; }
    if (d.id in valores) e(`${onde}: id repetido`);
    if (!d.rotulo) e(`${onde}: falta o rótulo`);
    if (!d.fonte) e(`${onde}: falta a fonte`);
    if (!d.data) e(`${onde}: falta a data do dado`);
    if (d.calculo != null) {
      try {
        const r = calcula(d.calculo, valores);
        if (d.valor != null && !perto(Number(d.valor), r)) e(`${onde}: o valor ${d.valor} não bate com a conta (${r})`);
        d.valor = r;
      } catch (err) { e(`${onde}: ${err.message}`); continue; }
    } else if (typeof d.valor !== 'number' || !Number.isFinite(d.valor)) {
      e(`${onde}: o valor precisa ser um número`);
      continue;
    } else if (d.manual) {
      // dado informado pela pessoa: o link é opcional, mas se vier tem de ser https
      if (d.url && !/^https:\/\//.test(d.url)) e(`${onde}: o link precisa começar com https://`);
    } else if (!d.url || !/^https:\/\//.test(d.url)) {
      e(`${onde}: falta o link https da fonte`);
    }
    valores[d.id] = d.valor;
    prontos.push(d);
  }

  const cenas = Array.isArray(p.cenas) ? p.cenas : [];
  if (!cenas.length) e('o roteiro não tem cenas');
  if (cenas.length > MAX_CENAS) e(`no máximo ${MAX_CENAS} cenas`);
  for (const [i, c] of cenas.entries()) {
    const onde = `cena ${i + 1}`;
    if (!TIPOS.includes(c.tipo)) { e(`${onde}: tipo "${c.tipo}" não existe (use ${TIPOS.join(', ')})`); continue; }
    if (!c.narracao || typeof c.narracao !== 'string') e(`${onde}: falta a narração`);
    else if (c.narracao.length > MAX_NARRACAO) e(`${onde}: narração longa demais (máx. ${MAX_NARRACAO} letras)`);
    const usa = c.tipo === 'numero' ? [c.dado] : ['barras', 'linha'].includes(c.tipo) ? c.dados : [];
    if (c.tipo === 'numero' && !c.dado) e(`${onde}: diga qual dado mostrar`);
    if (['barras', 'linha'].includes(c.tipo) && (!Array.isArray(c.dados) || c.dados.length < 2)) e(`${onde}: o gráfico precisa de pelo menos 2 dados`);
    for (const id of usa || []) if (id && !(id in valores)) e(`${onde}: o dado "${id}" não está na tabela`);
    for (const campo of ['narracao', 'titulo', 'subtitulo', 'texto']) {
      for (const n of numerosDoTexto(c[campo])) {
        if (!bateComTabela(n, prontos)) e(`${onde}: o número "${n.texto}" não está na tabela de dados`);
      }
    }
  }
  return { erros, dados: prontos };
}
