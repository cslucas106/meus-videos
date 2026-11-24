// Teste isolado das cenas "animacao" antes do vídeo: roda o código da IA num contexto vazio do Node (node:vm, sem acesso ao
// computador), com tempo máximo, em 5 momentos da cena (começo, 1/4, meio, 3/4 e fim). Confere que ele devolve um desenho
// e que todo número que aparece na tela está na tabela. Se falhar, a cena vira um texto com o título (o vídeo sai do mesmo jeito)
// e o motivo fica em cena.animacaoErro (o storyboard mostra).
import vm from 'node:vm';
import { FORMATOS } from './regras.mjs';
import { PARAMS, argumentos, montaApi } from '../src/animacao.js';

const TEMPO = 2000; // ms por quadro (folga para o GitHub Actions, que às vezes é lento; laços já são proibidos pelas regras)
const MOMENTOS = [0, 0.25, 0.5, 0.75, 1];

/** Roda o código em 5 momentos; lança erro com o motivo se algo der errado */
export function testaAnimacao(cena, tabela, formato = 'vertical', fps = 30) {
  const [w, hh] = FORMATOS[formato] || FORMATOS.vertical;
  const u = Math.min(w, hh) / 1080,
    vertical = hh > w;
  const ctx = vm.createContext(Object.create(null));
  let fn;
  try {
    fn = vm.runInContext(`(function(${PARAMS.join(',')}){"use strict";\n${cena.codigo}\n})`, ctx, { timeout: TEMPO });
  } catch (e) {
    throw new Error('o código tem erro de escrita: ' + e.message);
  }
  const dur = 5 * fps;
  for (const m of MOMENTOS) {
    const { api, ehPeca } = montaApi({
      f: Math.round(m * (dur - 1)),
      fps,
      dur,
      L: w - 180 * u,
      A: vertical ? hh - 900 * u : hh - 520 * u,
      u,
      vertical,
      tabela,
      ids: Array.isArray(cena.dados) ? cena.dados : [],
      criar: (tag, props, ...filhos) => ({ tag, props, filhos })
    });
    ctx.__fn = fn;
    ctx.__args = argumentos(api);
    let el;
    try {
      el = vm.runInContext('__fn(...__args)', ctx, { timeout: TEMPO });
    } catch (e) {
      throw new Error(`no momento ${Math.round(m * 100)}% da cena: ${e.message}`);
    }
    if (!ehPeca(el)) throw new Error(`no momento ${Math.round(m * 100)}% da cena o código não devolveu um desenho (return h(…))`);
  }
}

/** Testa as animações do pedido e troca as que falham por um texto com o título. Devolve os avisos. */
export function confereAnimacoes(pedido, tabela) {
  const avisos = [];
  pedido.cenas = (pedido.cenas || []).map((c, i) => {
    if (c.tipo !== 'animacao') return c;
    try {
      testaAnimacao(c, tabela, pedido.formato);
      return c;
    } catch (e) {
      const motivo = String(e.message || e).slice(0, 300);
      avisos.push(`cena ${i + 1}: a animação não funcionou e virou um texto com o título (${motivo})`);
      const { codigo, dados, ...resto } = c;
      return { ...resto, tipo: 'texto', texto: c.titulo, animacaoErro: motivo };
    }
  });
  return avisos;
}
