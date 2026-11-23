"""Gera a narração do vídeo com as vozes grátis do Microsoft Edge (edge-tts).

Uso: python scripts/narrar.py out/pedido.json out

Para cada cena: gera a fala, mede quanto tempo ela dura e define a duração da
cena no vídeo a partir disso. Assim a imagem e a voz ficam sincronizadas.

Grava em out/:
  narracao.mp3   a voz do vídeo inteiro, separada (para usar em outro editor)
  legendas.srt   legendas frase por frase, já no tempo certo
  props.json     o pedido + a duração de cada cena (o Remotion lê este arquivo)
  notas.md       texto da página do Release, com as fontes

Pedido do tipo "voz" (modo Mídia do PocketCode): {"tipo": "voz", "titulo", "texto", "voz", "velocidade"}
vira só narracao.mp3 + legendas.srt + notas.md, sem vídeo.

Para testar sem internet: SEM_VOZ=1 cria silêncio no lugar da voz.
"""

import asyncio
import json
import math
import os
import subprocess
import sys

FPS = 30
PAUSA = 0.5  # segundos de respiro depois de cada fala
MIN_CENA = 2.5  # nenhuma cena fica menor que isso
FONTES_SEG = 5  # tela final com as fontes, sem voz
VOZ_PADRAO = "pt-BR-FranciscaNeural"


def roda(*args):
    subprocess.run(args, check=True, stdout=subprocess.DEVNULL, stderr=subprocess.PIPE)


def duracao(arq):
    r = subprocess.run(
        ["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", arq],
        check=True, capture_output=True, text=True,
    )
    return float(r.stdout.strip())


async def fala(texto, voz, velocidade, arq):
    """Gera o mp3 e devolve as frases com início/fim em segundos."""
    if os.environ.get("SEM_VOZ"):
        seg = max(1.0, len(texto.split()) / 2.6)
        roda("ffmpeg", "-y", "-f", "lavfi", "-i", "anullsrc=r=24000:cl=mono", "-t", f"{seg:.2f}", "-q:a", "9", arq)
        return [(0.0, seg, texto)]
    import edge_tts

    for tentativa in range(3):
        try:
            frases = []
            com = edge_tts.Communicate(texto, voz, rate=velocidade, boundary="SentenceBoundary")
            with open(arq, "wb") as f:
                async for parte in com.stream():
                    if parte["type"] == "audio":
                        f.write(parte["data"])
                    elif parte["type"] in ("SentenceBoundary", "WordBoundary"):
                        ini = parte["offset"] / 1e7
                        frases.append((ini, ini + parte["duration"] / 1e7, parte["text"]))
            return frases or [(0.0, duracao(arq), texto)]
        except Exception as erro:  # a conexão com o Edge às vezes cai; tenta de novo
            print(f"Tentativa {tentativa + 1} falhou: {erro}", file=sys.stderr)
            await asyncio.sleep(3 * (tentativa + 1))
    raise SystemExit("Não consegui gerar a voz depois de 3 tentativas.")


def tempo_srt(s):
    ms = int(round(s * 1000))
    h, ms = divmod(ms, 3600000)
    m, ms = divmod(ms, 60000)
    seg, ms = divmod(ms, 1000)
    return f"{h:02}:{m:02}:{seg:02},{ms:03}"


def silencio(arq, seg):
    roda("ffmpeg", "-y", "-f", "lavfi", "-i", "anullsrc=r=24000:cl=mono", "-t", f"{seg:.3f}", arq)


def grava_srt(pasta, legendas):
    with open(os.path.join(pasta, "legendas.srt"), "w", encoding="utf-8") as f:
        for n, (ini, fim, txt) in enumerate(legendas, 1):
            f.write(f"{n}\n{tempo_srt(ini)} --> {tempo_srt(fim)}\n{txt}\n\n")


async def so_voz(pedido, pasta, tmp):
    texto = str(pedido.get("texto") or "").strip()
    if not texto or len(texto) > 3000:
        raise SystemExit("O texto da narração precisa ter de 1 a 3000 letras.")
    voz = pedido.get("voz") or VOZ_PADRAO
    bruto = os.path.join(tmp, "voz.mp3")
    frases = await fala(texto, voz, pedido.get("velocidade") or "+0%", bruto)
    roda("ffmpeg", "-y", "-i", bruto, "-c:a", "libmp3lame", "-b:a", "128k", os.path.join(pasta, "narracao.mp3"))
    grava_srt(pasta, [(ini, fim, txt.strip()) for ini, fim, txt in frases])
    with open(os.path.join(pasta, "notas.md"), "w", encoding="utf-8") as f:
        f.write(f"**{pedido.get('titulo') or 'Narração'}**\n\nVoz: {voz} · {duracao(bruto):.0f} s\n\n")
        f.write("Arquivos: `narracao.mp3` e `legendas.srt`.\n")
    print(f"Narração pronta: {duracao(bruto):.1f} s")


async def principal(entrada, pasta):
    os.makedirs(pasta, exist_ok=True)
    tmp = os.path.join(pasta, "partes")
    os.makedirs(tmp, exist_ok=True)
    with open(entrada, encoding="utf-8") as f:
        pedido = json.load(f)
    if pedido.get("tipo") == "voz":
        return await so_voz(pedido, pasta, tmp)

    voz = pedido.get("voz") or VOZ_PADRAO
    velocidade = pedido.get("velocidade") or "+0%"
    cenas, partes, legendas = [], [], []
    relogio = 0.0

    for i, cena in enumerate(pedido["cenas"]):
        mp3 = os.path.join(tmp, f"cena{i}.mp3")
        frases = await fala(cena["narracao"], voz, velocidade, mp3)
        voz_seg = duracao(mp3)
        frames = math.ceil(max(MIN_CENA, voz_seg + PAUSA) * FPS)
        exato = frames / FPS
        wav = os.path.join(tmp, f"cena{i}.wav")
        roda("ffmpeg", "-y", "-i", mp3, "-af", f"apad=whole_dur={exato:.3f}", "-t", f"{exato:.3f}", "-ar", "24000", "-ac", "1", wav)
        partes.append(wav)
        for ini, fim, txt in frases:
            legendas.append((relogio + ini, relogio + min(fim, exato), txt.strip()))
        cenas.append({**cena, "frames": frames})
        print(f"Cena {i + 1}: {voz_seg:.1f}s de voz -> {exato:.1f}s no vídeo")
        relogio += exato

    final = os.path.join(tmp, "fontes.wav")
    silencio(final, FONTES_SEG)
    partes.append(final)

    lista = os.path.join(tmp, "lista.txt")
    with open(lista, "w", encoding="utf-8") as f:
        for p in partes:
            f.write(f"file '{os.path.abspath(p)}'\n")
    roda("ffmpeg", "-y", "-f", "concat", "-safe", "0", "-i", lista, "-c:a", "libmp3lame", "-b:a", "128k", os.path.join(pasta, "narracao.mp3"))

    grava_srt(pasta, legendas)

    props = {**pedido, "voz": voz, "fps": FPS, "cenas": cenas, "fontesFrames": FONTES_SEG * FPS}
    with open(os.path.join(pasta, "props.json"), "w", encoding="utf-8") as f:
        json.dump(props, f, ensure_ascii=False, indent=2)

    fontes = {}
    for d in pedido.get("dados", []):
        if d.get("url") or d.get("manual"):
            fontes.setdefault((d["fonte"], d.get("url") or ""), []).append(
                d["rotulo"] + (" (informado por quem fez o vídeo)" if d.get("manual") else "")
            )
    with open(os.path.join(pasta, "notas.md"), "w", encoding="utf-8") as f:
        f.write(f"**{pedido['titulo']}**\n\n")
        f.write(f"Duração: {relogio + FONTES_SEG:.0f} s · voz: {voz}\n\n### Fontes dos dados\n\n")
        for (fonte, url), rotulos in fontes.items():
            f.write(f"- [{fonte}]({url}): {', '.join(rotulos)}\n" if url else f"- {fonte}: {', '.join(rotulos)}\n")
        f.write("\nArquivos: `video.mp4` (com narração), `video-sem-audio.mp4`, `narracao.mp3`, `legendas.srt`.\n")
    print(f"Narração pronta: {relogio + FONTES_SEG:.1f} s no total")


if __name__ == "__main__":
    if len(sys.argv) != 3:
        raise SystemExit("Uso: python scripts/narrar.py out/pedido.json out")
    asyncio.run(principal(sys.argv[1], sys.argv[2]))
