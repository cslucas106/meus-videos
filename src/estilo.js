// Cores e números do jeito brasileiro, usados por todas as cenas.
export const COR = {
  fundo: '#0b0f17',
  cartao: '#151b26',
  borda: '#2a3342',
  texto: '#f1f5f9',
  suave: '#94a3b8',
  destaque: '#f97316',
  barras: ['#f97316', '#38bdf8', '#a3e635', '#f472b6', '#facc15', '#a78bfa']
};

const nf = casas => new Intl.NumberFormat('pt-BR', { maximumFractionDigits: casas, minimumFractionDigits: 0 });

/** 11451999 -> "11.451.999"; 6.4712 -> "6,5" */
export function formata(valor, casas) {
  const c = casas ?? (Math.abs(valor) >= 100 ? 0 : Math.abs(valor) >= 10 ? 1 : 2);
  return nf(c).format(valor);
}

/** Texto curto para eixos: 11451999 -> "11,5 mi" */
export function curto(valor) {
  const a = Math.abs(valor);
  if (a >= 1e9) return `${formata(valor / 1e9, 1)} bi`;
  if (a >= 1e6) return `${formata(valor / 1e6, 1)} mi`;
  if (a >= 1e4) return `${formata(valor / 1e3, 0)} mil`;
  return formata(valor);
}

/** Ano (unidade "ano") aparece sem ponto: 1904, e não 1.904 */
export const ehAno = d => !!d && /^anos?$/i.test(String(d.unidade || '').trim());

export const comUnidade = (d, valor = d.valor) =>
  ehAno(d)
    ? String(Math.round(valor))
    : d.unidade === '%'
      ? `${formata(valor, d.casas)}%`
      : d.unidade === 'R$'
        ? `R$ ${formata(valor, d.casas ?? 2)}`
        : formata(valor, d.casas);

/** Link legível: a API da Wikipédia (w/api.php?…titles=X) vira o artigo (wiki/X) */
export const urlBonita = u => {
  const m = /^https:\/\/([a-z]{2,3}\.wikipedia\.org)\/w\/api\.php\?.*[?&]titles=([^&]+)/.exec(String(u || ''));
  return m ? `https://${m[1]}/wiki/${decodeURIComponent(m[2]).replace(/ /g, '_')}` : String(u || '');
};
