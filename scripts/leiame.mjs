// Escreve (ou atualiza) o LEIAME.md da pasta de um vídeo ou de uma narração.
//
// Uso: node scripts/leiame.mjs <pasta> [tag] [link] [voz]
//   <pasta>  videos/<nome> ou audios/<nome> (precisa ter o pedido.json)
//   tag/link a versão nova publicada no Release (o workflow passa depois de publicar); sem eles, só refaz o texto
//
// O LEIAME tem o título, as fontes dos dados (só nos vídeos) e a lista de versões (uma linha por Release).
// As versões que já estavam no arquivo continuam; o PocketCode tira a linha quando você apaga um Release pelo app.
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const VOZES = {
  'pt-BR-FranciscaNeural': 'Francisca',
  'pt-BR-AntonioNeural': 'Antonio',
  'pt-BR-ThalitaMultilingualNeural': 'Thalita',
  'pt-PT-RaquelNeural': 'Raquel',
  'pt-PT-DuarteNeural': 'Duarte'
};

/** As linhas de versão que já estão no LEIAME (cada uma começa com "- [" e aponta para /releases/tag/) */
export function versoesDe(texto) {
  return String(texto || '')
    .split('\n')
    .filter(l => /^- \[.*\]\(https:\/\/github\.com\/[^)]+\/releases\/tag\/[^)]+\)/.test(l));
}

/** Uma linha de versão: "- [voz-nome-3](link) · 23/11/2026 18:40 · voz Francisca" */
export function linhaVersao(tag, link, voz, quando = new Date()) {
  const data = quando.toLocaleString('pt-BR', {
    timeZone: 'America/Sao_Paulo',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
  return `- [${tag}](${link}) · ${data.replace(',', '')}${voz ? ' · voz ' + (VOZES[voz] || voz) : ''}`;
}

/** Texto do LEIAME a partir do pedido e das versões */
export function montaLeiame(pedido, versoes) {
  const voz = pedido.tipo === 'voz';
  const l = [`# ${voz ? '🎙️' : '🎬'} ${pedido.titulo || 'Sem título'}`, ''];
  if (voz) {
    l.push('Narração feita pelo modo Mídia do PocketCode AI.', '', '## Texto', '');
    l.push(...String(pedido.texto || '').split('\n').map(x => '> ' + x), '');
  } else {
    l.push('Vídeo feito pelo modo Vídeo do PocketCode AI. O pedido completo está em `pedido.json`.', '');
    const fontes = new Map();
    for (const d of pedido.dados || []) {
      if (!d || d.calculo != null) continue;
      const k = (d.fonte || '?') + '|' + (d.url || '');
      if (!fontes.has(k)) fontes.set(k, { fonte: d.fonte || '?', url: d.url || '', itens: [] });
      fontes.get(k).itens.push((d.rotulo || d.id) + (d.data ? ` (${d.data})` : '') + (d.manual ? ' · informado por quem fez o vídeo' : ''));
    }
    if (fontes.size) {
      l.push('## Fontes dos dados', '');
      for (const f of fontes.values())
        l.push(`- ${f.url ? `[${f.fonte}](${f.url})` : f.fonte}: ${f.itens.join('; ')}`);
      l.push('');
    }
  }
  l.push('## Versões publicadas', '');
  if (versoes.length) l.push(...versoes);
  else l.push('Nenhuma versão publicada no momento (Release apagado ou ainda não gerado).');
  l.push('');
  return l.join('\n');
}

/** Refaz o LEIAME da pasta, acrescentando a versão nova (se veio e ainda não está na lista). Devolve o texto. */
export function atualizaLeiame(pasta, tag, link, voz) {
  const pedido = JSON.parse(readFileSync(join(pasta, 'pedido.json'), 'utf8'));
  const arq = join(pasta, 'LEIAME.md');
  const versoes = versoesDe(existsSync(arq) ? readFileSync(arq, 'utf8') : '');
  if (tag && link && !versoes.some(v => v.includes(`/releases/tag/${tag})`)))
    versoes.push(linhaVersao(tag, link, voz || pedido.voz));
  const texto = montaLeiame(pedido, versoes);
  writeFileSync(arq, texto);
  return texto;
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  const [pasta, tag, link, voz] = process.argv.slice(2);
  if (!pasta) {
    console.error('Uso: node scripts/leiame.mjs <pasta> [tag] [link] [voz]');
    process.exit(1);
  }
  atualizaLeiame(pasta, tag, link, voz);
  console.log(`LEIAME.md atualizado em ${pasta}`);
}
