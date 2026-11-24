"""Efeitos sonoros do vídeo, gerados na hora (sem gravação de ninguém, então sem direito autoral).

Uso: python scripts/efeitos.py out/props.json saida.wav
Lê a duração de cada cena e os tempos das palavras (props.json, gravado pelo narrar.py) e põe:
  - whoosh nas transições (deslizar, zoom, subir) e um "tum" no corte;
  - pop quando cada item da lista ou evento da linha do tempo aparece;
  - tic-tic-tic enquanto um número conta, e um plim quando ele chega.
Os momentos seguem as mesmas contas das cenas do Remotion (momentoNumero e momentosDosItens).
"""

import json
import re
import sys
import wave

import numpy as np

SR = 44100


def envelope(n, ataque, soltura):
    e = np.ones(n)
    a, r = int(ataque * SR), int(soltura * SR)
    if a:
        e[:a] = np.linspace(0, 1, a)
    if r:
        e[-r:] *= np.linspace(1, 0, r)
    return e


def whoosh(dur=0.45, rng=None):
    """Ruído que passa por um filtro que sobe e desce: o "vush" de transição."""
    rng = rng or np.random.default_rng(1)
    n = int(dur * SR)
    ruido = rng.standard_normal(n)
    t = np.linspace(0, 1, n)
    corte = 300 + 4500 * np.sin(np.pi * t) ** 2  # o filtro abre no meio
    a = np.exp(-2 * np.pi * corte / SR)
    y = np.empty(n)
    acc = 0.0
    for i in range(n):
        acc = (1 - a[i]) * ruido[i] + a[i] * acc
        y[i] = acc
    return y * np.sin(np.pi * t) ** 1.5 * 0.9


def tum():
    """Batida grave curta para o corte seco."""
    n = int(0.22 * SR)
    t = np.arange(n) / SR
    f = 45 + 90 * np.exp(-t * 35)
    return np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * 16) * 0.9


def pop(altura=1.0):
    """Pop de bolha: seno que cai de tom bem rápido."""
    n = int(0.09 * SR)
    t = np.arange(n) / SR
    f = (900 + 700 * np.exp(-t * 60)) * altura
    return np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * 45) * 0.6


def tic(altura=1.0):
    n = int(0.025 * SR)
    t = np.arange(n) / SR
    return np.sin(2 * np.pi * 2400 * altura * t) * np.exp(-t * 220) * 0.35


def plim():
    n = int(0.5 * SR)
    t = np.arange(n) / SR
    s = np.sin(2 * np.pi * 1318.5 * t) + 0.5 * np.sin(2 * np.pi * 1975.5 * t) + 0.25 * np.sin(2 * np.pi * 2637 * t)
    return s * np.exp(-t * 7) * envelope(n, 0.003, 0.05) * 0.3


def soma(mix, i, x):
    i = max(0, i)
    n = max(0, min(len(x), len(mix) - i))
    mix[i : i + n] += x[:n]


def momento_numero(cena, fps, n=0):
    """Igual ao momentoNumero do src/base.jsx: quadro em que a voz chega ao n-ésimo número da cena."""
    com = [p for p in cena.get("palavras") or [] if re.search(r"\d", str(p[2]))]
    p = com[min(n, len(com) - 1)] if com else None
    return max(0, round((p[0] if p else 0.3) * fps) - 4)


def limpa(w):
    return re.sub(r"[^\w]", "", str(w).lower())


def momentos_dos_itens(cena, textos, fps, dur):
    """Igual ao momentosDosItens das cenas lista e linhaTempo (src/cenas/index.jsx)."""
    pal = [(p[0], limpa(p[2])) for p in cena.get("palavras") or []]
    base = round(dur * 0.12)
    passo = max(6, round(dur * 0.7 / max(1, len(textos))))
    ultimo, out = -1, []
    for i, t in enumerate(textos):
        chaves = [limpa(w) for w in str(t or "").lower().split()]
        chaves = [w for w in chaves if len(w) >= 4 or w.isdigit()]
        achou = next((p for p in pal if p[0] * fps > ultimo and p[1] in chaves), None)
        q = round(achou[0] * fps) - 4 if achou else base + i * passo
        ultimo = max(ultimo, q)
        out.append(max(0, q))
    return out


def gera(props):
    fps = props.get("fps") or 30
    cenas = props.get("cenas") or []
    total = sum(c.get("frames") or 4 * fps for c in cenas) + (props.get("fontesFrames") or 5 * fps)
    mix = np.zeros(int(total / fps * SR) + SR)
    rng = np.random.default_rng(3)
    dados = {d.get("id"): d for d in props.get("dados") or []}
    inicio = 0
    for i, c in enumerate(cenas):
        dur = c.get("frames") or 4 * fps
        q0 = int(inicio / fps * SR)
        trans = c.get("transicao") or ["deslizar", "zoom", "subir", "corte"][i % 4]
        if i > 0:
            if trans == "corte":
                soma(mix, q0, tum() * 0.8)
            else:
                w = whoosh(0.4, rng)
                soma(mix, q0 - int(0.12 * SR), w * 0.5)
        tipo = c.get("tipo")
        if tipo == "lista":
            itens = [x for x in c.get("itens") or [] if isinstance(x, str)]
            for k, m in enumerate(momentos_dos_itens(c, itens, fps, dur)):
                soma(mix, q0 + int(m / fps * SR), pop(1 + 0.08 * k))
        elif tipo == "linhaTempo":
            ev = [x for x in c.get("eventos") or [] if isinstance(x, dict) and x.get("dado") in dados]
            textos = [f"{round(dados[x['dado']]['valor'])} {x.get('texto', '')}" for x in ev]
            for k, m in enumerate(momentos_dos_itens(c, textos, fps, dur)):
                soma(mix, q0 + int(m / fps * SR), pop(0.9 + 0.08 * k))
        elif tipo in ("numero", "icones", "comparacao"):
            for n in range(2 if tipo == "comparacao" else 1):
                m = momento_numero(c, fps, n)
                if n and m <= momento_numero(c, fps, 0):
                    m = momento_numero(c, fps, 0) + round(dur * 0.35)
                j = q0 + int(m / fps * SR)
                for k in range(14):  # a contagem dura 1,1 s (useConta)
                    soma(mix, j + int(k * 1.1 / 14 * SR), tic(1 + k * 0.03))
                soma(mix, j + int(1.1 * SR), plim())
        elif tipo in ("barras", "ranking", "mapa", "linha"):
            soma(mix, q0 + int(momento_numero(c, fps) / fps * SR), pop(0.8))
        inicio += dur
    # tela das fontes
    soma(mix, int(inicio / fps * SR) - int(0.12 * SR), whoosh(0.4, rng) * 0.4)
    pico = np.max(np.abs(mix)) or 1
    return mix / pico * 0.8


def grava(sinal, arq):
    dados = (np.clip(sinal, -1, 1) * 32767).astype("<i2")
    with wave.open(arq, "wb") as w:
        w.setnchannels(1)
        w.setsampwidth(2)
        w.setframerate(SR)
        w.writeframes(dados.tobytes())


if __name__ == "__main__":
    if len(sys.argv) != 3:
        raise SystemExit("Uso: python scripts/efeitos.py out/props.json saida.wav")
    with open(sys.argv[1], encoding="utf-8") as f:
        grava(gera(json.load(f)), sys.argv[2])
    print("Efeitos sonoros prontos")
