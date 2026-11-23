"""Trilha de fundo gerada na hora, nota por nota (sem gravação de ninguém, então sem direito autoral).

Uso: python scripts/musica.py <estilo> <segundos> <saida.wav>
Estilos: calma (acordes suaves, 72 bpm) e animada (acordes, arpejo e batida leve, 104 bpm).
A mistura com a voz (abaixando a música quando alguém fala) é feita pelo ffmpeg no workflow.
"""

import sys
import wave

import numpy as np

SR = 44100
# Progressões (graus em semitons a partir de Dó): I - V - vi - IV e vi - IV - I - V
PROGRESSOES = {
    "calma": [(0, 4, 7), (7, 11, 14), (9, 12, 16), (5, 9, 12)],
    "animada": [(9, 12, 16), (5, 9, 12), (0, 4, 7), (7, 11, 14)],
}
BPM = {"calma": 72, "animada": 104}


def freq(semitom, oitava=4):
    return 261.63 * 2 ** ((semitom + 12 * (oitava - 4)) / 12)


def envelope(n, ataque, soltura):
    e = np.ones(n)
    a, r = int(ataque * SR), int(soltura * SR)
    if a:
        e[:a] = np.linspace(0, 1, a)
    if r:
        e[-r:] *= np.linspace(1, 0, r)
    return e


def passa_baixa(x, corte):
    """Filtro simples de um polo: deixa o som mais macio."""
    a = np.exp(-2 * np.pi * corte / SR)
    y = np.empty_like(x)
    acc = 0.0
    for i in range(len(x)):  # trilhas curtas (até ~2 min): rápido o bastante
        acc = (1 - a) * x[i] + a * acc
        y[i] = acc
    return y


def pad(acorde, dur):
    n = int(dur * SR)
    t = np.arange(n) / SR
    s = np.zeros(n)
    for nota in acorde:
        f = freq(nota, 3)
        for desafina in (-0.12, 0.12):  # dois osciladores levemente desafinados = som "largo"
            s += np.sin(2 * np.pi * f * (1 + desafina / 100) * t) + 0.25 * np.sin(4 * np.pi * f * t)
    return s * envelope(n, min(0.8, dur / 3), min(0.8, dur / 3)) / (len(acorde) * 2)


def baixo(raiz, dur):
    n = int(dur * SR)
    t = np.arange(n) / SR
    return np.sin(2 * np.pi * freq(raiz % 12, 2) * t) * envelope(n, 0.02, 0.3) * 0.5


def pluck(nota, dur):
    n = int(dur * SR)
    t = np.arange(n) / SR
    f = freq(nota, 5)
    tri = 2 * np.abs(2 * ((f * t) % 1) - 1) - 1
    return tri * np.exp(-t * 7) * 0.22


def bumbo():
    n = int(0.25 * SR)
    t = np.arange(n) / SR
    f = 50 + 70 * np.exp(-t * 30)
    return np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * 14) * 0.6


def chimbal(rng):
    n = int(0.05 * SR)
    ruido = rng.standard_normal(n)
    ruido = ruido - passa_baixa(ruido, 6000)  # só o agudo
    return ruido * np.exp(-np.arange(n) / SR * 80) * 0.08


def soma(mix, i, x):
    """Põe o som x a partir da amostra i, cortando o que passar do fim."""
    n = max(0, min(len(x), len(mix) - i))
    mix[i : i + n] += x[:n]


def gera(estilo, segundos):
    estilo = estilo if estilo in BPM else "calma"
    batida = 60 / BPM[estilo]
    compasso = 4 * batida
    por_acorde = compasso * (2 if estilo == "calma" else 1)
    total = int((segundos + 1) * SR)
    mix = np.zeros(total + SR * 3)
    rng = np.random.default_rng(7)
    prog = PROGRESSOES[estilo]
    t0, k = 0.0, 0
    while t0 < segundos + 1:
        acorde = prog[k % len(prog)]
        i = int(t0 * SR)
        p = pad(acorde, por_acorde + 0.6)
        soma(mix, i, p * 0.55)
        for c in range(int(por_acorde / compasso)):
            b = baixo(acorde[0], compasso)
            j = i + int(c * compasso * SR)
            soma(mix, j, b * (0.5 if estilo == "calma" else 0.7))
        if estilo == "animada":
            colcheia = batida / 2
            for e in range(int(por_acorde / colcheia)):
                j = i + int(e * colcheia * SR)
                nota = acorde[[0, 1, 2, 1][e % 4]] + 12 * (e % 8 >= 4)
                pl = pluck(nota, colcheia * 2)
                soma(mix, j, pl)
                if e % 4 == 0:
                    bb = bumbo()
                    soma(mix, j, bb * 0.5)
                if e % 2 == 1:
                    hh = chimbal(rng)
                    soma(mix, j, hh)
        t0 += por_acorde
        k += 1
    mix = passa_baixa(mix[:total], 3500 if estilo == "calma" else 6000)
    mix *= envelope(len(mix), 1.5, 3.0)
    pico = np.max(np.abs(mix)) or 1
    return mix / pico * 0.6


def grava(sinal, arq):
    dados = (np.clip(sinal, -1, 1) * 32767).astype("<i2")
    with wave.open(arq, "wb") as w:
        w.setnchannels(1)
        w.setsampwidth(2)
        w.setframerate(SR)
        w.writeframes(dados.tobytes())


if __name__ == "__main__":
    if len(sys.argv) != 4:
        raise SystemExit("Uso: python scripts/musica.py <calma|animada> <segundos> <saida.wav>")
    grava(gera(sys.argv[1], float(sys.argv[2])), sys.argv[3])
    print(f"Trilha {sys.argv[1]} de {float(sys.argv[2]):.0f} s pronta")
