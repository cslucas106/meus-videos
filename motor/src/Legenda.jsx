// Legenda: anda junto com a voz (os tempos vêm do Edge TTS, cena.palavras). Estilos (pedido.legenda):
//   animada (true também): 2 a 4 palavras por vez, a palavra falada acende
//   simples: uma linha de até 7 palavras numa faixa escura, sem animação (legenda de TV)
//   grande:  uma palavra por vez, bem grande (estilo TikTok)
//   caixa:   2 a 4 palavras numa caixa da cor do cartão, a palavra falada muda de cor
import { spring, useCurrentFrame, useVideoConfig } from 'remotion';
import { COR } from './estilo.js';
import { useU, useVertical } from './base.jsx';

const MAX_PALAVRAS = 4;
export const ESTILOS_LEGENDA = ['animada', 'simples', 'grande', 'caixa'];
/** true (pedidos antigos) ou nome desconhecido = animada */
export const estiloLegenda = l => (ESTILOS_LEGENDA.includes(l) ? l : 'animada');
const MAX_POR_ESTILO = { animada: 4, caixa: 4, simples: 7, grande: 1 };

/** Agrupa as palavras em blocos curtos, quebrando em pausa ou pontuação. */
export function blocos(palavras, max = MAX_PALAVRAS) {
  const out = [];
  let atual = [];
  for (const p of palavras || []) {
    const [ini] = p;
    const ultimo = atual[atual.length - 1];
    if (atual.length && (atual.length >= max || ini - ultimo[1] > 0.3 || /[.!?;:,]$/.test(ultimo[2]))) {
      out.push(atual);
      atual = [];
    }
    atual.push(p);
  }
  if (atual.length) out.push(atual);
  return out.map(b => ({ ini: b[0][0], fim: b[b.length - 1][1], palavras: b }));
}

export const Legenda = ({ palavras, estilo }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const u = useU();
  const vertical = useVertical();
  const est = estiloLegenda(estilo);
  const t = frame / fps;
  const bs = blocos(palavras, MAX_POR_ESTILO[est]);
  // o bloco atual fica na tela até o próximo começar (sem piscar entre as palavras)
  let i = -1;
  for (let k = 0; k < bs.length; k++) if (bs[k].ini <= t + 0.05) i = k;
  if (i < 0) return null;
  const b = bs[i];
  if (t > b.fim + 0.6 && i === bs.length - 1) return null;
  const pop = spring({ frame: frame - Math.round(b.ini * fps), fps, config: { damping: 14, stiffness: 180 } });
  const sombra = `0 ${4 * u}px ${18 * u}px ${COR.claro ? 'rgba(255,255,255,.9)' : 'rgba(0,0,0,.85)'}`;
  const caixaBase = {
    position: 'absolute',
    left: 60 * u,
    right: 60 * u,
    bottom: (vertical ? 330 : 90) * u,
    display: 'flex',
    flexWrap: 'wrap',
    justifyContent: 'center'
  };
  if (est === 'simples')
    return (
      <div style={{ ...caixaBase, left: 40 * u, right: 40 * u }}>
        <span
          style={{
            fontSize: (vertical ? 46 : 42) * u,
            fontWeight: 600,
            lineHeight: 1.3,
            textAlign: 'center',
            color: '#fff',
            background: 'rgba(0,0,0,.62)',
            padding: `${8 * u}px ${18 * u}px`,
            borderRadius: 10 * u
          }}
        >
          {b.palavras.map(p => p[2]).join(' ')}
        </span>
      </div>
    );
  if (est === 'grande')
    return (
      <div
        style={{
          ...caixaBase,
          bottom: (vertical ? 380 : 110) * u,
          transform: `scale(${0.6 + 0.4 * pop})`,
          opacity: Math.min(1, pop * 2)
        }}
      >
        <span
          style={{
            fontSize: (vertical ? 120 : 96) * u,
            fontWeight: 900,
            lineHeight: 1,
            color: COR.destaque,
            textShadow: sombra,
            WebkitTextStroke: `${3 * u}px ${COR.claro ? '#fff' : '#000'}`,
            textTransform: 'uppercase'
          }}
        >
          {b.palavras[0][2]}
        </span>
      </div>
    );
  const caixa = est === 'caixa';
  return (
    <div
      style={{
        ...caixaBase,
        gap: `${10 * u}px ${16 * u}px`,
        transform: `scale(${0.85 + 0.15 * pop})`,
        opacity: Math.min(1, pop * 1.5),
        ...(caixa
          ? {
              left: 80 * u,
              right: 80 * u,
              gap: `${4 * u}px ${12 * u}px`,
              padding: `${14 * u}px ${18 * u}px`,
              background: COR.cartao,
              border: `${3 * u}px solid ${COR.borda}`,
              borderRadius: 22 * u
            }
          : {})
      }}
    >
      {b.palavras.map(([ini, fim, txt], k) => {
        const falando = t >= ini && (t < fim || k === b.palavras.length - 1);
        const dita = t >= ini;
        return (
          <span
            key={k}
            style={
              caixa
                ? {
                    fontSize: (vertical ? 58 : 50) * u,
                    fontWeight: 800,
                    lineHeight: 1.15,
                    color: falando ? COR.destaque : COR.texto,
                    textTransform: 'uppercase'
                  }
                : {
                    fontSize: (vertical ? 66 : 58) * u,
                    fontWeight: 800,
                    lineHeight: 1.15,
                    padding: `${2 * u}px ${12 * u}px`,
                    borderRadius: 14 * u,
                    color: falando ? (COR.claro ? '#fff' : '#0b0f17') : dita ? COR.texto : COR.claro ? COR.suave : '#cbd5e1',
                    background: falando ? COR.destaque : 'transparent',
                    textShadow: falando ? 'none' : sombra,
                    textTransform: 'uppercase'
                  }
            }
          >
            {txt}
          </span>
        );
      })}
    </div>
  );
};
