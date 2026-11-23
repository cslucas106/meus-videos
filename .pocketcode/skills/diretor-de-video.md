---
nome: diretor-de-video
descricao: Como montar um roteiro com ritmo de vídeo (e não de slide): cenas curtas, tipos variados, transições, fundos e trilha
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
| `mapa` | estados (cada dado com `uf`, ex. "CE") | `dados` |
| `icones` | porcentagem ("38 em cada 100") | `dado` com unidade `%` |
| `texto` | frase de impacto ou conclusão | `texto` |

Em `dados` e `dado` vão só os ids da tabela, como texto (`"dados": ["pop2010", "pop2022"]`), nunca o dado inteiro.

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
