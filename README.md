# meus-videos

Vídeos curtos com **dados públicos** (IBGE, Banco Central, Banco Mundial…), montados pelo
[PocketCode AI](https://github.com/cslucas106) no celular e renderizados aqui, de graça, no GitHub Actions.

## Como funciona

1. No modo **Vídeo** do PocketCode, você pede o vídeo. A IA busca os dados nas fontes liberadas
   e escreve o roteiro. Você confere a tabela e aprova.
2. O app grava `pedidos/<nome>.json` aqui e dispara o workflow **Gerar vídeo**.
3. O workflow:
   - **confere os números** (`scripts/verifica.mjs`): todo número falado ou escrito precisa estar
     na tabela de dados, com fonte, link e data. Se não estiver, o vídeo não é gerado;
   - **gera a narração** com as vozes grátis do Microsoft Edge (`scripts/narrar.py`). A duração de
     cada cena sai do tempo da fala, então voz e imagem ficam sincronizadas;
   - **desenha as cenas** com o [Remotion](https://www.remotion.dev) (`src/`);
   - **publica um Release** com 4 arquivos.

| Arquivo | Para quê |
| --- | --- |
| `video.mp4` | vídeo pronto, com narração |
| `video-sem-audio.mp4` | só a imagem, para pôr outra voz ou música |
| `narracao.mp3` | só a voz, separada |
| `legendas.srt` | legendas frase por frase |

## O pedido (`pedidos/*.json`)

Veja `pedidos/exemplo.json`. Resumo:

- `formato`: `vertical` (1080×1920) ou `horizontal` (1920×1080)
- `voz`: `pt-BR-FranciscaNeural`, `pt-BR-AntonioNeural`, `pt-BR-ThalitaMultilingualNeural`, `pt-PT-RaquelNeural`, `pt-PT-DuarteNeural`
- `dados`: cada um com `id`, `rotulo`, `valor`, `unidade`, `fonte`, `url` e `data`.
  Um dado pode ser uma conta com outros dados: `"calculo": "(pop2022 - pop2010) / pop2010 * 100"`.
- `cenas`: `titulo`, `numero` (um dado grande), `barras` e `linha` (2 ou mais dados) e `texto`.
  Toda cena tem `narracao`.

No fim do vídeo entra sozinha uma tela com todas as fontes.

## Rodar no computador (opcional)

```bash
npm install
npm run estudio                                   # abre o Remotion Studio com o exemplo
node scripts/verifica.mjs pedidos/exemplo.json out/pedido.json
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
- Vozes do Edge (edge-tts): serviço da Microsoft sem garantia; use a `narracao.mp3` com bom senso.
- Dados: cada fonte tem os próprios termos. IBGE, Banco Central e Banco Mundial permitem reutilizar citando a fonte, e o vídeo já mostra as fontes no final.
