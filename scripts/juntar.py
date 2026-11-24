"""Junta imagem e som: cria a trilha e os efeitos (se o pedido pedir), abaixa a música quando a voz fala, põe os sons de
ambiente das cenas (Freesound, out/sons/som-N.mp3) e grava o video.mp4.

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


VOLUME_PADRAO = 50  # % do volume da trilha (musicaVolume no pedido)


def ganho_trilha(volume):
    """musicaVolume (0 a 100) -> ganho da trilha antes de abaixar na voz. 50% = 0,30 (antes era fixo em 0,20, e abaixava muito)."""
    try:
        v = max(0, min(100, int(volume)))
    except (TypeError, ValueError):
        v = VOLUME_PADRAO
    return round(0.6 * v / 100, 3)


GANHO_AMBIENTE = 0.32  # som de ambiente: baixinho, por baixo da voz


def sons_das_cenas(props, pasta):
    """[(arquivo, início em s, duração em s)] dos sons de ambiente (cena.somArquivo) que chegaram em <pasta>/sons/."""
    fps = props.get("fps") or 30
    out, inicio = [], 0.0
    for i, c in enumerate(props.get("cenas") or []):
        dur = (c.get("frames") or 4 * fps) / fps
        nome = c.get("somArquivo")
        if nome:
            arq = os.path.join(pasta, "sons", os.path.basename(str(nome)))
            if os.path.exists(arq):
                out.append((arq, round(inicio, 3), round(dur, 3)))
            else:
                print(f"Aviso: o som {nome} da cena {i + 1} não chegou; a cena fica sem som de ambiente.")
        inicio += dur
    return out


def filtro_ambiente(k, inicio, dur, i):
    """Um som de ambiente: corta na duração da cena, entra e sai devagar e começa junto com a cena."""
    saida = max(0.0, dur - 0.8)
    atraso = int(round(inicio * 1000))
    return (
        f"[{k}:a]aresample=44100,aformat=channel_layouts=mono,atrim=0:{dur:.3f},asetpts=PTS-STARTPTS,"
        f"afade=t=in:d=0.4,afade=t=out:st={saida:.3f}:d=0.8,volume={GANHO_AMBIENTE},adelay={atraso}:all=1[amb{i}]"
    )


def filtro_mistura(com_musica, com_efeitos, ganho=None, ambientes=()):
    """Monta o filtro do ffmpeg. Entradas: 0 = voz, depois a trilha (se houver) e os efeitos (se houver).
    A música fica no volume escolhido e abaixa um pouco quando a voz fala (sidechain); os efeitos ficam por cima, baixinhos; a voz manda."""
    ganho = ganho_trilha(VOLUME_PADRAO) if ganho is None else ganho
    partes, mistura, k = ["[0:a]aresample=44100,asplit=2[v1][v2]"], ["[v2]"], 1
    if com_musica:
        partes.append(f"[{k}:a]aresample=44100,volume={ganho}[m]")
        partes.append("[m][v1]sidechaincompress=threshold=0.03:ratio=4:attack=20:release=400[md]")
        mistura.append("[md]")
        k += 1
    else:
        partes.append("[v1]anullsink")
    if com_efeitos:
        partes.append(f"[{k}:a]aresample=44100,volume=0.30[fx]")
        mistura.append("[fx]")
        k += 1
    for i, (_arq, inicio, dur) in enumerate(ambientes):
        partes.append(filtro_ambiente(k, inicio, dur, i))
        mistura.append(f"[amb{i}]")
        k += 1
    partes.append(f"{''.join(mistura)}amix=inputs={len(mistura)}:duration=first:normalize=0,alimiter=limit=0.95[a]")
    return ";".join(partes)


def principal(pasta):
    with open(os.path.join(pasta, "props.json"), encoding="utf-8") as f:
        props = json.load(f)
    voz = os.path.join(pasta, "narracao.mp3")
    imagem = os.path.join(pasta, "video-sem-audio.mp4")
    saida = os.path.join(pasta, "video.mp4")
    estilo = props.get("musica") or "nenhuma"
    com_efeitos = bool(props.get("efeitos", True))  # true ou o nome do estilo (completo, suave, transicoes, arcade)
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
    ambientes = sons_das_cenas(props, pasta)
    for arq, _inicio, _dur in ambientes:
        entradas += ["-i", arq]
    if estilo == "nenhuma" and not com_efeitos and not ambientes:
        roda("ffmpeg", "-y", "-i", imagem, "-i", voz, "-c:v", "copy", "-c:a", "aac", "-b:a", "160k", "-shortest", saida)
        print("Vídeo pronto (sem música e sem efeitos)")
        return
    n_audio = len(entradas) // 2
    roda(
        "ffmpeg", "-y", *entradas, "-i", imagem,
        "-filter_complex",
        filtro_mistura(estilo != "nenhuma", com_efeitos, ganho_trilha(props.get("musicaVolume", VOLUME_PADRAO)), ambientes),
        "-map", f"{n_audio}:v", "-map", "[a]",
        "-c:v", "copy", "-c:a", "aac", "-b:a", "160k", "-shortest", saida,
    )
    for t in temporarios:
        os.remove(t)
    vol = props.get("musicaVolume", VOLUME_PADRAO)
    print(f"Vídeo pronto ({'trilha ' + estilo + f' a {vol}%' if estilo != 'nenhuma' else 'sem música'}{', com efeitos' if com_efeitos else ''}{f', {len(ambientes)} som(ns) de ambiente' if ambientes else ''})")


if __name__ == "__main__":
    if len(sys.argv) != 2:
        raise SystemExit("Uso: python scripts/juntar.py out")
    principal(sys.argv[1])
