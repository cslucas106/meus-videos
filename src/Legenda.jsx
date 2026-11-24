// Legenda animada: mostra 2 a 4 palavras por vez e acende a palavra que está sendo falada.
// Os tempos vêm do Edge TTS (cena.palavras), então a legenda anda junto com a voz.
import { spring, useCurrentFrame, useVideoConfig } from 'remotion';
import { COR } from './estilo.js';
import { useU, useVertical } from './base.jsx';

const MAX_PALAVRAS = 4;

/** Agrupa as palavras em blocos curtos, quebrando em pausa ou pontuação. */
export function blocos(palavras) {
  const out = [];
  let atual = [];
  for (const p of palavras || []) {
    const [ini] = p;
    const ultimo = atual[atual.length - 1];
    if (atual.length && (atual.length >= MAX_PALAVRAS || ini - ultimo[1] > 0.3 || /[.!?;:,]$/.test(ultimo[2]))) {
      out.push(atual);
      atual = [];
    }
    atual.push(p);
  }
  if (atual.length) out.push(atual);
  return out.map(b => ({ ini: b[0][0], fim: b[b.length - 1][1], palavras: b }));
}

export const Legenda = ({ palavras }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const u = useU();
  const vertical = useVertical();
  const t = frame / fps;
  const bs = blocos(palavras);
  // o bloco atual fica na tela até o próximo começar (sem piscar entre as palavras)
  let i = -1;
  for (let k = 0; k < bs.length; k++) if (bs[k].ini <= t + 0.05) i = k;
  if (i < 0) return null;
  const b = bs[i];
  if (t > b.fim + 0.6 && i === bs.length - 1) return null;
  const pop = spring({ frame: frame - Math.round(b.ini * fps), fps, config: { damping: 14, stiffness: 180 } });
  return (
    <div
      style={{
        position: 'absolute',
        left: 60 * u,
        right: 60 * u,
        bottom: (vertical ? 330 : 90) * u,
        display: 'flex',
        flexWrap: 'wrap',
        justifyContent: 'center',
        gap: `${10 * u}px ${16 * u}px`,
        transform: `scale(${0.85 + 0.15 * pop})`,
        opacity: Math.min(1, pop * 1.5)
      }}
    >
      {b.palavras.map(([ini, fim, txt], k) => {
        const falando = t >= ini && (t < fim || k === b.palavras.length - 1);
        const dita = t >= ini;
        return (
          <span
            key={k}
            style={{
              fontSize: (vertical ? 66 : 58) * u,
              fontWeight: 800,
              lineHeight: 1.15,
              padding: `${2 * u}px ${12 * u}px`,
              borderRadius: 14 * u,
              color: falando ? (COR.claro ? '#fff' : '#0b0f17') : dita ? COR.texto : COR.claro ? COR.suave : '#cbd5e1',
              background: falando ? COR.destaque : 'transparent',
              textShadow: falando
                ? 'none'
                : `0 ${4 * u}px ${18 * u}px ${COR.claro ? 'rgba(255,255,255,.9)' : 'rgba(0,0,0,.85)'}`,
              textTransform: 'uppercase'
            }}
          >
            {txt}
          </span>
        );
      })}
    </div>
  );
};
