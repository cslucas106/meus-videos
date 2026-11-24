// As cenas do vídeo. Cada uma recebe a cena do roteiro e a tabela de dados (por id).
// As animações dos números começam quando a voz chega ao número (momentoNumero), para imagem e fala andarem juntas.
import React from 'react';
import brasil from '@svg-maps/brazil';
import { interpolate, spring, useCurrentFrame, useVideoConfig } from 'remotion';
import { compila, montaApi } from '../animacao.js';
import { COR, comUnidade, curto, ehAno, formata, urlBonita } from '../estilo.js';
import { ufDoMunicipio } from '../../scripts/regras.mjs';
import { Cabeca, momentoNumero, Palco, Rodape, Sobe, useEntrada, useU, useVertical } from '../base.jsx';

const lista = (cena, dados) => (cena.dados || []).map(id => dados[id]).filter(Boolean);
const rotulo = d => d.rotuloCurto || d.rotulo;
const valorCurto = d => (d.unidade === '%' || d.unidade === 'R$' || ehAno(d) ? comUnidade(d) : curto(d.valor));

/** Valor que sobe do zero até o número, começando no quadro "inicio". */
const useConta = (alvo, inicio) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  return interpolate(frame, [inicio, inicio + 1.1 * fps], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: t => 1 - Math.pow(1 - t, 3)
  });
};

export const Titulo = ({ cena }) => {
  const u = useU();
  const e = useEntrada();
  const palavras = String(cena.titulo || '').split(' ');
  return (
    <Palco>
      <div style={{ width: 140 * u * e, height: 12 * u, background: COR.destaque, borderRadius: 10 * u }} />
      <div style={{ fontSize: 104 * u, fontWeight: 800, lineHeight: 1.02, display: 'flex', flexWrap: 'wrap', gap: `0 ${24 * u}px` }}>
        {palavras.map((p, i) => (
          <Sobe key={i} atraso={3 + i * 3}>
            {p}
          </Sobe>
        ))}
      </div>
      {cena.subtitulo ? (
        <Sobe atraso={6 + palavras.length * 3}>
          <div style={{ fontSize: 46 * u, color: COR.suave, lineHeight: 1.3 }}>{cena.subtitulo}</div>
        </Sobe>
      ) : null}
    </Palco>
  );
};

export const Numero = ({ cena, dados }) => {
  const u = useU();
  const { fps } = useVideoConfig();
  const frame = useCurrentFrame();
  const d = dados[cena.dado];
  const inicio = momentoNumero(cena, fps);
  const conta = useConta(d ? d.valor : 0, inicio);
  if (!d) return null;
  const pulso = spring({ frame: frame - inicio - Math.round(1.1 * fps), fps, config: { damping: 8, stiffness: 200 } });
  const final = conta >= 1;
  return (
    <Palco>
      <Sobe>
        <div style={{ fontSize: 50 * u, color: COR.suave, lineHeight: 1.25 }}>{cena.titulo || d.rotulo}</div>
      </Sobe>
      <div
        style={{
          fontSize: 158 * u,
          fontWeight: 800,
          color: COR.destaque,
          fontVariantNumeric: 'tabular-nums',
          lineHeight: 1,
          transform: `scale(${final ? 1 + 0.06 * Math.sin(Math.min(1, pulso) * Math.PI) : 1})`,
          transformOrigin: 'left center'
        }}
      >
        {final ? comUnidade(d) : comUnidade(d, d.valor * conta).replace(/,\d+/, '')}
      </div>
      {d.unidade && !['%', 'R$'].includes(d.unidade) ? (
        <Sobe atraso={inicio + 10}>
          <div style={{ fontSize: 50 * u, color: COR.texto }}>{d.unidade}</div>
        </Sobe>
      ) : null}
      <Rodape lista={[d]} />
    </Palco>
  );
};

const Barra = ({ d, i, max, inicio, lugar }) => {
  const u = useU();
  const e = useEntrada(inicio + i * 6, 22);
  const cor = COR.barras[i % COR.barras.length];
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 * u, opacity: Math.min(1, e * 2) }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 38 * u, gap: 20 * u }}>
        <span>
          {lugar ? <b style={{ color: COR.destaque, marginRight: 14 * u }}>{lugar}º</b> : null}
          {rotulo(d)}
        </span>
        <b style={{ fontVariantNumeric: 'tabular-nums' }}>{comUnidade(d)}</b>
      </div>
      <div style={{ height: 40 * u, background: COR.cartao, borderRadius: 12 * u, overflow: 'hidden' }}>
        <div
          style={{
            height: '100%',
            width: `${(Math.abs(d.valor) / max) * 100 * Math.min(1, e)}%`,
            background: cor,
            borderRadius: 12 * u
          }}
        />
      </div>
    </div>
  );
};

export const Barras = ({ cena, dados }) => {
  const u = useU();
  const { fps } = useVideoConfig();
  const l = lista(cena, dados);
  const max = Math.max(...l.map(d => Math.abs(d.valor)), 1);
  const inicio = momentoNumero(cena, fps);
  return (
    <Palco>
      <Cabeca texto={cena.titulo} />
      <div style={{ display: 'flex', flexDirection: 'column', gap: 30 * u }}>
        {l.map((d, i) => (
          <Barra key={d.id} d={d} i={i} max={max} inicio={inicio} />
        ))}
      </div>
      <Rodape lista={l} />
    </Palco>
  );
};

/** Ranking: do último para o primeiro, com suspense; o 1º lugar aparece por último e em destaque. */
export const Ranking = ({ cena, dados }) => {
  const u = useU();
  const { fps, durationInFrames } = useVideoConfig();
  const l = [...lista(cena, dados)].sort((a, b) => b.valor - a.valor);
  const max = Math.max(...l.map(d => Math.abs(d.valor)), 1);
  const inicio = Math.min(momentoNumero(cena, fps), Math.round(durationInFrames * 0.3));
  const passo = Math.max(4, Math.round((durationInFrames * 0.55) / Math.max(1, l.length)));
  return (
    <Palco>
      <Cabeca texto={cena.titulo} />
      <div style={{ display: 'flex', flexDirection: 'column', gap: 22 * u }}>
        {l.map((d, i) => (
          <Barra key={d.id} d={d} i={0} max={max} inicio={inicio + (l.length - 1 - i) * passo - 0} lugar={i + 1} />
        ))}
      </div>
      <Rodape lista={l} />
    </Palco>
  );
};

/** Dois números frente a frente; o segundo entra quando a voz fala o segundo número. */
export const Comparacao = ({ cena, dados }) => {
  const u = useU();
  const vertical = useVertical();
  const { fps, durationInFrames } = useVideoConfig();
  const [a, b] = lista(cena, dados);
  const i1 = momentoNumero(cena, fps, 0);
  let i2 = momentoNumero(cena, fps, 1);
  if (i2 <= i1) i2 = i1 + Math.round(durationInFrames * 0.35);
  const ea = useEntrada(i1, 16);
  const eb = useEntrada(i2, 16);
  const conta1 = useConta(1, i1);
  const conta2 = useConta(1, i2);
  if (!a || !b) return null;
  const Lado = ({ d, e, c, cor }) => (
    <div style={{ flex: 1, opacity: e, transform: `scale(${0.8 + 0.2 * e})`, textAlign: 'center' }}>
      <div style={{ fontSize: 40 * u, color: COR.suave, marginBottom: 12 * u }}>{rotulo(d)}</div>
      <div style={{ fontSize: (vertical ? 118 : 104) * u, fontWeight: 800, color: cor, fontVariantNumeric: 'tabular-nums', lineHeight: 1 }}>
        {c >= 1 ? valorCurto(d) : valorCurto({ ...d, valor: d.valor * c })}
      </div>
      {d.unidade && !['%', 'R$'].includes(d.unidade) ? <div style={{ fontSize: 36 * u, marginTop: 8 * u }}>{d.unidade}</div> : null}
    </div>
  );
  return (
    <Palco>
      <Cabeca texto={cena.titulo} />
      <div style={{ display: 'flex', flexDirection: vertical ? 'column' : 'row', alignItems: 'center', gap: 40 * u }}>
        <Lado d={a} e={ea} c={conta1} cor={COR.barras[1]} />
        <div
          style={{
            width: 110 * u,
            height: 110 * u,
            borderRadius: '50%',
            background: COR.cartao,
            border: `${4 * u}px solid ${COR.borda}`,
            display: 'grid',
            placeItems: 'center',
            fontSize: 40 * u,
            fontWeight: 800,
            opacity: eb,
            flex: 'none'
          }}
        >
          vs
        </div>
        <Lado d={b} e={eb} c={conta2} cor={COR.destaque} />
      </div>
      <Rodape lista={[a, b]} />
    </Palco>
  );
};

/** Mapa do Brasil (um estado aceso, ou vários pintados pelo valor: mais escuro = menor) ou mapa dos municípios de um
    estado (dados com "mun"; o contorno vem das malhas do IBGE em cena.malha, baixado pelo scripts/malhas.mjs).
    Sem a malha (o IBGE não respondeu), mostra o estado aceso no mapa do Brasil, com a lista dos municípios. */
export const Mapa = ({ cena, dados }) => {
  const u = useU();
  const vertical = useVertical();
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const l = lista(cena, dados);
  const municipios = l.length > 0 && l.every(d => d.mun != null);
  const malha = municipios && cena.malha && Array.isArray(cena.malha.areas) ? cena.malha : null;
  const vals = l.map(d => d.valor);
  const min = Math.min(...vals);
  const max = Math.max(...vals);
  const inicio = momentoNumero(cena, fps);
  const ordem = [...l].sort((a, b) => b.valor - a.valor);
  // cada pedaço do desenho: id (sigla do estado em minúsculas ou código do município) e o caminho
  const formas = malha ? malha.areas.map(a => ({ id: String(a.cod), path: a.d })) : brasil.locations;
  const viewBox = malha ? malha.viewBox : brasil.viewBox;
  const porId = {};
  if (malha) for (const d of l) porId[String(d.mun)] = d;
  else if (municipios) {
    const uf = String(ufDoMunicipio(l[0].mun) || '').toLowerCase();
    porId[uf] = ordem[0]; // sem malha: só o estado aceso
  } else for (const d of l) porId[String(d.uf || '').toLowerCase()] = d;
  const [, , vw, vh] = viewBox.split(' ').map(Number);
  // municípios: o estado pode ser comprido para o lado ou para cima; cabe numa caixa do tamanho do mapa do Brasil
  const caixa = (vertical ? 700 : 600) * u;
  const esc = Math.min(caixa / vw, (caixa * 1.05) / vh);
  const linhas = municipios ? 6 : 5;
  return (
    <Palco>
      <Cabeca texto={cena.titulo} />
      <div style={{ display: 'flex', flexDirection: vertical ? 'column' : 'row', alignItems: 'center', gap: 30 * u }}>
        <svg viewBox={viewBox} width={vw * esc} height={vh * esc} style={{ flex: 'none' }}>
          {formas.map(loc => {
            const d = porId[loc.id];
            const k = d ? ordem.indexOf(d) : 0;
            const e = d ? spring({ frame: frame - inicio - Math.min(k, 20) * 3, fps, config: { damping: 20 } }) : 0;
            const forca = d ? (l.length === 1 || max === min || (municipios && !malha) ? 1 : 0.35 + (0.65 * (d.valor - min)) / (max - min)) : 0;
            return (
              <path
                key={loc.id}
                d={loc.path}
                fill={d ? COR.destaque : COR.cartao}
                fillOpacity={d ? 0.15 + 0.85 * forca * e : 1}
                stroke={COR.borda}
                strokeWidth={malha ? 0.8 / esc : 1.2}
                strokeLinejoin="round"
              />
            );
          })}
        </svg>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 * u, minWidth: 0 }}>
          {ordem.slice(0, linhas).map((d, i) => (
            <Sobe key={d.id} atraso={inicio + i * 4}>
              <div style={{ fontSize: (municipios ? 34 : 38) * u, display: 'flex', gap: 16 * u, justifyContent: 'space-between' }}>
                <span>{rotulo(d)}</span>
                <b style={{ color: COR.destaque }}>{valorCurto(d)}</b>
              </div>
            </Sobe>
          ))}
        </div>
      </div>
      <Rodape lista={l} />
    </Palco>
  );
};

/** 100 bonequinhos: acende a porcentagem do dado (ex.: 38% = 38 acesos). */
export const Icones = ({ cena, dados }) => {
  const u = useU();
  const vertical = useVertical();
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const d = dados[cena.dado];
  const inicio = momentoNumero(cena, fps);
  const conta = useConta(1, inicio);
  if (!d) return null;
  const acesos = Math.round(d.valor * conta);
  const lado = (vertical ? 58 : 46) * u;
  return (
    <Palco>
      <Cabeca texto={cena.titulo || d.rotulo} />
      <div style={{ display: 'flex', flexDirection: vertical ? 'column' : 'row', alignItems: 'center', gap: 40 * u }}>
        <div style={{ display: 'grid', gridTemplateColumns: `repeat(10, ${lado}px)`, gap: 8 * u }}>
          {Array.from({ length: 100 }, (_, i) => {
            const on = i < acesos;
            const e = spring({ frame: frame - inicio - Math.floor(i / 10), fps, config: { damping: 30 } });
            return (
              <svg key={i} viewBox="0 0 20 24" width={lado} height={lado * 1.2} style={{ opacity: 0.25 + 0.75 * e }}>
                <circle cx="10" cy="5" r="4.5" fill={on ? COR.destaque : COR.borda} />
                <path d="M2 23 v-7 a8 8 0 0 1 16 0 v7 z" fill={on ? COR.destaque : COR.borda} />
              </svg>
            );
          })}
        </div>
        <div style={{ fontSize: 130 * u, fontWeight: 800, color: COR.destaque, fontVariantNumeric: 'tabular-nums' }}>
          {formata(d.valor * conta, conta >= 1 ? d.casas : 0)}%
        </div>
      </div>
      <Rodape lista={[d]} />
    </Palco>
  );
};

export const Linha = ({ cena, dados }) => {
  const u = useU();
  const { width, fps } = useVideoConfig();
  const frame = useCurrentFrame();
  const l = lista(cena, dados);
  const L = width - 180 * u;
  const A = 520 * u;
  const vals = l.map(d => d.valor);
  const min = Math.min(...vals);
  const max = Math.max(...vals);
  const pad = (max - min) * 0.15 || Math.abs(max) * 0.1 || 1;
  const y = v => A - ((v - (min - pad)) / (max + pad - (min - pad))) * A;
  const x = i => (l.length === 1 ? L / 2 : (i / (l.length - 1)) * L);
  const pts = l.map((d, i) => [x(i), y(d.valor)]);
  let comp = 0;
  for (let i = 1; i < pts.length; i++) comp += Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]);
  const inicio = momentoNumero(cena, fps);
  const p = interpolate(frame, [inicio, inicio + 1.6 * fps], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const ancora = i => (i === 0 ? 'start' : i === l.length - 1 ? 'end' : 'middle');
  return (
    <Palco>
      <Cabeca texto={cena.titulo} />
      <svg width={L} height={A + 90 * u} style={{ overflow: 'visible' }}>
        <polyline
          points={pts.map(q => q.join(',')).join(' ')}
          fill="none"
          stroke={COR.destaque}
          strokeWidth={8 * u}
          strokeLinejoin="round"
          strokeLinecap="round"
          strokeDasharray={comp}
          strokeDashoffset={comp * (1 - p)}
        />
        {l.map((d, i) => {
          const vis = p >= (l.length === 1 ? 0 : i / (l.length - 1)) ? 1 : 0;
          const mostra = l.length <= 6 || i === 0 || i === l.length - 1 || vals[i] === max || vals[i] === min;
          return (
            <g key={d.id} opacity={vis}>
              <circle cx={pts[i][0]} cy={pts[i][1]} r={12 * u} fill={COR.destaque} />
              {mostra ? (
                <text x={pts[i][0]} y={pts[i][1] - 30 * u} fill={COR.texto} fontSize={32 * u} fontWeight={700} textAnchor={ancora(i)}>
                  {valorCurto(d)}
                </text>
              ) : null}
              <text x={pts[i][0]} y={A + 60 * u} fill={COR.suave} fontSize={28 * u} textAnchor={ancora(i)}>
                {d.x ?? rotulo(d)}
              </text>
            </g>
          );
        })}
      </svg>
      <Rodape lista={l} />
    </Palco>
  );
};

/** Momento (em quadros) em que a narração fala cada item: procura a 1ª palavra marcante do item na fala.
    Sem achar, distribui os itens ao longo da cena. */
const momentosDosItens = (cena, textos, fps, dur) => {
  const pal = (cena.palavras || []).map(p => [p[0], String(p[2]).toLowerCase().replace(/[^\p{L}\p{N}]/gu, '')]);
  const base = Math.round(dur * 0.12);
  const passo = Math.max(6, Math.round((dur * 0.7) / Math.max(1, textos.length)));
  let ultimo = -1;
  return textos.map((t, i) => {
    const chaves = String(t || '')
      .toLowerCase()
      .split(/\s+/)
      .map(w => w.replace(/[^\p{L}\p{N}]/gu, ''))
      .filter(w => w.length >= 4 || /^\d+$/.test(w));
    const achou = pal.find(p => p[0] * fps > ultimo && chaves.includes(p[1]));
    const q = achou ? Math.round(achou[0] * fps) - 4 : base + i * passo;
    ultimo = Math.max(ultimo, q);
    return Math.max(0, q);
  });
};

/** Linha do tempo: os anos entram um a um, ligados por uma linha, cada um com o que aconteceu (sem gráfico de valor). */
export const LinhaTempo = ({ cena, dados }) => {
  const u = useU();
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();
  const ev = (cena.eventos || []).filter(x => x && dados[x.dado]);
  const ms = momentosDosItens(cena, ev.map(x => `${Math.round(dados[x.dado].valor)} ${x.texto}`), fps, durationInFrames);
  const fim = ms.length ? ms[ms.length - 1] : 0;
  const linha = interpolate(frame, [ms[0] || 0, fim + 12], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  return (
    <Palco>
      <Cabeca texto={cena.titulo} />
      <div style={{ position: 'relative', display: 'flex', flexDirection: 'column', gap: 34 * u, paddingLeft: 56 * u }}>
        <div
          style={{
            position: 'absolute',
            left: 17 * u,
            top: 18 * u,
            width: 6 * u,
            height: `calc(${linha * 100}% - ${36 * u}px)`,
            background: COR.borda,
            borderRadius: 3 * u
          }}
        />
        {ev.map((x, i) => {
          const e = spring({ frame: frame - ms[i], fps, config: { damping: 16, stiffness: 160 } });
          const ativo = frame >= ms[i] && (i === ev.length - 1 || frame < ms[i + 1]);
          return (
            <div key={i} style={{ position: 'relative', opacity: Math.min(1, e * 1.5), transform: `translateX(${(1 - e) * 60 * u}px)` }}>
              <div
                style={{
                  position: 'absolute',
                  left: -50 * u,
                  top: 14 * u,
                  width: 28 * u,
                  height: 28 * u,
                  borderRadius: '50%',
                  background: ativo ? COR.destaque : COR.cartao,
                  border: `${5 * u}px solid ${COR.destaque}`,
                  transform: `scale(${0.6 + 0.4 * e})`
                }}
              />
              <div style={{ fontSize: 64 * u, fontWeight: 800, color: COR.destaque, lineHeight: 1, fontVariantNumeric: 'tabular-nums' }}>
                {comUnidade(dados[x.dado])}
              </div>
              <div style={{ fontSize: 40 * u, lineHeight: 1.25, marginTop: 8 * u }}>{x.texto}</div>
            </div>
          );
        })}
      </div>
      <Rodape lista={ev.map(x => dados[x.dado])} />
    </Palco>
  );
};

/** Lista: itens (dicas, curiosidades, um Top 5) entrando um a um quando a voz fala de cada um. */
export const Lista = ({ cena }) => {
  const u = useU();
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();
  const itens = (cena.itens || []).filter(x => typeof x === 'string');
  const ms = momentosDosItens(cena, itens, fps, durationInFrames);
  return (
    <Palco>
      <Cabeca texto={cena.titulo} />
      <div style={{ display: 'flex', flexDirection: 'column', gap: 26 * u }}>
        {itens.map((t, i) => {
          const e = spring({ frame: frame - ms[i], fps, config: { damping: 16, stiffness: 160 } });
          return (
            <div
              key={i}
              style={{
                display: 'flex',
                gap: 24 * u,
                alignItems: 'center',
                opacity: Math.min(1, e * 1.5),
                transform: `translateY(${(1 - e) * 40 * u}px)`,
                background: COR.cartao,
                border: `${2 * u}px solid ${COR.borda}`,
                borderRadius: 22 * u,
                padding: `${22 * u}px ${28 * u}px`
              }}
            >
              <div
                style={{
                  flex: 'none',
                  width: 64 * u,
                  height: 64 * u,
                  borderRadius: '50%',
                  background: COR.barras[i % COR.barras.length],
                  color: COR.fundo,
                  display: 'grid',
                  placeItems: 'center',
                  fontSize: 36 * u,
                  fontWeight: 800
                }}
              >
                {cena.numerada === false ? '•' : i + 1}
              </div>
              <div style={{ fontSize: 42 * u, lineHeight: 1.25, fontWeight: 600 }}>{t}</div>
            </div>
          );
        })}
      </div>
    </Palco>
  );
};

export const Texto = ({ cena }) => {
  const u = useU();
  const palavras = String(cena.texto || cena.titulo || '').split(' ');
  return (
    <Palco>
      <div style={{ fontSize: 76 * u, fontWeight: 700, lineHeight: 1.2, display: 'flex', flexWrap: 'wrap', gap: `0 ${18 * u}px` }}>
        {palavras.map((p, i) => (
          <Sobe key={i} atraso={i * 2}>
            {p}
          </Sobe>
        ))}
      </div>
    </Palco>
  );
};

/* Tela final: as fontes (mostrarFontes) e, no roteiro livre, o aviso de texto escrito com IA (avisoIA). O narrar.py só cria a tela
   quando uma das duas vale; sem nenhuma, o vídeo termina na última cena. */
export const Fontes = ({ dados, titulo, temMapa, temMalha, musica, livre, fotos = [], sons = [], mostrarFontes = true, avisoIA = true }) => {
  const u = useU();
  const fontes = new Map();
  for (const d of dados) {
    // contas não têm fonte própria; dados informados por quem fez o vídeo aparecem mesmo sem link
    if (!d.url && !d.manual) continue;
    const chave = `${d.fonte}|${d.url || ''}`;
    if (!fontes.has(chave)) fontes.set(chave, { fonte: d.fonte, url: urlBonita(d.url), data: d.data, manual: !!d.manual });
  }
  return (
    <Palco>
      <Sobe>
        <div style={{ fontSize: 64 * u, fontWeight: 800 }}>{!mostrarFontes || (livre && !fontes.size) ? 'Aviso' : 'Fontes'}</div>
      </Sobe>
      {livre && avisoIA ? (
        <Sobe atraso={4}>
          <div
            style={{
              fontSize: 40 * u,
              fontWeight: 700,
              lineHeight: 1.3,
              color: COR.destaque,
              border: `${3 * u}px solid ${COR.destaque}`,
              borderRadius: 18 * u,
              padding: `${18 * u}px ${24 * u}px`
            }}
          >
            {fontes.size && mostrarFontes
              ? '✍️ Texto escrito com IA. Só as datas e os números abaixo foram conferidos.'
              : fontes.size
                ? '✍️ Texto escrito com IA. Só as datas e os números foram conferidos.'
                : '✍️ Texto escrito com IA, sem fonte conferida.'}
          </div>
        </Sobe>
      ) : null}
      {mostrarFontes ? (
        <>
      <Sobe atraso={6}>
        <div style={{ fontSize: 34 * u, color: COR.suave }}>{titulo}</div>
      </Sobe>
      {[...fontes.values()].map((f, i) => (
        <Sobe key={`${f.fonte}|${f.url}`} atraso={10 + i * 4}>
          <div style={{ fontSize: 36 * u, lineHeight: 1.3 }}>
            <b>{f.fonte}</b> · {f.data}
            <div style={{ fontSize: 26 * u, color: COR.suave, wordBreak: 'break-all' }}>
              {f.url ? f.url.replace(/^https:\/\//, '') : ''}
              {f.manual ? (f.url ? ' · ' : '') + 'informado por quem fez o vídeo' : ''}
            </div>
          </div>
        </Sobe>
      ))}
      {fotos.length ? (
        <Sobe atraso={24}>
          <div style={{ fontSize: 26 * u, color: COR.suave, lineHeight: 1.35 }}>
            <b style={{ color: COR.texto }}>Fotos:</b>{' '}
            {[...new Map(fotos.map(f => [f.pagina, f])).values()]
              .map(f => `${f.autor} (${f.licenca}, ${f.fonte || 'Wikimedia Commons'})`)
              .join(' · ')}
          </div>
        </Sobe>
      ) : null}
      {sons.length ? (
        <Sobe atraso={27}>
          <div style={{ fontSize: 26 * u, color: COR.suave, lineHeight: 1.35 }}>
            <b style={{ color: COR.texto }}>Sons (Freesound):</b>{' '}
            {[...new Map(sons.map(s => [s.pagina, s])).values()].map(s => `${s.autor} (${s.licenca})`).join(' · ')}
          </div>
        </Sobe>
      ) : null}
      <Sobe atraso={30}>
        <div style={{ fontSize: 26 * u, color: COR.suave }}>
          {livre
            ? fontes.size
              ? 'Só as datas e os números acima foram conferidos (na fonte indicada ou informados por quem fez o vídeo).'
              : 'Nenhum número ou data deste vídeo foi conferido numa fonte.'
            : `Dados públicos. Números conferidos automaticamente antes do vídeo. ${formata(dados.length)} dados usados.`}
          {temMapa ? ' Mapa: svg-maps/brazil (CC BY 4.0).' : ''}
          {temMalha ? ' Municípios: malhas territoriais do IBGE.' : ''}
          {musica && musica !== 'nenhuma' ? ' Trilha gerada pelo próprio modelo.' : ''}
        </div>
      </Sobe>
        </>
      ) : null}
    </Palco>
  );
};

/* Cena "animacao": desenho feito pelo código da IA (src/animacao.js). Se o código der erro em qualquer quadro, a cena mostra só o
   título, como a cena texto (o vídeo nunca para por causa dela). */
const compiladas = new Map();
class Guarda extends React.Component {
  constructor(p) {
    super(p);
    this.state = { erro: false };
  }
  static getDerivedStateFromError() {
    return { erro: true };
  }
  render() {
    return this.state.erro ? this.props.reserva : this.props.children;
  }
}
export const Animacao = ({ cena, dados }) => {
  const u = useU();
  const vertical = useVertical();
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();
  const reserva = <Texto cena={{ texto: cena.titulo }} />;
  const L = width - 180 * u,
    A = vertical ? height - 900 * u : height - 520 * u;
  let el = null;
  try {
    if (!compiladas.has(cena.codigo)) compiladas.set(cena.codigo, compila(cena.codigo));
    const { api, ehPeca } = montaApi({
      f: frame,
      fps,
      dur: cena.frames || 4 * fps,
      L,
      A,
      u,
      vertical,
      cor: { ...COR, barras: [...COR.barras] },
      tabela: Object.values(dados),
      ids: cena.dados || [],
      criar: React.createElement,
      spring
    });
    const r = compiladas.get(cena.codigo)(api);
    if (ehPeca(r)) el = r;
  } catch (e) {
    console.error('Animação da IA com erro:', e && e.message);
  }
  if (!el) return reserva;
  return (
    <Palco>
      <Cabeca texto={cena.titulo} />
      <div style={{ width: L, height: A, position: 'relative', overflow: 'hidden', flex: 'none' }}>
        <Guarda reserva={null}>{el}</Guarda>
      </div>
      <Rodape lista={lista(cena, dados)} />
    </Palco>
  );
};
