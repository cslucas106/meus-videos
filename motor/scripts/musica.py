"""Trilha de fundo gerada na hora, nota por nota (sem gravação de ninguém, então sem direito autoral).

Uso: python scripts/musica.py <estilo> <segundos> <saida.wav>
Estilos (ESTILOS): calma, animada, lofi, epica, suspense, alegre e eletronica.
A mistura com a voz (abaixando a música quando alguém fala) é feita pelo ffmpeg no workflow.
"""

import sys
import wave

import numpy as np

SR = 44100
# Cada estilo: progressão (graus em semitons a partir de Dó), andamento, tempos por acorde e camadas.
# Camadas: pad (acordes longos), baixo, arpejo (notas do acorde), bateria (bumbo/caixa/chimbal), extras (chiado, tambores, pulso).
ESTILOS = {
    # I - V - vi - IV, devagar e macio
    "calma": {"prog": [(0, 4, 7), (7, 11, 14), (9, 12, 16), (5, 9, 12)], "bpm": 72, "compassos": 2,
              "baixo": 0.5, "corte": 3500},
    # vi - IV - I - V com arpejo e batida leve
    "animada": {"prog": [(9, 12, 16), (5, 9, 12), (0, 4, 7), (7, 11, 14)], "bpm": 104, "compassos": 1,
                "baixo": 0.7, "arpejo": "colcheia", "bumbo": "1e3", "chimbal": "contra", "corte": 6000},
    # ii7 - V7 - Imaj7 - vi7, batida arrastada e chiado de vinil
    "lofi": {"prog": [(2, 5, 9, 12), (7, 11, 14, 17), (0, 4, 7, 11), (9, 12, 16, 19)], "bpm": 78, "compassos": 1,
             "baixo": 0.6, "arpejo": "rhodes", "bumbo": "1e3", "caixa": "2e4", "chimbal": "contra", "chiado": True,
             "corte": 2600},
    # i - VI - III - VII em ré menor, pads cheios e tambores graves
    "epica": {"prog": [(2, 5, 9), (10, 14, 17), (5, 9, 12), (0, 4, 7)], "bpm": 88, "compassos": 1,
              "baixo": 0.9, "tambores": True, "pad": 0.75, "corte": 5000, "cresce": True},
    # drone menor, pulso de coração e notas agudas soltas
    "suspense": {"prog": [(2, 5, 9), (2, 5, 9), (10, 14, 17), (9, 13, 16)], "bpm": 64, "compassos": 2,
                 "baixo": 0.8, "pulso": True, "agudas": True, "corte": 2400},
    # I - IV - V - I, saltitante, com palmas
    "alegre": {"prog": [(0, 4, 7), (5, 9, 12), (7, 11, 14), (0, 4, 7)], "bpm": 118, "compassos": 1,
               "baixo": 0.6, "arpejo": "saltita", "bumbo": "1e3", "caixa": "palma", "chimbal": "colcheia",
               "corte": 7000},
    # vi - IV - I - V, bumbo em todo tempo e baixo no contratempo
    "eletronica": {"prog": [(9, 12, 16), (5, 9, 12), (0, 4, 7), (7, 11, 14)], "bpm": 122, "compassos": 1,
                   "baixo": 0.0, "baixo_contra": True, "arpejo": "semicolcheia", "bumbo": "todos", "caixa": "2e4",
                   "chimbal": "contra", "corte": 6500},
}
ESTILO_PADRAO = "calma"


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


def caixa(rng, palma=False):
    """Caixa (ou palma): ruído curto com um corpo grave."""
    n = int(0.18 * SR)
    t = np.arange(n) / SR
    ruido = rng.standard_normal(n)
    ruido = ruido - passa_baixa(ruido, 1500)
    if palma:  # três batidas bem juntas
        e = sum(np.exp(-np.clip(t - d, 0, None) * 60) * (t >= d) for d in (0, 0.012, 0.024))
        return ruido * e * 0.12
    corpo = np.sin(2 * np.pi * 190 * t) * np.exp(-t * 30)
    return (ruido * np.exp(-t * 22) * 0.18 + corpo * 0.15)


def tambor(rng):
    """Tambor grave de trilha épica."""
    n = int(0.6 * SR)
    t = np.arange(n) / SR
    f = 60 + 40 * np.exp(-t * 12)
    corpo = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * 5)
    ruido = rng.standard_normal(n) * np.exp(-t * 40) * 0.15
    return (corpo + ruido) * 0.8


def baixo_curto(raiz, dur):
    """Baixo serrilhado curto (eletrônica)."""
    n = int(dur * SR)
    t = np.arange(n) / SR
    f = freq(raiz % 12, 2)
    serra = 2 * ((f * t) % 1) - 1
    return serra * envelope(n, 0.005, dur * 0.6) * 0.35


def rhodes(nota, dur):
    """Piano elétrico: seno com um brilho que some rápido."""
    n = int(dur * SR)
    t = np.arange(n) / SR
    f = freq(nota, 4)
    return (np.sin(2 * np.pi * f * t) + 0.3 * np.sin(4 * np.pi * f * t) * np.exp(-t * 6)) * np.exp(-t * 2.5) * 0.18


def gera(estilo, segundos):
    cfg = ESTILOS.get(estilo) or ESTILOS[ESTILO_PADRAO]
    batida = 60 / cfg["bpm"]
    compasso = 4 * batida
    por_acorde = compasso * cfg["compassos"]
    total = int((segundos + 1) * SR)
    mix = np.zeros(total + SR * 3)
    rng = np.random.default_rng(7)
    prog = cfg["prog"]
    t0, k = 0.0, 0
    while t0 < segundos + 1:
        acorde = prog[k % len(prog)]
        i = int(t0 * SR)
        soma(mix, i, pad(acorde, por_acorde + 0.6) * cfg.get("pad", 0.55))
        for c in range(int(round(por_acorde / compasso))):
            j = i + int(c * compasso * SR)
            if cfg.get("baixo"):
                soma(mix, j, baixo(acorde[0], compasso) * cfg["baixo"])
            for b in range(4):  # tempos do compasso
                q = j + int(b * batida * SR)
                bumbo_em = cfg.get("bumbo")
                if bumbo_em == "todos" or (bumbo_em == "1e3" and b in (0, 2)):
                    soma(mix, q, bumbo() * 0.55)
                cx = cfg.get("caixa")
                if cx and b in (1, 3):
                    soma(mix, q, caixa(rng, palma=cx == "palma"))
                if cfg.get("tambores") and b in (0, 2):
                    soma(mix, q, tambor(rng) * (0.6 if b else 0.9))
                if cfg.get("pulso") and b == 0:  # tum-tum de coração
                    soma(mix, q, bumbo() * 0.6)
                    soma(mix, q + int(0.22 * SR), bumbo() * 0.4)
                ch = cfg.get("chimbal")
                if ch:
                    for m in range(2):  # colcheias
                        if ch == "colcheia" or (ch == "contra" and m == 1):
                            soma(mix, q + int(m * batida / 2 * SR), chimbal(rng))
                if cfg.get("baixo_contra"):
                    soma(mix, q + int(batida / 2 * SR), baixo_curto(acorde[0], batida / 2))
        arp = cfg.get("arpejo")
        if arp:
            passo = {"colcheia": batida / 2, "semicolcheia": batida / 4, "saltita": batida / 2, "rhodes": batida}[arp]
            for e in range(int(por_acorde / passo)):
                j = i + int(e * passo * SR)
                if arp == "rhodes":
                    if e % 2 == 0:  # acorde quebrado nos tempos 1 e 3, um pouco atrasado (jeito lo-fi)
                        for v, nota in enumerate(acorde):
                            soma(mix, j + int((0.03 + v * 0.025) * SR), rhodes(nota, batida * 2))
                    continue
                padrao = [0, 1, 2, 1] if arp != "saltita" else [0, 2, 1, 2]
                nota = acorde[padrao[e % 4] % len(acorde)] + 12 * (e % 8 >= 4)
                soma(mix, j, pluck(nota, passo * 2) * (0.7 if arp == "semicolcheia" else 1))
        if cfg.get("agudas") and k % 2 == 1:  # notas agudas soltas no suspense
            soma(mix, i + int(compasso * 0.5 * SR), pluck(acorde[2] + 12, compasso) * 0.6)
        t0 += por_acorde
        k += 1
    mix = passa_baixa(mix[:total], cfg["corte"])
    if cfg.get("chiado"):  # chiado de vinil: ruído baixinho e estalos raros
        ruido = rng.standard_normal(total) * 0.006
        estalos = (rng.random(total) < 0.00004) * rng.standard_normal(total) * 0.25
        mix += passa_baixa(ruido, 4000) + estalos
    if cfg.get("cresce"):  # épica: começa contida e cresce
        mix *= np.linspace(0.55, 1.0, len(mix))
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
        raise SystemExit("Uso: python scripts/musica.py <" + "|".join(ESTILOS) + "> <segundos> <saida.wav>")
    grava(gera(sys.argv[1], float(sys.argv[2])), sys.argv[3])
    print(f"Trilha {sys.argv[1]} de {float(sys.argv[2]):.0f} s pronta")
