---
nome: diretor-de-video
descricao: "Como montar um roteiro com ritmo de vídeo (e não de slide): cenas curtas, tipos variados, transições, fundos e trilha"
---
# Diretor de vídeo

Pense como quem edita um vídeo curto de rede social, não como quem faz slides.

## Ritmo
- **Uma ideia por cena, 1 frase curta** (2 a 4 segundos de fala). Uma frase longa vira 2 ou 3 cenas.
- A tela muda a cada 2 a 4 segundos. Nunca duas cenas seguidas do mesmo tipo.
- Comece com um gancho (pergunta ou número surpreendente) e termine com uma conclusão curta.

## Que cena usar
| Tipo | Quando | Campos |
| --- | --- | --- |
| `titulo` | abertura, com pergunta | `titulo`, `subtitulo` |
| `numero` | um número forte | `dado` |
| `comparacao` | dois números (antes x depois, A x B) | `dados`: exatamente 2 |
| `ranking` | quem é maior (3 a 10) | `dados` |
| `barras` | poucos valores lado a lado (2 a 8) | `dados` |
| `linha` | evolução no tempo (2 a 12, em ordem; cada dado com `x`, ex. "2019") | `dados` |
| `mapa` | estados (cada dado com `uf`, ex. "CE") **ou** municípios de um estado (até 30, cada dado com `mun` = código IBGE de 7 dígitos, ex. 2304400 = Fortaleza; todos do mesmo estado) | `dados` |
| `icones` | porcentagem ("38 em cada 100") | `dado` com unidade `%` |
| `texto` | frase de impacto ou conclusão | `texto` |
| `linhaTempo` | acontecimentos em ordem (2 a 6), sem gráfico | `eventos`: `[{"dado": "id de um ano", "texto": "o que aconteceu"}]` |
| `lista` | dicas, curiosidades, um Top 5 em texto (2 a 6) | `itens`: textos curtos |
| `animacao` | 🧪 uma animação que nenhuma cena pronta faz (até 2 por vídeo) | `titulo`, `codigo` (ver "Animação" abaixo), `dados` (opcional) |

Em `dados` e `dado` vão só os ids da tabela, como texto (`"dados": ["pop2010", "pop2022"]`), nunca o dado inteiro.

## Anos
- Ano é um dado com `"unidade": "ano"` (ex.: `{"id": "a1904", "valor": 1904, "unidade": "ano", ...}`). Ele aparece sem ponto (1904).
- Ano **não** é valor de gráfico: nada de `linha`, `barras`, `comparacao`, `ranking` ou `numero` com anos. Use `linhaTempo`.
- Para evolução no tempo de um número (população por ano), o valor é o número e o ano vai no campo `x` do dado.

## Visual e som
- `tema`: `escuro`, `neon`, `jornal`, `natureza` ou `pop` (cores e fonte). `efeitos`: `true`/`false` (whoosh, pop, tic).
- Foto real: `"foto": {"url": "https://upload.wikimedia.org/…", "pagina": "https://commons.wikimedia.org/wiki/File:…", "autor", "licenca"}`.
  Só licenças livres (CC0, domínio público, CC BY, CC BY-SA); o crédito entra sozinho. Prefira lugares, objetos e natureza; evite pessoas vivas.

## Roteiro livre e kit para postar
- `"livre": true` = curiosidades, dicas e histórias sem estatística. Só entram dados informados pela pessoa (`"manual": true`)
  e anos conferidos na Wikipédia. A tela final avisa: "Texto escrito com IA, sem fonte conferida".
- `"post": {"texto": "...", "hashtags": ["#tema"]}` vira o `post.txt` do Release (com as fontes), junto com a `capa.jpg`.
  Os números do texto do post também são conferidos.

## Movimento
- `transicao` de cada cena: `corte` (rápido, para impacto), `zoom` (revelar número), `deslizar` (passar para o próximo assunto), `subir` (conclusão). Varie.
- As animações dos números começam quando a voz fala o número: escreva o número na narração da cena que mostra esse número.
- `fundo` (opcional, até 6 por vídeo): descrição em inglês de uma imagem de fundo para cenas de `titulo` e `texto`, ex. "aerial view of Fortaleza beach at sunset, cinematic". Sem pessoas reais, marcas ou texto na imagem.

## Som e legenda
- A voz não tem emoção: não escreva indicações de tom entre colchetes (`[animado]`, `[sussurrando]`); elas são tiradas antes de narrar. Para dar ênfase, use pontuação.
- `musica`: `animada` (padrão para redes), `calma` (temas sérios) ou `nenhuma`.
- `legenda`: `true` (padrão). A legenda acende cada palavra junto com a voz.

## Números
Continuam valendo as regras de `fontes-de-dados.md`: todo número da narração está na tabela.

## Animação (cena `animacao`)
O `codigo` é o corpo de uma função JavaScript que termina com `return h(…)`. Ele roda a cada quadro e só pode usar:
- `h(tag, atributos, ...filhos)`: peças `div span b i p svg g path circle rect line polyline polygon ellipse text tspan defs linearGradient radialGradient stop clipPath mask`. Sem imagens, links nem eventos.
- `f` (quadro da cena, de 0), `fps`, `dur` (quadros da cena), `p` (progresso de 0 a 1), `L` e `A` (largura e altura da área, em px), `u`, `vertical`, `cor` (`fundo`, `cartao`, `borda`, `texto`, `suave`, `destaque`, `brilho`, `barras`).
- Dados: `dados` (os da cena), `valor(id)`, `texto(id)` (valor formatado), `rotulo(id)`, `conta(id, k)` (o valor contando até ele, k de 0 a 1).
- Movimento: `entre(a, b, ini, fim)`, `mola(atraso)`, `onda(vel)`. Listas: `faixa(n)` (0 a n-1, até 200) e `pega(lista, i)`. E `Math`.
- Proibido (o app barra): laços (use `faixa(n).map`), `function` (use `=>`), `this`, `new`, `class`, `import`, `eval`, `try`, acessar com colchetes (use `pega`), `window`, `document`, `fetch` e afins.
- Todo número que aparece na tela precisa estar na tabela: mostre com `texto(id)` ou `conta(id, k)`.
- Dica: desenhe num `h('svg', { viewBox: '0 0 1000 1000', width: L, height: A }, …)`.
- Antes do vídeo, o código roda num teste isolado; se falhar, a cena vira um texto com o `titulo` (e o storyboard mostra o motivo).
