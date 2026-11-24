---
nome: fontes-de-dados
descricao: Como montar um pedido de vídeo (videos/<nome>/pedido.json) só com números de fontes públicas, com fonte, link e data
---
# Fontes de dados dos vídeos

Use quando for criar ou mudar um pedido em `videos/<nome>/pedido.json`.

1. Todo número do vídeo fica na lista `dados`, com `fonte`, `url` (https) e `data`.
   O `valor` é copiado exatamente como está na resposta da fonte, sem arredondar.
2. Contas (variação, diferença) viram um dado com `"calculo": "(b - a) / a * 100"` usando os ids.
3. Na `narracao` e nos textos só aparecem números da tabela. Pode arredondar ao falar ("203 milhões").
4. Se o dado não existe nas fontes, não invente: tire a cena ou avise.
5. Antes de entregar, rode `node motor/scripts/verifica.mjs videos/<nome>/pedido.json`.

Fontes liberadas no PocketCode (modo Vídeo):
- IBGE (servicodados.ibge.gov.br): agregados v3, localidades, nomes
- Banco Central (api.bcb.gov.br SGS, olinda.bcb.gov.br PTAX/Focus)
- BrasilAPI, Câmara dos Deputados, Senado Federal
- Banco Mundial (api.worldbank.org), Open-Meteo, Wikipédia (secundária)

Tipos de cena: `titulo`, `numero`, `barras`, `linha`, `texto`. Veja `videos/exemplo/pedido.json`.
