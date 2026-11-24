import '@fontsource/inter/400.css';
import '@fontsource/inter/600.css';
import '@fontsource/inter/700.css';
import '@fontsource/inter/800.css';
import '@fontsource/space-grotesk/400.css';
import '@fontsource/space-grotesk/600.css';
import '@fontsource/space-grotesk/700.css';
import '@fontsource/merriweather/400.css';
import '@fontsource/merriweather/700.css';
import '@fontsource/merriweather/900.css';
import '@fontsource/nunito/400.css';
import '@fontsource/nunito/600.css';
import '@fontsource/nunito/700.css';
import '@fontsource/nunito/800.css';
import { AbsoluteFill, Sequence, useCurrentFrame, useVideoConfig } from 'remotion';
import { COR, aplicaTema } from './estilo.js';
import { Cena } from './Cena.jsx';
import {
  Barras,
  Comparacao,
  Fontes,
  Icones,
  Linha,
  LinhaTempo,
  Lista,
  Mapa,
  Numero,
  Ranking,
  Texto,
  Titulo
} from './cenas/index.jsx';

const CENAS = {
  titulo: Titulo,
  numero: Numero,
  barras: Barras,
  linha: Linha,
  texto: Texto,
  ranking: Ranking,
  comparacao: Comparacao,
  mapa: Mapa,
  icones: Icones,
  linhaTempo: LinhaTempo,
  lista: Lista
};

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

/* Fundo que se mexe devagar (sem imagem): duas manchas de cor girando */
const FundoVivo = () => {
  const frame = useCurrentFrame();
  const a = frame / 90;
  return (
    <AbsoluteFill
      style={{
        background: `radial-gradient(circle at ${50 + 30 * Math.cos(a)}% ${20 + 15 * Math.sin(a)}%, ${COR.destaque}26, transparent 55%),
          radial-gradient(circle at ${50 - 30 * Math.cos(a * 0.7)}% ${80 - 10 * Math.sin(a * 0.7)}%, ${COR.brilho}1c, transparent 50%)`
      }}
    />
  );
};

export const Video = props => {
  const { fps } = useVideoConfig();
  const tema = aplicaTema(props.tema); // antes de desenhar as cenas: todas leem as cores de COR
  const dados = Object.fromEntries((props.dados || []).map(d => [d.id, d]));
  const legenda = props.legenda !== false;
  let inicio = 0;
  const partes = props.cenas.map((c, i) => {
    const dur = c.frames || 4 * fps;
    const Conteudo = CENAS[c.tipo] || Texto;
    const seq = (
      <Sequence key={i} from={inicio} durationInFrames={dur} name={`${i + 1}. ${c.tipo}`}>
        <Cena cena={c} indice={i} legenda={legenda}>
          <Conteudo cena={c} dados={dados} />
        </Cena>
      </Sequence>
    );
    inicio += dur;
    return seq;
  });
  return (
    <AbsoluteFill style={{ background: COR.fundo, color: COR.texto, fontFamily: `'${tema.fonte}', Inter, sans-serif` }}>
      <FundoVivo />
      {partes}
      <Sequence from={inicio} name="fontes">
        <Cena cena={{ tipo: 'fontes', transicao: 'subir' }} indice={1} legenda={false}>
          <Fontes
            dados={props.dados || []}
            titulo={props.titulo}
            temMapa={props.cenas.some(c => c.tipo === 'mapa')}
            musica={props.musica}
            livre={!!props.livre}
            fotos={props.cenas.filter(c => c.foto && c.imagem).map(c => c.foto)}
          />
        </Cena>
      </Sequence>
      <Progresso />
    </AbsoluteFill>
  );
};
