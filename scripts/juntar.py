"""Junta imagem e som: cria a trilha e os efeitos (se o pedido pedir), abaixa a música quando a voz fala e grava o video.mp4.

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


def filtro_mistura(com_musica, com_efeitos):
    """Monta o filtro do ffmpeg. Entradas: 0 = voz, depois a trilha (se houver) e os efeitos (se houver).
    A música fica baixa e abaixa mais quando a voz fala (sidechain); os efeitos ficam por cima, baixinhos; a voz manda."""
    partes, mistura, k = ["[0:a]aresample=44100,asplit=2[v1][v2]"], ["[v2]"], 1
    if com_musica:
        partes.append(f"[{k}:a]aresample=44100,volume=0.20[m]")
        partes.append("[m][v1]sidechaincompress=threshold=0.02:ratio=8:attack=20:release=400[md]")
        mistura.append("[md]")
        k += 1
    else:
        partes.append("[v1]anullsink")
    if com_efeitos:
        partes.append(f"[{k}:a]aresample=44100,volume=0.30[fx]")
        mistura.append("[fx]")
    partes.append(f"{''.join(mistura)}amix=inputs={len(mistura)}:duration=first:normalize=0,alimiter=limit=0.95[a]")
    return ";".join(partes)


def principal(pasta):
    with open(os.path.join(pasta, "props.json"), encoding="utf-8") as f:
        props = json.load(f)
    voz = os.path.join(pasta, "narracao.mp3")
    imagem = os.path.join(pasta, "video-sem-audio.mp4")
    saida = os.path.join(pasta, "video.mp4")
    estilo = props.get("musica") or "nenhuma"
    com_efeitos = props.get("efeitos") is not False
    entradas, temporarios = ["-i", voz], []
    if estilo != "nenhuma":
        trilha_wav = os.path.join(pasta, "trilha.wav")
        roda(sys.executable, os.path.join(AQUI, "musica.py"), estilo, f"{duracao(voz):.2f}", trilha_wav)
        roda("ffmpeg", "-y", "-i", trilha_wav, "-c:a", "libmp3lame", "-b:a", "160k", os.path.join(pasta, "trilha.mp3"))
        entradas += ["-i", trilha_wav]
        temporarios.append(trilha_wav)
    if com_efeitos:
        efeitos_wav = os.path.join(pasta, "efeitos.wav")
        try:
            roda(sys.executable, os.path.join(AQUI, "efeitos.py"), os.path.join(pasta, "props.json"), efeitos_wav)
            entradas += ["-i", efeitos_wav]
            temporarios.append(efeitos_wav)
        except subprocess.CalledProcessError as erro:  # efeito é enfeite: sem ele o vídeo sai do mesmo jeito
            print("Aviso: os efeitos sonoros não saíram:", erro.stderr.decode(errors="replace")[-400:])
            com_efeitos = False
    if estilo == "nenhuma" and not com_efeitos:
        roda("ffmpeg", "-y", "-i", imagem, "-i", voz, "-c:v", "copy", "-c:a", "aac", "-b:a", "160k", "-shortest", saida)
        print("Vídeo pronto (sem música e sem efeitos)")
        return
    n_audio = len(entradas) // 2
    roda(
        "ffmpeg", "-y", *entradas, "-i", imagem,
        "-filter_complex", filtro_mistura(estilo != "nenhuma", com_efeitos),
        "-map", f"{n_audio}:v", "-map", "[a]",
        "-c:v", "copy", "-c:a", "aac", "-b:a", "160k", "-shortest", saida,
    )
    for t in temporarios:
        os.remove(t)
    print(f"Vídeo pronto ({'trilha ' + estilo if estilo != 'nenhuma' else 'sem música'}{', com efeitos' if com_efeitos else ''})")


if __name__ == "__main__":
    if len(sys.argv) != 2:
        raise SystemExit("Uso: python scripts/juntar.py out")
    principal(sys.argv[1])
