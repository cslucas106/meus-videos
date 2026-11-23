# meus-videos

Vídeos curtos com **dados públicos** (IBGE, Banco Central, Banco Mundial…), montados pelo
[PocketCode AI](https://github.com/cslucas106) no celular e renderizados aqui, de graça, no GitHub Actions.

## Como funciona

1. No modo **Vídeo** do PocketCode, você pede o vídeo. A IA busca os dados nas fontes liberadas
   e escreve o roteiro. Você confere a tabela e aprova.
2. O app grava `videos/<nome>/pedido.json` aqui (com as imagens de fundo em `videos/<nome>/fundos/`) e dispara o workflow **Gerar vídeo**.
3. O workflow:
   - **confere os números** (`scripts/verifica.mjs`): todo número falado ou escrito precisa estar
     na tabela de dados, com fonte, link e data. Se não estiver, o vídeo não é gerado;
   - **gera a narração** com as vozes grátis do Microsoft Edge (`scripts/narrar.py`). A duração de
     cada cena sai do tempo da fala, então voz e imagem ficam sincronizadas;
   - **desenha as cenas** com o [Remotion](https://www.remotion.dev) (`src/`), com transições, legenda animada e números que
     aparecem no momento em que a voz fala;
   - **cria a trilha** (se pedida) e junta tudo (`scripts/juntar.py`);
   - **publica um Release** com os arquivos abaixo;
   - **atualiza o `LEIAME.md`** da pasta do vídeo com o link do Release.

| Arquivo | Para quê |
| --- | --- |
| `video.mp4` | vídeo pronto, com narração |
| `video-sem-audio.mp4` | só a imagem, para pôr outra voz ou música |
| `narracao.mp3` | só a voz, separada |
| `legendas.srt` | legendas frase por frase |
| `trilha.mp3` | só a música (quando o pedido tem trilha) |

## Como o repositório é organizado

Uma pasta por item. Os arquivos grandes (mp4, mp3, srt) ficam nos **Releases**, não aqui: o Git guarda tudo para sempre
e recusa arquivos acima de 100 MB.

| Pasta | O que tem |
| --- | --- |
| `videos/<nome>/` | `pedido.json` (o roteiro conferido), `fundos/` (imagens de fundo, se houver) e `LEIAME.md` (título, fontes e links dos Releases) |
| `audios/<nome>/` | `pedido.json` de uma narração do modo Mídia e `LEIAME.md` |
| `imagens/<nome>/` | `imagem.jpg` (ou `.png`) salva pela Galeria do modo Mídia e `LEIAME.md` com a descrição usada |
| `videos/exemplo/` | o vídeo de teste: é gerado de novo (sem Release) quando o modelo muda |

Apagar pelo app (🗑 na aba Vídeos ou na Galeria) remove o Release, a tag e a pasta do item. O teste
`tests/estrutura.test.mjs` confere essa organização e todos os pedidos de vídeo a cada commit.

## O pedido (`videos/<nome>/pedido.json`)

Veja `videos/exemplo/pedido.json`. Resumo:

- `formato`: `vertical` (1080×1920) ou `horizontal` (1920×1080)
- `voz`: `pt-BR-FranciscaNeural`, `pt-BR-AntonioNeural`, `pt-BR-ThalitaMultilingualNeural`, `pt-PT-RaquelNeural`, `pt-PT-DuarteNeural`
- `dados`: cada um com `id`, `rotulo`, `valor`, `unidade`, `fonte`, `url` e `data`.
  Um dado pode ser uma conta com outros dados: `"calculo": "(pop2022 - pop2010) / pop2010 * 100"`.
  Um dado que você mesmo informou (a IA não achou nas fontes) leva `"manual": true`: o link fica opcional,
  mas fonte e data continuam obrigatórias, e a tela final avisa "informado por quem fez o vídeo".
- `cenas`: `titulo`, `numero`, `comparacao` (2 dados), `ranking` (3 a 10), `barras` (2 a 8), `linha` (evolução),
  `mapa` (estados, dado com `uf`), `icones` (porcentagem em 100 bonequinhos) e `texto`. Toda cena tem `narracao`.
  Opcionais por cena: `transicao` (`corte`, `zoom`, `deslizar`, `subir`) e `imagem` (`fundo-1.jpg`, em `videos/<nome>/fundos/`).
- `musica`: `animada`, `calma` ou `nenhuma`. A trilha é gerada nota por nota (`scripts/musica.py`), sem direito autoral,
  e abaixa sozinha quando a voz fala.
- `legenda`: `true` (padrão) mostra a legenda animada, com a palavra falada acesa.

Veja também `.pocketcode/skills/diretor-de-video.md` (como dar ritmo de vídeo ao roteiro).

No fim do vídeo entra sozinha uma tela com todas as fontes.

## Rodar no computador (opcional)

```bash
npm install
npm run estudio                                   # abre o Remotion Studio com o exemplo
node scripts/verifica.mjs videos/exemplo/pedido.json out/pedido.json
pip install edge-tts && python scripts/narrar.py out/pedido.json out
npm run render
```

Precisa de Node 22, Python 3 e ffmpeg.

## Por que o repositório é público

Em repositório público, o GitHub Actions é grátis e sem limite de minutos.
Aqui **não há nenhuma chave secreta**: a voz do Edge não pede chave, e o Release usa o token
automático do Actions, que só vale para este repositório. As chaves de IA ficam só no
Cloudflare do PocketCode.

## Licenças

- Código deste repositório: MIT.
- [Remotion](https://www.remotion.dev/license): grátis para pessoas físicas e empresas com até 3 pessoas.
- Mapa do Brasil: [@svg-maps/brazil](https://www.npmjs.com/package/@svg-maps/brazil), CC BY 4.0 (creditado na tela de fontes).
- Vozes do Edge (edge-tts): serviço da Microsoft sem garantia; use a `narracao.mp3` com bom senso.
- Dados: cada fonte tem os próprios termos. IBGE, Banco Central e Banco Mundial permitem reutilizar citando a fonte, e o vídeo já mostra as fontes no final.
