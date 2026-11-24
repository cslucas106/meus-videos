// Cores (do tema escolhido) e números do jeito brasileiro, usados por todas as cenas.

/** Temas visuais: cores + fonte. O pedido escolhe com "tema"; o padrão é "escuro". */
export const TEMAS = {
  escuro: {
    fonte: 'Inter',
    cor: {
      fundo: '#0b0f17',
      cartao: '#151b26',
      borda: '#2a3342',
      texto: '#f1f5f9',
      suave: '#94a3b8',
      destaque: '#f97316',
      brilho: '#38bdf8',
      barras: ['#f97316', '#38bdf8', '#a3e635', '#f472b6', '#facc15', '#a78bfa']
    }
  },
  neon: {
    fonte: 'Space Grotesk',
    cor: {
      fundo: '#08051a',
      cartao: '#150e2e',
      borda: '#3a2a6b',
      texto: '#f5f3ff',
      suave: '#a9a6d3',
      destaque: '#e879f9',
      brilho: '#22d3ee',
      barras: ['#e879f9', '#22d3ee', '#a3e635', '#f472b6', '#facc15', '#818cf8']
    }
  },
  jornal: {
    fonte: 'Merriweather',
    cor: {
      claro: true,
      fundo: '#f5efe3',
      cartao: '#e9e0cd',
      borda: '#c9bba0',
      texto: '#1c1917',
      suave: '#57534e',
      destaque: '#b91c1c',
      brilho: '#1d4ed8',
      barras: ['#b91c1c', '#1d4ed8', '#15803d', '#a16207', '#7c3aed', '#0f766e']
    }
  },
  natureza: {
    fonte: 'Nunito',
    cor: {
      fundo: '#0b1a11',
      cartao: '#13281b',
      borda: '#2a5139',
      texto: '#ecfdf5',
      suave: '#9fbfaa',
      destaque: '#84cc16',
      brilho: '#facc15',
      barras: ['#84cc16', '#22c55e', '#facc15', '#38bdf8', '#fb923c', '#a78bfa']
    }
  },
  pop: {
    fonte: 'Nunito',
    cor: {
      fundo: '#1d0f36',
      cartao: '#2c1950',
      borda: '#4d2f7d',
      texto: '#fff7ed',
      suave: '#c9b8fb',
      destaque: '#facc15',
      brilho: '#fb7185',
      barras: ['#facc15', '#fb7185', '#22d3ee', '#a3e635', '#f97316', '#c084fc']
    }
  }
};

/** Cores em uso. Todas as cenas leem daqui; aplicaTema troca o conteúdo (uma composição por render). */
export const COR = { ...TEMAS.escuro.cor, barras: [...TEMAS.escuro.cor.barras] };

/** Põe as cores do tema em COR e devolve o tema (fonte incluída). Tema desconhecido = escuro. */
export function aplicaTema(nome) {
  const t = TEMAS[nome] || TEMAS.escuro;
  Object.assign(COR, { claro: false }, t.cor, { barras: [...t.cor.barras] });
  return t;
}

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
