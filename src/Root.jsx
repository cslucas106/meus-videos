import { Composition } from 'remotion';
import { Video } from './Video.jsx';
import exemplo from '../videos/exemplo/pedido.json';

const TAMANHO = { vertical: [1080, 1920], horizontal: [1920, 1080] };
const FPS = 30;

// A duração de cada cena vem da narração (scripts/narrar.py grava "frames").
// Sem narração (no estúdio), cada cena fica com 4 segundos.
const calcula = ({ props }) => {
  const [width, height] = TAMANHO[props.formato] || TAMANHO.vertical;
  const fps = props.fps || FPS;
  const cenas = props.cenas.reduce((t, c) => t + (c.frames || 4 * fps), 0);
  return { width, height, fps, durationInFrames: Math.max(1, cenas + (props.fontesFrames ?? 5 * fps)) };
};

export const Root = () => (
  <Composition
    id="Video"
    component={Video}
    width={1080}
    height={1920}
    fps={FPS}
    durationInFrames={300}
    defaultProps={exemplo}
    calculateMetadata={calcula}
  />
);
