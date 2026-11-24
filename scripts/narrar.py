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
import re
import subprocess
import sys

FPS = 30
PAUSA = 0.35  # segundos de respiro depois de cada fala (pouco, para o vídeo ter ritmo)
MIN_CENA = 2.0  # nenhuma cena fica menor que isso
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


def sem_colchetes(texto):
    """Tira indicações entre colchetes, como [raivoso] ou [sussurrando]: as vozes do Edge não têm emoção e liam o colchete como texto."""
    return re.sub(r"\s{2,}", " ", re.sub(r"\[[^\]]*\]", " ", str(texto or ""))).strip()


async def fala(texto, voz, velocidade, arq):
    """Gera o mp3 e devolve as palavras com início/fim em segundos (para a legenda animada)."""
    texto = sem_colchetes(texto) or "..."
    if os.environ.get("SEM_VOZ"):
        ditas = texto.split()
        seg = max(1.0, len(ditas) / 2.6)
        roda("ffmpeg", "-y", "-f", "lavfi", "-i", "anullsrc=r=24000:cl=mono", "-t", f"{seg:.2f}", "-q:a", "9", arq)
        passo = seg / max(1, len(ditas))
        return [(i * passo, (i + 0.9) * passo, p) for i, p in enumerate(ditas)]
    import edge_tts

    for tentativa in range(3):
        try:
            frases = []
            com = edge_tts.Communicate(texto, voz, rate=velocidade, boundary="WordBoundary")
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


def blocos_legenda(palavras, max_palavras=7, folga=0.35):
    """Junta palavras em linhas de legenda: até 7 palavras, quebrando em pausa ou pontuação."""
    linhas, atual = [], []
    for ini, fim, txt in palavras:
        if atual and (len(atual) >= max_palavras or ini - atual[-1][1] > folga):
            linhas.append(atual)
            atual = []
        atual.append((ini, fim, txt))
        if txt.rstrip()[-1:] in ".!?;:":
            linhas.append(atual)
            atual = []
    if atual:
        linhas.append(atual)
    return [(l[0][0], l[-1][1], " ".join(p[2] for p in l)) for l in linhas]


def silencio(arq, seg):
    roda("ffmpeg", "-y", "-f", "lavfi", "-i", "anullsrc=r=24000:cl=mono", "-t", f"{seg:.3f}", arq)


def grava_srt(pasta, legendas):
    with open(os.path.join(pasta, "legendas.srt"), "w", encoding="utf-8") as f:
        for n, (ini, fim, txt) in enumerate(legendas, 1):
            f.write(f"{n}\n{tempo_srt(ini)} --> {tempo_srt(fim)}\n{txt}\n\n")


async def so_voz(pedido, pasta, tmp):
    texto = sem_colchetes(pedido.get("texto"))
    if not texto or len(texto) > 3000:
        raise SystemExit("O texto da narração precisa ter de 1 a 3000 letras.")
    voz = pedido.get("voz") or VOZ_PADRAO
    bruto = os.path.join(tmp, "voz.mp3")
    palavras = await fala(texto, voz, pedido.get("velocidade") or "+0%", bruto)
    roda("ffmpeg", "-y", "-i", bruto, "-c:a", "libmp3lame", "-b:a", "128k", os.path.join(pasta, "narracao.mp3"))
    grava_srt(pasta, blocos_legenda(palavras))
    with open(os.path.join(pasta, "notas.md"), "w", encoding="utf-8") as f:
        f.write(f"**{pedido.get('titulo') or 'Narração'}**\n\nVoz: {voz} · {duracao(bruto):.0f} s\n\n")
        f.write("Arquivos: `narracao.mp3` e `legendas.srt`.\n")
    print(f"Narração pronta: {duracao(bruto):.1f} s")


def url_bonita(u):
    """A API da Wikipédia (w/api.php?...titles=X) vira o link do artigo (wiki/X)."""
    import urllib.parse
    m = re.match(r"^https://([a-z]{2,3}\.wikipedia\.org)/w/api\.php\?.*[?&]titles=([^&]+)", u or "")
    return f"https://{m.group(1)}/wiki/{urllib.parse.unquote(m.group(2)).replace(' ', '_')}" if m else (u or "")


def fotos_do_pedido(pedido):
    """Fotos do Commons que entraram no vídeo (uma vez cada), para o crédito."""
    vistas, out = set(), []
    for c in pedido.get("cenas", []):
        ft = c.get("foto")
        if ft and c.get("imagem") and ft.get("pagina") not in vistas:
            vistas.add(ft.get("pagina"))
            out.append(ft)
    return out


def texto_do_post(pedido, fontes):
    """Kit para postar: o texto do post (escrito pela IA e conferido), as fontes e as hashtags, pronto para copiar."""
    post = pedido.get("post") or {}
    partes = [str(post.get("texto") or pedido.get("titulo") or "").strip()]
    if pedido.get("livre"):
        partes.append("✍️ Texto escrito com IA, sem fonte conferida.")
    if fontes:
        partes.append("Fontes: " + "; ".join(sorted({fonte for (fonte, _url) in fontes})))
    fotos = fotos_do_pedido(pedido)
    if fotos:
        partes.append("Fotos: " + "; ".join(f"{ft['autor']} ({ft['licenca']})" for ft in fotos) + ", via Wikimedia Commons")
    tags = [t for t in (post.get("hashtags") or []) if isinstance(t, str) and t.startswith("#")]
    if tags:
        partes.append(" ".join(tags))
    return "\n\n".join(p for p in partes if p) + "\n"


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
        palavras = await fala(cena["narracao"], voz, velocidade, mp3)
        voz_seg = duracao(mp3)
        frames = math.ceil(max(MIN_CENA, voz_seg + PAUSA) * FPS)
        exato = frames / FPS
        wav = os.path.join(tmp, f"cena{i}.wav")
        roda("ffmpeg", "-y", "-i", mp3, "-af", f"apad=whole_dur={exato:.3f}", "-t", f"{exato:.3f}", "-ar", "24000", "-ac", "1", wav)
        partes.append(wav)
        for ini, fim, txt in blocos_legenda(palavras):
            legendas.append((relogio + ini, relogio + min(fim, exato), txt.strip()))
        nova = {**cena, "frames": frames, "palavras": [[round(a, 3), round(min(b, exato), 3), t] for a, b, t in palavras]}
        # imagem de fundo: o workflow copia videos/<nome>/fundos/ para public/fundos/; sem o arquivo, a cena segue sem imagem
        if nova.get("imagem") and not os.path.exists(os.path.join("public", "fundos", os.path.basename(nova["imagem"]))):
            print(f"Aviso: a imagem {nova['imagem']} não chegou; a cena {i + 1} fica sem fundo.")
            nova.pop("imagem")
        cenas.append(nova)
        print(f"Cena {i + 1}: {voz_seg:.1f}s de voz -> {exato:.1f}s no vídeo, {len(palavras)} palavras com tempo")
        if not palavras:
            print(f"Aviso: a cena {i + 1} veio sem o tempo das palavras; ela fica sem legenda animada.")
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
            fontes.setdefault((d["fonte"], url_bonita(d.get("url"))), []).append(
                d["rotulo"] + (" (informado por quem fez o vídeo)" if d.get("manual") else "")
            )
    with open(os.path.join(pasta, "notas.md"), "w", encoding="utf-8") as f:
        f.write(f"**{pedido['titulo']}**\n\n")
        if pedido.get("livre"):
            f.write("✍️ **Roteiro livre: texto escrito com IA, sem fonte conferida.** Só as datas e os números listados abaixo foram conferidos.\n\n")
        f.write(f"Duração: {relogio + FONTES_SEG:.0f} s · voz: {voz}\n\n### Fontes dos dados\n\n")
        for (fonte, url), rotulos in fontes.items():
            f.write(f"- [{fonte}]({url}): {', '.join(rotulos)}\n" if url else f"- {fonte}: {', '.join(rotulos)}\n")
        if not fontes:
            f.write("- nenhuma (sem dados conferidos)\n")
        fotos = fotos_do_pedido(pedido)
        if fotos:
            f.write("\n### Fotos (Wikimedia Commons)\n\n")
            for ft in fotos:
                f.write(f"- [{ft['autor']}]({ft['pagina']}) · {ft['licenca']}\n")
        f.write("\nArquivos: `video.mp4` (com narração), `video-sem-audio.mp4`, `narracao.mp3`, `legendas.srt`, ")
        f.write("`capa.jpg` e `post.txt` (texto pronto para postar).\n")
    with open(os.path.join(pasta, "post.txt"), "w", encoding="utf-8") as f:
        f.write(texto_do_post(pedido, fontes))
    print(f"Narração pronta: {relogio + FONTES_SEG:.1f} s no total")


if __name__ == "__main__":
    if len(sys.argv) != 3:
        raise SystemExit("Uso: python scripts/narrar.py out/pedido.json out")
    asyncio.run(principal(sys.argv[1], sys.argv[2]))
