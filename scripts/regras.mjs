// Regras que todo pedido de vídeo precisa cumprir antes de virar vídeo.
// A ideia central: nenhum número aparece no vídeo se não estiver na tabela
// de dados, com fonte e data. O PocketCode AI roda as mesmas regras antes
// de mandar o pedido; aqui elas rodam de novo, por garantia.

export const FORMATOS = { vertical: [1080, 1920], horizontal: [1920, 1080] };
export const TIPOS = ['titulo', 'numero', 'barras', 'linha', 'texto', 'ranking', 'comparacao', 'mapa', 'icones', 'linhaTempo', 'lista', 'animacao'];
export const TRANSICOES = ['deslizar', 'zoom', 'subir', 'corte'];
export const MUSICAS = ['calma', 'animada', 'lofi', 'epica', 'suspense', 'alegre', 'eletronica', 'nenhuma'];
/** Estilos de legenda (legenda: true = 'animada', false = sem legenda) */
export const LEGENDAS = ['animada', 'simples', 'grande', 'caixa'];
/** Estilos de efeitos sonoros (efeitos: true = 'completo', false = sem efeitos) */
export const EFEITOS = ['completo', 'suave', 'transicoes', 'arcade'];
export const UFS = 'AC AL AP AM BA CE DF ES GO MA MT MS MG PA PB PR PE PI RJ RN RS RO RR SC SP SE TO'.split(' ');
// Mapa de municípios: no máximo 30 cidades pintadas, todas do mesmo estado (o contorno vem das malhas do IBGE)
export const MAX_MUNICIPIOS = 30;
// Código IBGE do estado (os 2 primeiros dígitos do código de 7 dígitos do município) → sigla
export const COD_UF = {
  11: 'RO', 12: 'AC', 13: 'AM', 14: 'RR', 15: 'PA', 16: 'AP', 17: 'TO', 21: 'MA', 22: 'PI', 23: 'CE', 24: 'RN', 25: 'PB', 26: 'PE',
  27: 'AL', 28: 'SE', 29: 'BA', 31: 'MG', 32: 'ES', 33: 'RJ', 35: 'SP', 41: 'PR', 42: 'SC', 43: 'RS', 50: 'MS', 51: 'MT', 52: 'GO', 53: 'DF'
};
/** "2304400" ou 2304400 (Fortaleza) → true: código IBGE de município de 7 dígitos, de um estado que existe */
export const ehMunicipio = v => /^\d{7}$/.test(String(v ?? '')) && !!COD_UF[String(v).slice(0, 2)];
/** Código do município → sigla do estado (ex. 2304400 → "CE"), ou null */
export const ufDoMunicipio = v => (ehMunicipio(v) ? COD_UF[String(v).slice(0, 2)] : null);
/** quantos dados cada tipo de gráfico aceita: [mínimo, máximo] */
const LISTAS = { barras: [2, 8], linha: [2, 12], ranking: [3, 10], comparacao: [2, 2], mapa: [1, MAX_MUNICIPIOS] };
export const VOZES = [
  'pt-BR-FranciscaNeural',
  'pt-BR-AntonioNeural',
  'pt-BR-ThalitaMultilingualNeural',
  'pt-PT-RaquelNeural',
  'pt-PT-DuarteNeural'
];
export const MAX_CENAS = 24;
export const MAX_DADOS = 40;
export const MAX_NARRACAO = 600;
export const MAX_ITENS = 6; // eventos da linha do tempo e itens da lista
export const MAX_ITEM = 120; // letras de cada evento/item
export const MAX_POST = 700; // letras do texto do post (kit para postar)
export const TEMAS = ['escuro', 'neon', 'jornal', 'natureza', 'pop'];
export const MAX_FOTOS = 6;
/** Foto do Wikimedia Commons, do Pixabay ou da NASA (o app baixa; o crédito vai na cena e no fim do vídeo) */
export function fotoValida(f) {
  return (
    !!f &&
    typeof f === 'object' &&
    /^https:\/\/(upload\.wikimedia\.org|pixabay\.com|cdn\.pixabay\.com|images-assets\.nasa\.gov)\/[^\s"'<>]+$/.test(String(f.url || '')) &&
    /^https:\/\/(commons\.wikimedia\.org|pixabay\.com|images\.nasa\.gov)\/[^\s"'<>]+$/.test(String(f.pagina || '')) &&
    typeof f.autor === 'string' &&
    !!f.autor.trim() &&
    f.autor.length <= 200 &&
    typeof f.licenca === 'string' &&
    /^(cc0|cc[ -]by|public domain|pd\b|domínio público|licença pixabay)/i.test(f.licenca.trim()) &&
    (f.fonte == null || (typeof f.fonte === 'string' && f.fonte.length <= 40)) &&
    f.licenca.length <= 60
  );
}
export const MAX_SONS = 3;
/** Som de ambiente do Freesound (prévia MP3; licença CC0 ou CC BY, sem "não comercial"). O app baixa em sons/som-N.mp3 (cena.somArquivo). */
export function somValido(s) {
  return (
    !!s &&
    typeof s === 'object' &&
    /^https:\/\/cdn\.freesound\.org\/previews\/[\w/.-]+\.mp3$/.test(String(s.url || '')) &&
    /^https:\/\/freesound\.org\/people\/[^\s"'<>]+$/.test(String(s.pagina || '')) &&
    typeof s.autor === 'string' &&
    !!s.autor.trim() &&
    s.autor.length <= 80 &&
    /^(CC0|CC BY \d(\.\d)?)$/.test(String(s.licenca || '')) &&
    (s.titulo == null || (typeof s.titulo === 'string' && s.titulo.length <= 120)) &&
    (s.fonte == null || (typeof s.fonte === 'string' && s.fonte.length <= 40))
  );
}

/** Dado que é um ano (unidade "ano"): aparece sem ponto (1904) e só na linha do tempo, nunca como valor de gráfico. */
// ---------- Cena "animacao": código que a IA escreve para uma animação que as cenas prontas não fazem ----------
// O código roda no Chrome que desenha o vídeo (e antes, num teste isolado no Node). Por isso só um pedaço pequeno e seguro do
// JavaScript passa: sem laços (use faixa(n).map), sem acessar nada por colchetes (use pega(lista, i)), sem this, new, function,
// classes, import nem eval, e sem os nomes que dariam acesso à página, à internet ou ao computador (NEGADOS). Além disso, ele roda
// com esses nomes trocados por undefined e o texto que aparece na tela é conferido com a tabela, como a narração.
export const MAX_ANIMACOES = 2;
export const MAX_CODIGO = 4000;
const PALAVRAS_PROIBIDAS = new Set(
  'for while do class new this import export async await function with yield delete debugger var try catch finally throw super extends eval'.split(' ')
);
export const NEGADOS = (
  'window self top parent frames opener globalThis global document location history navigator fetch XMLHttpRequest WebSocket ' +
  'EventSource Request Response Headers Image Audio Option Worker SharedWorker ServiceWorker importScripts Function setTimeout ' +
  'setInterval setImmediate requestAnimationFrame requestIdleCallback queueMicrotask localStorage sessionStorage indexedDB caches ' +
  'alert confirm prompt open close postMessage Object Reflect Proxy Symbol WeakRef FinalizationRegistry Array Promise process require ' +
  'module exports Buffer __dirname __filename Deno Bun chrome customElements Atomics SharedArrayBuffer WebAssembly performance console'
).split(' ');
const NEGADOS_SET = new Set(NEGADOS);
// nomes de propriedade que abririam caminho para fora (construtor de funções, protótipos, a página) ou que travam (textos gigantes)
const PROPS_PROIBIDAS = new Set(
  (
    'constructor prototype __proto__ caller callee call apply bind ownerDocument defaultView getRootNode parentNode parentElement ' +
    'contentWindow contentDocument innerHTML outerHTML insertAdjacentHTML dangerouslySetInnerHTML repeat padStart padEnd'
  ).split(' ')
);
// palavras depois das quais "[" abre uma lista (e não acessa algo por colchetes)
const ANTES_DE_LISTA = new Set(['return', 'typeof', 'void', 'case', 'else', 'in', 'of', 'const', 'let', 'instanceof']);

/** Separa o código em pedaços (nome, número, texto, sinal). Lança erro em texto ou comentário sem fim. */
export function tokensDoCodigo(src) {
  const t = [];
  const n = src.length;
  const lerTexto = (i, q) => {
    let v = '';
    for (i++; i < n; i++) {
      const c = src[i];
      if (c === q) return [v, i + 1];
      if (c === '\n') throw new Error('texto entre aspas sem fechar');
      if (c === '\\') {
        const e = src[i + 1];
        if (e === 'u' || e === 'x' || /[0-9]/.test(e)) throw new Error('não use códigos \\u, \\x nem números escapados dentro de textos');
        v += { n: '\n', t: '\t' }[e] || e;
        i++;
        continue;
      }
      v += c;
    }
    throw new Error('texto entre aspas sem fechar');
  };
  // lê a partir de i até o fim (ou até a "}" que fecha um ${…} de texto com crase); devolve onde parou
  const lex = (i, dentroDeCrase) => {
    let chaves = 0;
    while (i < n) {
      const c = src[i];
      if (/\s/.test(c)) { i++; continue; }
      if (c === '/' && src[i + 1] === '/') { const j = src.indexOf('\n', i); i = j < 0 ? n : j; continue; }
      if (c === '/' && src[i + 1] === '*') {
        const j = src.indexOf('*/', i + 2);
        if (j < 0) throw new Error('comentário sem fechar');
        i = j + 2;
        continue;
      }
      if (c === '"' || c === "'") { const [v, j] = lerTexto(i, c); t.push({ t: 'str', v }); i = j; continue; }
      if (c === '`') {
        let v = '';
        i++;
        for (;;) {
          if (i >= n) throw new Error('texto com crase sem fechar');
          const d = src[i];
          if (d === '`') { t.push({ t: 'str', v }); i++; break; }
          if (d === '\\') {
            const e = src[i + 1];
            if (e === 'u' || e === 'x' || /[0-9]/.test(e)) throw new Error('não use códigos \\u, \\x nem números escapados dentro de textos');
            v += e;
            i += 2;
            continue;
          }
          if (d === '$' && src[i + 1] === '{') {
            t.push({ t: 'str', v });
            v = '';
            t.push({ t: 'p', v: '(' });
            i = lex(i + 2, true);
            t.push({ t: 'p', v: ')' });
            continue;
          }
          v += d;
          i++;
        }
        continue;
      }
      if (/[A-Za-z_$\u00c0-\uffff]/.test(c)) {
        let j = i + 1;
        while (j < n && /[\w$\u00c0-\uffff]/.test(src[j])) j++;
        t.push({ t: 'id', v: src.slice(i, j) });
        i = j;
        continue;
      }
      if (/[0-9]/.test(c) || (c === '.' && /[0-9]/.test(src[i + 1] || ''))) {
        let j = i + 1;
        while (j < n && /[\w.]/.test(src[j])) j++;
        t.push({ t: 'num', v: src.slice(i, j) });
        i = j;
        continue;
      }
      if (c === '\\') throw new Error('não use barra invertida (\\) fora dos textos');
      if (c === '?' && src[i + 1] === '.' && !/[0-9]/.test(src[i + 2] || '')) { t.push({ t: 'p', v: '?.' }); i += 2; continue; }
      if (c === '=' && src[i + 1] === '>') { t.push({ t: 'p', v: '=>' }); i += 2; continue; }
      if (c === '{') chaves++;
      if (c === '}') {
        if (dentroDeCrase && chaves === 0) return i + 1;
        chaves--;
      }
      t.push({ t: 'p', v: c });
      i++;
    }
    if (dentroDeCrase) throw new Error('${ sem fechar num texto com crase');
    return i;
  };
  lex(0, false);
  return t;
}

/** Confere o código de uma cena "animacao". Devolve a lista de problemas (vazia = pode rodar). */
export function checaCodigo(codigo) {
  if (typeof codigo !== 'string' || !codigo.trim()) return ['falta o código da animação'];
  if (codigo.length > MAX_CODIGO) return [`código longo demais (máx. ${MAX_CODIGO} letras)`];
  let t;
  try {
    t = tokensDoCodigo(codigo);
  } catch (err) {
    return [err.message];
  }
  const probs = new Set();
  const pilha = [];
  for (const [k, x] of t.entries()) {
    const ant = t[k - 1];
    if (x.t === 'id') {
      const depoisDoPonto = ant && ant.t === 'p' && (ant.v === '.' || ant.v === '?.');
      if (!depoisDoPonto && PALAVRAS_PROIBIDAS.has(x.v))
        probs.add(`não use "${x.v}" (sem laços: use faixa(n).map; sem function: use =>; sem this, new, class, import, eval, try)`);
      if (!depoisDoPonto && NEGADOS_SET.has(x.v)) probs.add(`não use "${x.v}": a animação só usa o que o app entrega`);
      if (PROPS_PROIBIDAS.has(x.v) || x.v.startsWith('__') || (depoisDoPonto && x.v.startsWith('_')))
        probs.add(`não use "${x.v}"`);
    } else if (x.t === 'str') {
      const v = x.v.trim();
      if (PROPS_PROIBIDAS.has(v) || v.startsWith('__')) probs.add(`não use "${v}"`);
    } else if (x.v === '(' || x.v === '[' || x.v === '{') {
      if (x.v === '[' && ant) {
        const acesso =
          ant.t === 'num' ||
          ant.t === 'str' ||
          (ant.t === 'id' && !ANTES_DE_LISTA.has(ant.v)) ||
          (ant.t === 'p' && (ant.v === ')' || ant.v === ']' || ant.v === '?.'));
        const chaveCalculada = ant.t === 'p' && (ant.v === '{' || ant.v === ',') && pilha[pilha.length - 1] === '{';
        if (acesso) probs.add('não acesse nada com colchetes (lista[i], objeto["x"]): use pega(lista, i) e objeto.nome');
        if (chaveCalculada) probs.add('não use chave calculada ({[x]: …}) em objetos');
      }
      pilha.push(x.v);
    } else if (x.v === ')' || x.v === ']' || x.v === '}') pilha.pop();
  }
  if (!t.some(x => x.t === 'id' && x.v === 'return')) probs.add('o código precisa terminar com return h(…) (o desenho da cena)');
  return [...probs];
}

export const ehAno = d => !!d && /^anos?$/i.test(String(d.unidade || '').trim());
const naWikipedia = u => /^https:\/\/[a-z]{2,3}\.wikipedia\.org\//.test(String(u || ''));

const MULT = { mil: 1e3, milhao: 1e6, milhoes: 1e6, bilhao: 1e9, bilhoes: 1e9, trilhao: 1e12, trilhoes: 1e12 };
const semAcento = s => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

/** Converte "11.451.999", "11,4", "3.5" (ponto decimal) em número. */
export function lerNumero(t) {
  if (/,/.test(t)) return Number(t.replace(/\./g, '').replace(',', '.'));
  // Só pontos: "11.451.999" é milhar; "3.5" é decimal
  if (/^\d{1,3}(\.\d{3})+$/.test(t)) return Number(t.replace(/\./g, ''));
  return Number(t);
}

// Palavras antes do número que mudam o sentido: "mais de 2 milhões" é um limite, não o valor exato
/** @type {[RegExp, string][]} */
const QUALIFICA = [
  [/(mais de|acima de|mais que|pelo menos|no m[ií]nimo|ultrapass\w*|passa(?:m|ndo)? de|supera\w*)\s*$/i, 'min'],
  [/(menos de|abaixo de|menos que|no m[aá]ximo|at[ée])\s*$/i, 'max'],
  [/(quase)\s*$/i, 'quase'],
  [/(cerca de|aproximadamente|por volta de|perto de|em torno de|uns|umas|aprox\.)\s*$/i, 'cerca']
];

/**
 * Números que não são dado e ficam fora da conferência: ordinais ("1º", "2ª"), séculos ("século 19", "séculos 18 e 19")
 * e décadas ("anos 90", "anos 1990", "década de 80", "anos 80 e 90").
 */
export function naoEDado(t, ini, fim, v) {
  if (/^[ºª]/.test(t.slice(fim))) return true;
  const antes = t.slice(Math.max(0, ini - 30), ini);
  if (/s[ée]culos?\s+(\d+\s*(e|a|,|ao)\s*)?$/i.test(antes)) return true;
  const decada = Number.isInteger(v) && v % 10 === 0 && (v < 100 || (v >= 1000 && v <= 2100));
  return decada && /(\banos|d[ée]cadas?\s+de)\s+(\d+\s*(e|a|,|aos)\s*(os\s+)?)?$/i.test(antes);
}

/**
 * Acha os números escritos num texto, já multiplicados por "mil", "milhões" etc.
 * Junta os números falados em partes ("2 milhões e 500 mil" = 2.500.000) e marca os limites
 * ("mais de", "menos de", "quase", "cerca de") em n.limite. Ordinais, séculos e décadas ficam de fora (naoEDado).
 */
export function numerosDoTexto(texto) {
  const t = String(texto || '');
  const partes = [];
  const re =
    /(\d[\d.,]*\d|\d)\s*(%|por cento|mil\b|milh(?:ão|ao|ões|oes)\b|bilh(?:ão|ao|ões|oes)\b|trilh(?:ão|ao|ões|oes)\b)?/gi;
  for (const m of t.matchAll(re)) {
    let v = lerNumero(m[1]);
    if (!Number.isFinite(v)) continue;
    const ini = m.index || 0;
    if (!m[2] && naoEDado(t, ini, ini + m[1].length, v)) continue;
    const suf = m[2] ? semAcento(m[2]) : '';
    const mult = MULT[suf] || 1;
    v *= mult;
    partes.push({ ini, fim: ini + m[0].trimEnd().length, valor: v, mult, porcento: suf === '%' || suf === 'por cento' });
  }
  // "2 milhões e 500 mil", "1 bilhão, 200 milhões", "3 mil e 40": a parte seguinte é menor que a unidade da anterior
  const juntas = [];
  for (const p of partes) {
    const a = juntas[juntas.length - 1];
    if (
      a &&
      a.mult > 1 &&
      !a.porcento &&
      !p.porcento &&
      p.valor < a.mult &&
      p.mult < a.mult &&
      /^\s*(e|,)?\s*$/i.test(t.slice(a.fim, p.ini))
    ) {
      a.valor += p.valor;
      a.mult = p.mult;
      a.fim = p.fim;
      continue;
    }
    juntas.push({ ...p });
  }
  return juntas.map(p => {
    const antes = t.slice(Math.max(0, p.ini - 25), p.ini);
    const q = QUALIFICA.find(([r]) => r.test(antes));
    const qm = q ? q[0].exec(antes) : null;
    return {
      texto: (qm ? qm[1] + ' ' : '') + t.slice(p.ini, p.fim),
      valor: p.valor,
      porcento: p.porcento,
      ...(q ? { limite: q[1] } : {})
    };
  });
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
  // Limites: verdade e perto do valor ("mais de 2,5 milhões" para 2.574.412; não para 2.428.708 nem para 9 milhões)
  if (n.limite) {
    const ok = dados.some(d => {
      const v = d.valor,
        x = n.valor;
      if (n.limite === 'min') return v > x && v <= x * 1.25;
      if (n.limite === 'max') return v < x && v >= x * 0.8;
      if (n.limite === 'quase') return v < x && v >= x * 0.9;
      return Math.abs(v - x) <= Math.abs(v) * 0.05; // cerca de: até 5%
    });
    // "mais de", "menos de" e "quase" precisam ser verdade: arredondar não salva ("menos de 2 milhões" para 2,4 milhões é falso)
    if (ok || n.limite !== 'cerca') return ok;
  }
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
  if (p.musica != null && !MUSICAS.includes(p.musica)) e(`musica deve ser ${MUSICAS.join(', ')}`);
  if (p.legenda != null && typeof p.legenda !== 'boolean' && !LEGENDAS.includes(p.legenda))
    e(`legenda deve ser true, false ou ${LEGENDAS.join(', ')}`);
  if (p.musicaVolume != null && !(Number.isInteger(p.musicaVolume) && p.musicaVolume >= 0 && p.musicaVolume <= 100))
    e('musicaVolume deve ser um número inteiro de 0 a 100');
  for (const k of ['falarFontes', 'mostrarFontes', 'avisoIA'])
    if (p[k] != null && typeof p[k] !== 'boolean') e(`${k} deve ser true ou false`);

  if (p.livre != null && typeof p.livre !== 'boolean') e('livre deve ser true ou false');
  if (p.tema != null && !TEMAS.includes(p.tema)) e(`tema deve ser ${TEMAS.join(', ')}`);
  if (p.efeitos != null && typeof p.efeitos !== 'boolean' && !EFEITOS.includes(p.efeitos))
    e(`efeitos deve ser true, false ou ${EFEITOS.join(', ')}`);
  if (Array.isArray(p.cenas) && p.cenas.filter(c => c && c.tipo === 'animacao').length > MAX_ANIMACOES)
    e(`no máximo ${MAX_ANIMACOES} cenas de animação por vídeo`);
  if (Array.isArray(p.cenas) && p.cenas.filter(c => c && c.foto != null).length > MAX_FOTOS)
    e(`no máximo ${MAX_FOTOS} fotos`);
  if (Array.isArray(p.cenas) && p.cenas.filter(c => c && c.som != null).length > MAX_SONS)
    e(`no máximo ${MAX_SONS} sons de ambiente`);
  if (p.post != null) {
    if (!p.post || typeof p.post !== 'object' || typeof p.post.texto !== 'string' || !p.post.texto.trim())
      e('post: falta o texto do post');
    else if (p.post.texto.length > MAX_POST) e(`post: texto longo demais (máx. ${MAX_POST} letras)`);
    const h = p.post && p.post.hashtags;
    if (h != null && (!Array.isArray(h) || h.length > 10 || h.some(x => typeof x !== 'string' || !/^#[\p{L}\p{N}_]{2,40}$/u.test(x))))
      e('post: hashtags são até 10, no formato #palavra (sem espaço)');
  }

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
    // roteiro livre: a IA não buscou fontes; só valem dados informados pela pessoa e anos conferidos na Wikipédia
    if (p.livre && !d.manual && d.calculo == null && !(ehAno(d) && naWikipedia(d.url)))
      e(`${onde}: no roteiro livre só entram dados informados por você ou anos conferidos na Wikipédia`);
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
    const lista = LISTAS[c.tipo];
    const usa = ['numero', 'icones'].includes(c.tipo) ? [c.dado] : lista || c.tipo === 'animacao' ? c.dados : [];
    if (['numero', 'icones'].includes(c.tipo) && !c.dado) e(`${onde}: diga qual dado mostrar`);
    if (lista && (!Array.isArray(c.dados) || c.dados.length < lista[0] || c.dados.length > lista[1]))
      e(
        lista[0] === lista[1]
          ? `${onde}: ${c.tipo} precisa de exatamente ${lista[0]} dados`
          : `${onde}: ${c.tipo} precisa de ${lista[0]} a ${lista[1]} dados`
      );
    if (c.transicao != null && !TRANSICOES.includes(c.transicao))
      e(`${onde}: transição "${c.transicao}" não existe (use ${TRANSICOES.join(', ')})`);
    if (c.imagem != null && !/^(fundo|foto)-\d{1,2}\.(jpg|png)$/.test(String(c.imagem))) e(`${onde}: nome de imagem inválido`);
    if (c.fundo != null && (typeof c.fundo !== 'string' || c.fundo.length > 300))
      e(`${onde}: a descrição da imagem de fundo deve ter até 300 letras`);
    const porId = Object.fromEntries(prontos.map(d => [d.id, d]));
    if (c.foto != null && !fotoValida(c.foto))
      e(`${onde}: foto inválida (precisa ser do Wikimedia Commons, do Pixabay ou da NASA, com autor, licença livre e página)`);
    if (c.som != null && !somValido(c.som))
      e(`${onde}: som inválido (precisa ser do Freesound, com autor, licença CC0 ou CC BY e página)`);
    if (c.somArquivo != null && !/^som-\d{1,2}\.mp3$/.test(String(c.somArquivo)))
      e(`${onde}: nome do arquivo de som inválido`);
    if (c.tipo === 'linhaTempo') {
      const ev = Array.isArray(c.eventos) ? c.eventos : [];
      if (ev.length < 2 || ev.length > MAX_ITENS) e(`${onde}: linhaTempo precisa de 2 a ${MAX_ITENS} eventos`);
      for (const [k, x] of ev.entries()) {
        const q = `${onde}, evento ${k + 1}`;
        if (!x || typeof x !== 'object') {
          e(`${q}: cada evento é {"dado": "id do ano", "texto": "o que aconteceu"}`);
          continue;
        }
        if (typeof x.dado !== 'string' || !porId[x.dado])
          e(`${q}: o dado "${x.dado}" não está na tabela (cada evento usa um dado com unidade "ano")`);
        else if (!ehAno(porId[x.dado])) e(`${q}: o dado "${x.dado}" precisa ter unidade "ano"`);
        if (typeof x.texto !== 'string' || !x.texto.trim() || x.texto.length > MAX_ITEM)
          e(`${q}: o texto precisa ter de 1 a ${MAX_ITEM} letras`);
      }
    }
    if (c.tipo === 'lista') {
      const it = Array.isArray(c.itens) ? c.itens : [];
      if (it.length < 2 || it.length > MAX_ITENS) e(`${onde}: lista precisa de 2 a ${MAX_ITENS} itens`);
      if (it.some(x => typeof x !== 'string' || !x.trim() || x.length > MAX_ITEM))
        e(`${onde}: cada item da lista é um texto de 1 a ${MAX_ITEM} letras`);
    }
    // ano não é valor de gráfico ("1.900" numa barra não faz sentido): ano vai na linhaTempo
    for (const id of usa || [])
      if (typeof id === 'string' && ehAno(porId[id]))
        e(`${onde}: o dado "${id}" é um ano; ano não entra em ${c.tipo} (use a cena linhaTempo)`);
    if (c.tipo === 'mapa') {
      const ds = (Array.isArray(c.dados) ? c.dados : []).map(id => porId[id]).filter(Boolean);
      const mun = ds.filter(d => d.mun != null);
      if (mun.length) {
        // mapa de municípios de um estado: cada dado com "mun" = código IBGE do município
        if (mun.length < ds.length)
          e(`${onde}: no mapa, ou todos os dados são de municípios (campo mun) ou todos são de estados (campo uf)`);
        for (const d of mun)
          if (!ehMunicipio(d.mun))
            e(`${onde}: o dado "${d.id}" tem mun inválido (código IBGE do município, 7 dígitos, ex. 2304400 = Fortaleza)`);
        const ufs = [...new Set(mun.map(d => ufDoMunicipio(d.mun)).filter(Boolean))];
        if (ufs.length > 1) e(`${onde}: o mapa de municípios mostra um estado só (vieram ${ufs.join(', ')})`);
        if (new Set(mun.map(d => String(d.mun))).size < mun.length) e(`${onde}: o mesmo município aparece duas vezes no mapa`);
      } else {
        if (ds.length > UFS.length) e(`${onde}: o mapa do Brasil tem só ${UFS.length} estados`);
        for (const id of c.dados || [])
          if (porId[id] && !UFS.includes(String(porId[id].uf || '').toUpperCase()))
            e(`${onde}: o dado "${id}" precisa do campo uf (sigla do estado, ex. CE) ou mun (código IBGE do município) para ir no mapa`);
      }
    }
    if (c.tipo === 'animacao') {
      if (!c.titulo || typeof c.titulo !== 'string') e(`${onde}: a animação precisa de um titulo (é o que aparece se ela não funcionar)`);
      for (const m of checaCodigo(c.codigo)) e(`${onde} (animação): ${m}`);
      if (c.dados != null && (!Array.isArray(c.dados) || c.dados.length > 8)) e(`${onde}: a animação usa até 8 dados (ids da tabela)`);
    }
    if (c.tipo === 'icones' && porId[c.dado]) {
      const d = porId[c.dado];
      if (d.unidade !== '%' || d.valor < 0 || d.valor > 100)
        e(`${onde}: ícones mostram uma porcentagem de 0 a 100 (o dado "${c.dado}" precisa ter unidade "%")`);
    }
    for (const id of usa || [])
      if (id && typeof id !== 'string')
        e(`${onde}: em "dados"/"dado" vai só o id do dado (texto, ex. "pop2022"), não um objeto`);
      else if (id && !(id in valores)) e(`${onde}: o dado "${id}" não está na tabela`);
    const textos = [
      c.narracao,
      c.titulo,
      c.subtitulo,
      c.texto,
      ...(Array.isArray(c.itens) ? c.itens : []),
      ...(Array.isArray(c.eventos) ? c.eventos.map(x => x && x.texto) : [])
    ];
    for (const t of textos) {
      for (const n of numerosDoTexto(typeof t === 'string' ? t : '')) {
        if (!bateComTabela(n, prontos))
          e(
            n.limite
              ? `${onde}: "${n.texto}" não confere com a tabela (precisa ser verdade e perto do valor)`
              : `${onde}: o número "${n.texto}" não está na tabela de dados`
          );
      }
    }
  }
  if (p.post && typeof p.post.texto === 'string')
    for (const n of numerosDoTexto(p.post.texto))
      if (!bateComTabela(n, prontos))
        e(`post: o número "${n.texto}" não está na tabela de dados`);
  return { erros, dados: prontos };
}
