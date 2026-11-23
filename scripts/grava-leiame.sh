#!/usr/bin/env bash
# Atualiza o LEIAME.md de videos/<nome> ou audios/<nome> com o link do Release e grava no repositório.
# Uso (dentro do GitHub Actions): bash scripts/grava-leiame.sh <pasta> <tag>
# Tenta 5 vezes: se outro commit chegou antes (outro vídeo, um item apagado pelo app), junta com ele e tenta de novo.
set -u
PASTA="$1"
TAG="$2"
RAMO="${GITHUB_REF_NAME:-main}"
LINK="https://github.com/$GITHUB_REPOSITORY/releases/tag/$TAG"

node scripts/leiame.mjs "$PASTA" "$TAG" "$LINK" || exit 1
git config user.name "github-actions[bot]"
git config user.email "41898283+github-actions[bot]@users.noreply.github.com"
git add "$PASTA/LEIAME.md"
if git diff --cached --quiet; then
  echo "LEIAME.md sem mudança."
  exit 0
fi
git commit -q -m "📝 LEIAME: $TAG"
for i in 1 2 3 4 5; do
  if git fetch -q --depth=50 origin "$RAMO" && git rebase -q "origin/$RAMO" && git push -q origin "HEAD:$RAMO"; then
    echo "LEIAME.md gravado em $PASTA."
    exit 0
  fi
  git rebase --abort 2>/dev/null
  # a pasta sumiu no meio do caminho (o item foi apagado pelo app): não há o que gravar
  if ! git cat-file -e "origin/$RAMO:$PASTA/pedido.json" 2>/dev/null; then
    echo "::warning::A pasta $PASTA não existe mais no repositório; o LEIAME.md não foi gravado."
    exit 0
  fi
  sleep $((i * 3))
done
echo "::warning::Não consegui gravar o LEIAME.md depois de 5 tentativas. O arquivo pronto está no Release."
exit 1
