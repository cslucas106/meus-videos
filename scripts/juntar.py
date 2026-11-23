"""Junta imagem e som: cria a trilha (se o pedido pedir), abaixa a música quando a voz fala e grava o video.mp4.

Uso: python scripts/juntar.py out
Lê out/props.json, out/narracao.mp3 e out/video-sem-audio.mp4. Grava out/video.mp4 e, com música, out/trilha.mp3.
"""

import json
import os
import subprocess
import sys

AQUI = os.path.dirname(os.path.abspath(__file__))


def roda(*args):
    subprocess.run(args, check=True, stdout=subprocess.DEVNULL, stderr=subprocess.PIPE)


def duracao(arq):
    r = subprocess.run(
        ["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", arq],
        check=True, capture_output=True, text=True,
    )
    return float(r.stdout.strip())


def principal(pasta):
    with open(os.path.join(pasta, "props.json"), encoding="utf-8") as f:
        props = json.load(f)
    voz = os.path.join(pasta, "narracao.mp3")
    imagem = os.path.join(pasta, "video-sem-audio.mp4")
    saida = os.path.join(pasta, "video.mp4")
    estilo = props.get("musica") or "nenhuma"
    if estilo == "nenhuma":
        roda("ffmpeg", "-y", "-i", imagem, "-i", voz, "-c:v", "copy", "-c:a", "aac", "-b:a", "160k", "-shortest", saida)
        print("Vídeo pronto (sem música)")
        return
    trilha_wav = os.path.join(pasta, "trilha.wav")
    roda(sys.executable, os.path.join(AQUI, "musica.py"), estilo, f"{duracao(voz):.2f}", trilha_wav)
    roda("ffmpeg", "-y", "-i", trilha_wav, "-c:a", "libmp3lame", "-b:a", "160k", os.path.join(pasta, "trilha.mp3"))
    # a música fica baixa e abaixa mais quando a voz fala (sidechain); a voz manda
    filtro = (
        "[0:a]aresample=44100,asplit=2[v1][v2];"
        "[1:a]aresample=44100,volume=0.20[m];"
        "[m][v1]sidechaincompress=threshold=0.02:ratio=8:attack=20:release=400[md];"
        "[v2][md]amix=inputs=2:duration=first:normalize=0,alimiter=limit=0.95[a]"
    )
    roda(
        "ffmpeg", "-y", "-i", voz, "-i", trilha_wav, "-i", imagem,
        "-filter_complex", filtro, "-map", "2:v", "-map", "[a]",
        "-c:v", "copy", "-c:a", "aac", "-b:a", "160k", "-shortest", saida,
    )
    os.remove(trilha_wav)
    print(f"Vídeo pronto (com trilha {estilo})")


if __name__ == "__main__":
    if len(sys.argv) != 2:
        raise SystemExit("Uso: python scripts/juntar.py out")
    principal(sys.argv[1])
