#!/usr/bin/env bash
# Instala o ffmpeg (apt) e as bibliotecas Python pedidas (pip) no GitHub Actions.
# Uso: bash scripts/instala.sh edge-tts==7.3.1 "numpy>=2,<3"
#
# Os espelhos do apt às vezes travam (uma narração ficou mais de 8 minutos parada no apt-get update).
# Por isso cada comando tem tempo máximo e é repetido até 4 vezes (num teste, o 1º download travou e o 2º levou 50 s);
# se o ffmpeg já existir, o apt nem roda.
set -u
APT_OPC=(-o Acquire::Retries=3 -o Acquire::http::Timeout=20 -o Acquire::https::Timeout=20 -o DPkg::Lock::Timeout=60)

tenta() { # tenta <segundos> <comando...>: até 4 vezes; normalmente cada uma leva bem menos que o tempo máximo
  local seg="$1"
  shift
  for i in 1 2 3 4; do
    timeout "$seg" "$@" && return 0
    echo "::warning::Tentativa $i de 4 não deu certo (${seg}s no máximo): $*"
    sleep $((i * 3))
  done
  return 1
}

if command -v ffmpeg >/dev/null 2>&1; then
  echo "ffmpeg já instalado: $(ffmpeg -version | head -1)"
else
  tenta 60 sudo apt-get update -qq "${APT_OPC[@]}" ||
    echo "::warning::O apt-get update não terminou; tentando instalar o ffmpeg assim mesmo."
  tenta 90 sudo apt-get install -y -qq --no-install-recommends "${APT_OPC[@]}" ffmpeg || {
    echo "::error::Não consegui instalar o ffmpeg (os servidores do apt não responderam). Tente gerar de novo em alguns minutos."
    exit 1
  }
fi

if [ "$#" -gt 0 ]; then
  tenta 120 pip install --quiet --retries 3 --timeout 30 "$@" || {
    echo "::error::Não consegui instalar: $* (o pip não respondeu). Tente gerar de novo em alguns minutos."
    exit 1
  }
fi
