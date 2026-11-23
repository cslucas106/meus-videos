import '@fontsource/inter/400.css';
import '@fontsource/inter/600.css';
import '@fontsource/inter/800.css';
import { AbsoluteFill, Sequence, useCurrentFrame, useVideoConfig } from 'remotion';
import { COR } from './estilo.js';
import { Barras, Fontes, Linha, Numero, Texto, Titulo } from './cenas/index.jsx';

const CENAS = { titulo: Titulo, numero: Numero, barras: Barras, linha: Linha, texto: Texto };

const Progresso = () => {
  const frame = useCurrentFrame();
  const { durationInFrames, width } = useVideoConfig();
  return (
    <div
      style={{
        position: 'absolute',
        left: 0,
        bottom: 0,
        height: Math.round(width / 180),
        width: `${(frame / durationInFrames) * 100}%`,
        background: COR.destaque
      }}
    />
  );
};

export const Video = props => {
  const { fps } = useVideoConfig();
  const dados = Object.fromEntries((props.dados || []).map(d => [d.id, d]));
  let inicio = 0;
  const partes = props.cenas.map((c, i) => {
    const dur = c.frames || 4 * fps;
    const Cena = CENAS[c.tipo] || Texto;
    const seq = (
      <Sequence key={i} from={inicio} durationInFrames={dur} name={`${i + 1}. ${c.tipo}`}>
        <Cena cena={c} dados={dados} />
      </Sequence>
    );
    inicio += dur;
    return seq;
  });
  return (
    <AbsoluteFill style={{ background: COR.fundo, color: COR.texto, fontFamily: 'Inter, sans-serif' }}>
      <AbsoluteFill
        style={{ background: `radial-gradient(circle at 20% 0%, ${COR.destaque}22, transparent 55%)` }}
      />
      {partes}
      <Sequence from={inicio} name="fontes">
        <Fontes dados={props.dados || []} titulo={props.titulo} />
      </Sequence>
      <Progresso />
    </AbsoluteFill>
  );
};
