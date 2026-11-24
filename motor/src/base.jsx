// Peças comuns das cenas: tamanho relativo, palco, entradas animadas, rodapé de fonte e o "momento" em que a voz fala o número.
import { AbsoluteFill, spring, useCurrentFrame, useVideoConfig } from 'remotion';
import { COR } from './estilo.js';

/** "u" é a unidade de tamanho: 1/1080 do lado menor do vídeo. */
export const useU = () => {
  const { width, height } = useVideoConfig();
  return Math.min(width, height) / 1080;
};
export const useVertical = () => {
  const { width, height } = useVideoConfig();
  return height > width;
};

/** Mola de entrada (0 → 1) a partir de "atraso" quadros. */
export const useEntrada = (atraso = 0, rigidez = 200) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  return spring({ frame: frame - atraso, fps, config: { damping: rigidez } });
};

/**
 * Quadro em que a narração chega ao primeiro número (para a animação acontecer junto com a fala).
 * cena.palavras = [[início, fim, "palavra"], ...] em segundos, gravado pelo scripts/narrar.py.
 */
export const momentoNumero = (cena, fps, n = 0) => {
  const comNumero = (cena.palavras || []).filter(p => /\d/.test(p[2]));
  const p = comNumero[Math.min(n, comNumero.length - 1)];
  return Math.max(0, Math.round((p ? p[0] : 0.3) * fps) - 4);
};

/** Área das cenas: deixa espaço embaixo para a legenda. */
export const Palco = ({ children, centro = false }) => {
  const u = useU();
  const vertical = useVertical();
  return (
    <AbsoluteFill
      style={{
        padding: `${(vertical ? 220 : 110) * u}px ${90 * u}px ${(vertical ? 520 : 230) * u}px`,
        justifyContent: 'center',
        alignItems: centro ? 'center' : 'stretch',
        textAlign: centro ? 'center' : 'left',
        gap: 36 * u,
        display: 'flex',
        flexDirection: 'column'
      }}
    >
      {children}
    </AbsoluteFill>
  );
};

export const Sobe = ({ atraso = 0, children, style }) => {
  const u = useU();
  const e = useEntrada(atraso);
  return <div style={{ opacity: e, transform: `translateY(${(1 - e) * 40 * u}px)`, ...style }}>{children}</div>;
};

/** Fonte pequena no alto da tela (embaixo fica a legenda). */
export const Rodape = ({ lista }) => {
  const u = useU();
  const vertical = useVertical();
  const fontes = [...new Set(lista.filter(Boolean).map(d => `${d.fonte} (${d.data})`))];
  if (!fontes.length) return null;
  return (
    <Sobe
      atraso={10}
      style={{ position: 'absolute', left: 90 * u, right: 90 * u, top: (vertical ? 80 : 40) * u }}
    >
      <div style={{ fontSize: 26 * u, color: COR.suave }}>Fonte: {fontes.join(' · ')}</div>
    </Sobe>
  );
};

export const Cabeca = ({ texto }) => {
  const u = useU();
  if (!texto) return null;
  return (
    <Sobe>
      <div style={{ fontSize: 62 * u, fontWeight: 800, lineHeight: 1.12 }}>{texto}</div>
    </Sobe>
  );
};
