// Moldura de cada cena: imagem de fundo com movimento lento (Ken Burns), entrada/saída (transição) e legenda.
// As transições acontecem DENTRO da cena (não sobrepõem a próxima), então a voz continua no tempo certo.
import { AbsoluteFill, Img, interpolate, spring, staticFile, useCurrentFrame, useVideoConfig } from 'remotion';
import { COR } from './estilo.js';
import { Legenda } from './Legenda.jsx';

export const TRANSICOES = ['deslizar', 'zoom', 'subir', 'corte'];

/** Crédito da foto do Wikimedia Commons, pequeno, no pé da tela (abaixo da legenda) */
const Credito = ({ foto }) => {
  const { width, height } = useVideoConfig();
  const u = Math.min(width, height) / 1080;
  return (
    <div
      style={{
        position: 'absolute',
        left: 40 * u,
        right: 40 * u,
        bottom: 26 * u,
        fontSize: 22 * u,
        color: '#fff',
        opacity: 0.85,
        textShadow: '0 1px 3px #000',
        whiteSpace: 'nowrap',
        overflow: 'hidden',
        textOverflow: 'ellipsis'
      }}
    >
      Foto: {foto.autor} · {foto.licenca} · Wikimedia Commons
    </div>
  );
};

const Fundo = ({ imagem, indice }) => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();
  const p = frame / Math.max(1, durationInFrames);
  const lado = indice % 2 ? 1 : -1; // alterna a direção do movimento entre as cenas
  return (
    <AbsoluteFill>
      <Img
        src={staticFile(`fundos/${imagem}`)}
        style={{
          width: '100%',
          height: '100%',
          objectFit: 'cover',
          transform: `scale(${1.08 + 0.12 * p}) translateX(${lado * (p - 0.5) * 4}%)`
        }}
      />
      <AbsoluteFill
        style={{
          background: `linear-gradient(180deg, ${COR.fundo}cc 0%, ${COR.fundo}88 35%, ${COR.fundo}bb 65%, ${COR.fundo}f2 100%)`
        }}
      />
    </AbsoluteFill>
  );
};

const igual = (a, b) =>
  String(a || '').replace(/\W+/g, ' ').trim().toLowerCase() === String(b || '').replace(/\W+/g, ' ').trim().toLowerCase();

export const Cena = ({ cena, indice, legenda, children }) => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames, width } = useVideoConfig();
  const tipo = TRANSICOES.includes(cena.transicao) ? cena.transicao : TRANSICOES[indice % TRANSICOES.length];
  const e = spring({ frame, fps, config: { damping: 18, stiffness: 140 } });
  const saida = interpolate(frame, [durationInFrames - 6, durationInFrames], [1, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp'
  });
  const mov =
    indice === 0 || tipo === 'corte'
      ? ''
      : tipo === 'deslizar'
        ? `translateX(${(1 - e) * width * 0.35}px)`
        : tipo === 'subir'
          ? `translateY(${(1 - e) * width * 0.25}px)`
          : `scale(${1.25 - 0.25 * e})`;
  const flash = tipo === 'corte' && indice > 0 ? interpolate(frame, [0, 5], [0.7, 0], { extrapolateRight: 'clamp' }) : 0;
  // na cena de texto a legenda repetiria o que já está escrito na tela
  const comLegenda = legenda && !(cena.tipo === 'texto' && igual(cena.texto, cena.narracao));
  return (
    <AbsoluteFill>
      {cena.imagem ? <Fundo imagem={cena.imagem} indice={indice} /> : null}
      <AbsoluteFill style={{ transform: mov, opacity: (indice === 0 || tipo === 'corte' ? 1 : Math.min(1, e * 1.6)) * saida }}>
        {children}
      </AbsoluteFill>
      {comLegenda ? <Legenda palavras={cena.palavras} /> : null}
      {cena.imagem && cena.foto ? <Credito foto={cena.foto} /> : null}
      {flash ? <AbsoluteFill style={{ background: '#fff', opacity: flash }} /> : null}
    </AbsoluteFill>
  );
};
