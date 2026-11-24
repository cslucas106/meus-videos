// Confere a organização do repositório: um item por pasta.
//   videos/<nome>/pedido.json (+ fundos/fundo-N.jpg|png + LEIAME.md)
//   audios/<nome>/pedido.json (+ LEIAME.md)
//   imagens/<nome>/imagem.jpg|png (+ LEIAME.md)
// Todo pedido de vídeo passa nas mesmas regras que o workflow usa (números na tabela, fontes...).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { validaPedido } from '../scripts/regras.mjs';
import { linhaVersao, montaLeiame, versoesDe } from '../scripts/leiame.mjs';

const RAIZ = new URL('../..', import.meta.url).pathname; // a raiz do repositório (o código fica em motor/)
const NOME = /^[a-z0-9][a-z0-9-]{0,59}$/;
const pastas = tipo =>
  existsSync(join(RAIZ, tipo)) ? readdirSync(join(RAIZ, tipo)).filter(n => statSync(join(RAIZ, tipo, n)).isDirectory()) : [];
const ler = (...p) => JSON.parse(readFileSync(join(RAIZ, ...p), 'utf8'));

test('não sobrou pedido na pasta antiga pedidos/', () => {
  const resto = existsSync(join(RAIZ, 'pedidos')) ? readdirSync(join(RAIZ, 'pedidos')) : [];
  assert.deepEqual(resto, [], 'mova para videos/<nome>/ ou audios/<nome>/');
});

test('videos/: cada pasta tem um pedido de vídeo válido e só arquivos conhecidos', () => {
  assert.ok(pastas('videos').includes('exemplo'), 'videos/exemplo é o teste do workflow');
  for (const n of pastas('videos')) {
    assert.match(n, NOME, `nome de pasta inválido: videos/${n}`);
    const p = ler('videos', n, 'pedido.json');
    assert.notEqual(p.tipo, 'voz', `videos/${n} é uma narração (vai em audios/)`);
    assert.deepEqual(validaPedido(p).erros, [], `videos/${n}/pedido.json`);
    for (const a of readdirSync(join(RAIZ, 'videos', n)))
      assert.ok(['pedido.json', 'LEIAME.md', 'fundos', 'sons'].includes(a), `arquivo estranho em videos/${n}: ${a}`);
    if (existsSync(join(RAIZ, 'videos', n, 'fundos')))
      for (const f of readdirSync(join(RAIZ, 'videos', n, 'fundos')))
        assert.match(f, /^(fundo|foto)-\d{1,2}\.(jpg|png)$/, `videos/${n}/fundos/${f}`);
    if (existsSync(join(RAIZ, 'videos', n, 'sons')))
      for (const f of readdirSync(join(RAIZ, 'videos', n, 'sons')))
        assert.match(f, /^som-\d{1,2}\.mp3$/, `videos/${n}/sons/${f}`);
  }
});

test('audios/: cada pasta tem um pedido de narração', () => {
  for (const n of pastas('audios')) {
    assert.match(n, NOME, `nome de pasta inválido: audios/${n}`);
    const p = ler('audios', n, 'pedido.json');
    assert.equal(p.tipo, 'voz', `audios/${n}`);
    assert.ok(typeof p.texto === 'string' && p.texto.trim() && p.texto.length <= 3000, `audios/${n}: texto`);
    for (const a of readdirSync(join(RAIZ, 'audios', n)))
      assert.ok(['pedido.json', 'LEIAME.md'].includes(a), `arquivo estranho em audios/${n}: ${a}`);
  }
});

test('imagens/: cada pasta tem uma imagem e o LEIAME', () => {
  for (const n of pastas('imagens')) {
    assert.match(n, NOME, `nome de pasta inválido: imagens/${n}`);
    const arqs = readdirSync(join(RAIZ, 'imagens', n));
    assert.equal(arqs.filter(a => /^imagem\.(jpg|png)$/.test(a)).length, 1, `imagens/${n}: imagem.jpg ou imagem.png`);
    for (const a of arqs) assert.match(a, /^(imagem\.(jpg|png)|LEIAME\.md)$/, `arquivo estranho em imagens/${n}: ${a}`);
  }
});

test('LEIAME: título, fontes e uma linha por versão (sem repetir)', () => {
  const p = ler('videos', 'exemplo', 'pedido.json');
  const l1 = linhaVersao('video-x-3', 'https://github.com/a/b/releases/tag/video-x-3', 'pt-BR-AntonioNeural', new Date('2026-11-23T21:40:00Z'));
  assert.equal(l1, '- [video-x-3](https://github.com/a/b/releases/tag/video-x-3) · 23/11/2026 18:40 · voz Antonio');
  const t = montaLeiame(p, [l1]);
  assert.match(t, /^# 🎬 Fortaleza em números/);
  assert.match(t, /## Fontes dos dados/);
  assert.deepEqual(versoesDe(t), [l1]);
  assert.match(montaLeiame({ tipo: 'voz', titulo: 'Oi', texto: 'a\nb' }, []), /> a\n> b[\s\S]*Nenhuma versão publicada/);
});
