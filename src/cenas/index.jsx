import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from 'remotion';
import { COR, comUnidade, curto, formata } from '../estilo.js';

// "u" é a unidade de tamanho: 1/1080 do lado menor do vídeo.
const useU = () => {
  const { width, height } = useVideoConfig();
  return Math.min(width, height) / 1080;
};

const useEntrada = (atraso = 0) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  return spring({ frame: frame - atraso, fps, config: { damping: 200 } });
};

const Palco = ({ children }) => {
  const u = useU();
  return (
    <AbsoluteFill
      style={{ padding: 90 * u, justifyContent: 'center', gap: 40 * u, display: 'flex', flexDirection: 'column' }}
    >
      {children}
    </AbsoluteFill>
  );
};

const Sobe = ({ atraso = 0, children, style }) => {
  const u = useU();
  const e = useEntrada(atraso);
  return <div style={{ opacity: e, transform: `translateY(${(1 - e) * 40 * u}px)`, ...style }}>{children}</div>;
};

const Rodape = ({ lista }) => {
  const u = useU();
  const fontes = [...new Set(lista.filter(Boolean).map(d => `${d.fonte} (${d.data})`))];
  if (!fontes.length) return null;
  return (
    <Sobe atraso={12} style={{ position: 'absolute', left: 90 * u, right: 90 * u, bottom: 70 * u }}>
      <div style={{ fontSize: 28 * u, color: COR.suave }}>Fonte: {fontes.join(' · ')}</div>
    </Sobe>
  );
};

const Cabeca = ({ texto }) => {
  const u = useU();
  if (!texto) return null;
  return (
    <Sobe>
      <div style={{ fontSize: 60 * u, fontWeight: 800, lineHeight: 1.15 }}>{texto}</div>
    </Sobe>
  );
};

export const Titulo = ({ cena }) => {
  const u = useU();
  const e = useEntrada();
  return (
    <Palco>
      <div style={{ width: 120 * u * e, height: 10 * u, background: COR.destaque, borderRadius: 10 * u }} />
      <Sobe>
        <div style={{ fontSize: 96 * u, fontWeight: 800, lineHeight: 1.05 }}>{cena.titulo}</div>
      </Sobe>
      {cena.subtitulo ? (
        <Sobe atraso={10}>
          <div style={{ fontSize: 44 * u, color: COR.suave, lineHeight: 1.3 }}>{cena.subtitulo}</div>
        </Sobe>
      ) : null}
    </Palco>
  );
};

export const Numero = ({ cena, dados }) => {
  const u = useU();
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const d = dados[cena.dado];
  if (!d) return null;
  const conta = interpolate(frame, [0, 1.2 * fps], [0, 1], {
    extrapolateRight: 'clamp',
    easing: t => 1 - Math.pow(1 - t, 3)
  });
  const final = conta >= 1;
  return (
    <Palco>
      <Sobe>
        <div style={{ fontSize: 48 * u, color: COR.suave, lineHeight: 1.25 }}>{cena.titulo || d.rotulo}</div>
      </Sobe>
      <div
        style={{
          fontSize: 150 * u,
          fontWeight: 800,
          color: COR.destaque,
          fontVariantNumeric: 'tabular-nums',
          lineHeight: 1
        }}
      >
        {final ? comUnidade(d) : comUnidade(d, d.valor * conta).replace(/,\d+/, '')}
      </div>
      {d.unidade && !['%', 'R$'].includes(d.unidade) ? (
        <Sobe atraso={8}>
          <div style={{ fontSize: 48 * u, color: COR.texto }}>{d.unidade}</div>
        </Sobe>
      ) : null}
      <Rodape lista={[d]} />
    </Palco>
  );
};

export const Barras = ({ cena, dados }) => {
  const u = useU();
  const lista = (cena.dados || []).map(id => dados[id]).filter(Boolean);
  const max = Math.max(...lista.map(d => Math.abs(d.valor)), 1);
  return (
    <Palco>
      <Cabeca texto={cena.titulo} />
      <div style={{ display: 'flex', flexDirection: 'column', gap: 34 * u }}>
        {lista.map((d, i) => (
          <Barra key={d.id} d={d} i={i} max={max} />
        ))}
      </div>
      <Rodape lista={lista} />
    </Palco>
  );
};

const Barra = ({ d, i, max }) => {
  const u = useU();
  const e = useEntrada(6 + i * 6);
  const cor = COR.barras[i % COR.barras.length];
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 * u, opacity: Math.min(1, e * 2) }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 36 * u, gap: 20 * u }}>
        <span>{d.rotuloCurto || d.rotulo}</span>
        <b style={{ fontVariantNumeric: 'tabular-nums' }}>{comUnidade(d)}</b>
      </div>
      <div style={{ height: 40 * u, background: COR.cartao, borderRadius: 12 * u, overflow: 'hidden' }}>
        <div
          style={{
            height: '100%',
            width: `${(Math.abs(d.valor) / max) * 100 * e}%`,
            background: cor,
            borderRadius: 12 * u
          }}
        />
      </div>
    </div>
  );
};

export const Linha = ({ cena, dados }) => {
  const u = useU();
  const { width } = useVideoConfig();
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const lista = (cena.dados || []).map(id => dados[id]).filter(Boolean);
  const L = width - 180 * u;
  const A = 520 * u;
  const vals = lista.map(d => d.valor);
  const min = Math.min(...vals);
  const max = Math.max(...vals);
  const pad = (max - min) * 0.15 || Math.abs(max) * 0.1 || 1;
  const y = v => A - ((v - (min - pad)) / (max + pad - (min - pad))) * A;
  const x = i => (lista.length === 1 ? L / 2 : (i / (lista.length - 1)) * L);
  const pts = lista.map((d, i) => [x(i), y(d.valor)]);
  let comp = 0;
  for (let i = 1; i < pts.length; i++) comp += Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]);
  const p = interpolate(frame, [6, 6 + 1.5 * fps], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
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
        {lista.map((d, i) => {
          const vis = p >= (lista.length === 1 ? 0 : i / (lista.length - 1)) ? 1 : 0;
          return (
            <g key={d.id} opacity={vis}>
              <circle cx={pts[i][0]} cy={pts[i][1]} r={12 * u} fill={COR.destaque} />
              <text
                x={pts[i][0]}
                y={pts[i][1] - 30 * u}
                fill={COR.texto}
                fontSize={32 * u}
                fontWeight={700}
                textAnchor={i === 0 ? 'start' : i === lista.length - 1 ? 'end' : 'middle'}
              >
                {d.unidade === '%' || d.unidade === 'R$' ? comUnidade(d) : curto(d.valor)}
              </text>
              <text
                x={pts[i][0]}
                y={A + 60 * u}
                fill={COR.suave}
                fontSize={28 * u}
                textAnchor={i === 0 ? 'start' : i === lista.length - 1 ? 'end' : 'middle'}
              >
                {d.x ?? d.rotuloCurto ?? d.rotulo}
              </text>
            </g>
          );
        })}
      </svg>
      <Rodape lista={lista} />
    </Palco>
  );
};

export const Texto = ({ cena }) => {
  const u = useU();
  return (
    <Palco>
      <Sobe>
        <div style={{ fontSize: 70 * u, fontWeight: 600, lineHeight: 1.25 }}>{cena.texto || cena.titulo}</div>
      </Sobe>
    </Palco>
  );
};

export const Fontes = ({ dados, titulo }) => {
  const u = useU();
  const fontes = new Map();
  for (const d of dados) {
    if (!d.url) continue;
    const chave = `${d.fonte}|${d.url}`;
    if (!fontes.has(chave)) fontes.set(chave, { fonte: d.fonte, url: d.url, data: d.data });
  }
  return (
    <Palco>
      <Sobe>
        <div style={{ fontSize: 64 * u, fontWeight: 800 }}>Fontes</div>
      </Sobe>
      <Sobe atraso={6}>
        <div style={{ fontSize: 34 * u, color: COR.suave }}>{titulo}</div>
      </Sobe>
      {[...fontes.values()].map((f, i) => (
        <Sobe key={f.url} atraso={10 + i * 4}>
          <div style={{ fontSize: 36 * u, lineHeight: 1.3 }}>
            <b>{f.fonte}</b> · {f.data}
            <div style={{ fontSize: 26 * u, color: COR.suave, wordBreak: 'break-all' }}>
              {f.url.replace(/^https:\/\//, '')}
            </div>
          </div>
        </Sobe>
      ))}
      <Sobe atraso={30}>
        <div style={{ fontSize: 26 * u, color: COR.suave }}>
          Dados públicos. Números conferidos automaticamente antes do vídeo. {formata(dados.length)} dados usados.
        </div>
      </Sobe>
    </Palco>
  );
};
