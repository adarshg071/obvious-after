#!/usr/bin/env python3
"""Music bed + sound effects for caption-only reels.

Synth comes from the Lemo-Opuscar audio core (MIT), installed at ~/lemo-opuscar:
  sh plugin/skills/lemo-opuscar/scripts/setup.sh deps music

  python3 bed.py --out bed.wav --duration 32.5 --mood warm --beats 0.35,3.9,8.2
"""
import argparse
import hashlib
import os
import sys
import wave

import numpy as np

LIB = os.environ.get("LEMO_OPUSCAR_HOME", os.path.expanduser("~/lemo-opuscar"))
sys.path.insert(0, LIB)
from core.audio import pluck as P  # noqa: E402
from core.audio import sfx as S  # noqa: E402

SR = S.SR

SCORES = {
    # warm: kalimba over nylon guitar, major-ish, for money / body / life reels
    "warm": {
        "bpm": 84,
        "prog": [
            ("A2", ["A3", "C4", "E4", "A4"]),
            ("F2", ["F3", "A3", "C4", "F4"]),
            ("C3", ["C4", "E4", "G4", "C5"]),
            ("G2", ["G3", "B3", "D4", "G4"]),
        ],
    },
    # tense: koto over a low pulse, minor, for mind / psychology reels
    "tense": {
        "bpm": 74,
        "prog": [
            ("D2", ["D3", "F3", "A3", "D4"]),
            ("Bb1", ["Bb2", "D3", "F3", "Bb3"]),
            ("G1", ["G2", "Bb2", "D3", "G3"]),
            ("A1", ["A2", "C#3", "E3", "A3"]),
        ],
    },
    # bright: bouncy major kalimba, for funny reels
    "bright": {
        "bpm": 108,
        "prog": [
            ("C3", ["C4", "E4", "G4", "C5"]),
            ("G2", ["G3", "B3", "D4", "G4"]),
            ("A2", ["A3", "C4", "E4", "A4"]),
            ("F2", ["F3", "A3", "C4", "F4"]),
        ],
    },
}


def boing(seed=0):
    """Cartoon spring: fast upward pitch bend with a wobble."""
    d = 0.5
    tt = np.arange(int(round(d * SR))) / SR
    f = (190 + 25 * (seed % 4)) * (1 + 2.1 * tt / d)
    x = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-tt / 0.16)
    return S.norm(x * (1 + 0.12 * np.sin(2 * np.pi * 17 * tt)))


def gasp():
    """Voice-like taken-aback inhale: breathy noise over a falling tone."""
    d = 0.24
    tt = np.arange(int(round(d * SR))) / SR
    breath = S.bp(S.noise(d), 600, 2400) * S.env_exp(d, 0.05)
    tone = np.sin(2 * np.pi * (540 - 880 * tt / d) * tt) * S.env_exp(d, 0.045)
    return S.norm(breath + tone * 0.55)


def alarm():
    """Two short phone-alarm chirps, softened so they sit under the voice."""
    d = 0.4
    tt = np.arange(int(round(d * SR))) / SR
    gate = (((tt < 0.11) | ((tt > 0.17) & (tt < 0.28))).astype(float))
    return S.norm(S.lp(np.sign(np.sin(2 * np.pi * 880 * tt)) * gate, 3200)) * 0.55


# Per-reel lead voice + arpeggio, picked by the slug seed.
LEAD = {
    "warm": ["kalimba", "music_box", "harp"],
    "bright": ["kalimba", "banjo", "music_box"],
    "tense": ["koto", "shamisen", "pipa"],
}
ARPS = [[0, 2, 1, 3, 2, 1, 3, 2], [0, 1, 3, 2, 3, 1, 0, 2]]
ARP_BRIGHT = [[0, 1, 2, 3, 2, 1, 2, 3], [0, 2, 3, 1, 3, 2, 0, 1]]


def add(buf, x, at, gain=1.0, pan=0.0):
    """Mix mono x into stereo buf at `at` seconds, equal-power pan."""
    s = int(round(at * SR))
    if s >= len(buf) or s + len(x) <= 0:
        return
    if s < 0:
        x = x[-s:]
        s = 0
    e = min(len(buf), s + len(x))
    l, r = np.cos((pan + 1) * np.pi / 4), np.sin((pan + 1) * np.pi / 4)
    buf[s:e, 0] += x[: e - s] * gain * l
    buf[s:e, 1] += x[: e - s] * gain * r


def hat():
    d = 0.045
    return S.norm(S.hp(S.noise(d), 7000)) * S.env_exp(d, 0.012) * 0.5


def crunch(variant=0):
    """Dry leaf stomp; the variant changes weight and brightness so repeats differ."""
    d = (0.13, 0.19, 0.26)[variant % 3]
    tt = np.arange(int(round(d * SR))) / SR
    low = np.sin(2 * np.pi * (98 - 7 * variant) * tt) * np.exp(-tt / 0.03) * 0.5
    hiss = S.hp(S.noise(d), 1000 + 550 * variant) * S.env_exp(d, 0.018 + 0.009 * variant)
    return S.norm(hiss + low)


# —— Room tone + foley. The set is a room, so it must sound like one. ——

noise, bp, lp, hp, norm, env_exp, t_ = S.noise, S.bp, S.lp, S.hp, S.norm, S.env_exp, S.t_
click, clack, ding = S.click, S.clack, S.ding
creak, whoosh, thump, step = S.creak, S.whoosh, S.thump, S.step

def rain(d):
    """Steady rain against glass: broadband hiss behind the frame, gusting, with a
    few drops close enough to hear. Soft and round: rain heard through a window."""
    tt = t_(d)
    body = bp(noise(d), 350, 4200)
    gust = 0.72 + 0.28 * np.sin(2 * np.pi * 0.061 * tt + 0.7) * np.sin(2 * np.pi * 0.017 * tt + 2.0)
    out = body * gust
    for _ in range(int(d * 1.1)):  # individual drops landing on the glass
        at = np.random.rand() * max(0.01, d - 0.05)
        drop = bp(noise(0.05), 1400, 3600) * np.exp(-t_(0.05) / 0.008)
        s = int(at * SR); out[s:s + len(drop)] += drop[: len(out) - s] * 1.6
    return out


def room(d):
    """Low room tone: fridge compressor + air handling, the sound of an empty diner."""
    tt = t_(d)
    hum = np.sin(2 * np.pi * 57 * tt) * 0.5 + np.sin(2 * np.pi * 114 * tt) * 0.2
    air = lp(noise(d), 220)
    return norm(hum * 0.35 + air) * (0.85 + 0.15 * np.sin(2 * np.pi * 0.09 * tt))


def crickets(d):
    """Night insects in a clearing: a few chirp trains at different pitches and
    rates, over the low air the trees hold."""
    tt = t_(d)
    out = lp(noise(d), 190) * 0.55
    for k in range(5):
        rate = 2.6 + 1.3 * k
        f = 3800 + 620 * k
        gate = (np.sin(2 * np.pi * rate * tt + k * 1.7) > 0.82).astype(float)
        out += bp(noise(d), f - 400, f + 400) * gate * (0.09 - 0.012 * k)
    return norm(out)


def sizzle(d):
    """Griddle in the next room: gated band-passed noise."""
    tt = t_(d)
    gate = (np.sin(2 * np.pi * 0.7 * tt) > 0.1).astype(float) * (0.6 + 0.4 * np.random.rand(len(tt)))
    return bp(noise(d), 900, 4200) * gate * 0.5


def tick(d):
    """Wall clock: a dry escapement click each second, tick then tock."""
    out = np.zeros(int(d * SR))
    for k in range(int(d) + 1):
        s = int(k * SR)
        if s >= len(out):
            break
        x = hp(noise(0.025), 2200) * np.exp(-t_(0.025) / 0.003)
        out[s:s + len(x)] += x[: len(out) - s] * (1.0 if k % 2 else 0.7)
    return norm(out)


def library(d):
    """Late branch library: air handling, a clock on the wall, rain on the far windows."""
    return norm(lp(noise(d), 380) * 0.75 + tick(d) * 0.14 + rain(d) * 0.13)


def birds(d):
    """Sparrows on a wet pavement, a street away: a few notes, then nothing."""
    out = np.zeros(int(d * SR))
    t = 1.4
    while t < d - 0.7:
        f0 = np.random.uniform(2600, 3500)
        for k in range(int(np.random.randint(3, 6))):
            dd = np.random.uniform(0.045, 0.09)
            tt = t_(dd)
            f = f0 * (1 + 0.3 * k) * (1 + 0.05 * np.sin(2 * np.pi * 45 * tt))
            x = np.sin(2 * np.pi * f * tt) * np.sin(np.pi * tt / dd) ** 2
            s = int((t + k * np.random.uniform(0.06, 0.11)) * SR)
            e = min(len(out), s + len(x))
            if s < len(out):
                out[s:e] += x[: e - s] * np.random.uniform(0.08, 0.18)
        t += np.random.uniform(1.7, 3.6)
    return out


def chime():
    """Diner door bell: two struck notes a third apart."""
    out = np.zeros(int(1.4 * SR))
    for f, at in ((1046, 0.0), (784, 0.19)):
        d = 1.2
        tt = t_(d)
        x = sum(a * np.sin(2 * np.pi * f * m * tt) * env_exp(d, tau)
                for m, a, tau in ((1, 1, 0.55), (2.01, 0.45, 0.3), (3.02, 0.2, 0.15), (4.07, 0.1, 0.08)))
        s = int(at * SR); out[s:s + len(x)] += norm(x, 0.7)[: len(out) - s]
    return out


def cup():
    """Ceramic cup set down on a laminate table."""
    x = clack(1.35) * 0.8
    tt = t_(0.5)
    ring = np.sin(2 * np.pi * 1870 * tt) * env_exp(0.5, 0.05) * 0.25
    y = np.zeros(int(0.5 * SR)); y[: len(x)] += x
    return norm(y + ring)


def pour():
    """Coffee hitting the bottom of a cup, then filling up."""
    d = 1.1; tt = t_(d)
    level = 0.35 + 0.65 * (tt / d)                     # pitch rises as the cup fills
    x = bp(noise(d), 500, 2000) * (0.55 + 0.45 * np.abs(np.sin(2 * np.pi * 7 * tt)))
    return norm(x * np.sin(np.pi * tt / d) ** 0.6) * level


def scratch():
    """Pen on a paper napkin: three short dry strokes."""
    out = np.zeros(int(0.42 * SR))
    for k in range(3):
        s = int((0.03 + k * 0.11) * SR)
        st = hp(noise(0.09), 3000) * np.sin(np.pi * t_(0.09) / 0.09) ** 2
        out[s:s + len(st)] += st[: len(out) - s] * (1 - 0.2 * k)
    return norm(out)


def bell():
    """Brass desk bell: one bright struck note, inharmonic, over in half a second."""
    d = 0.7
    tt = t_(d)
    x = sum(a * np.sin(2 * np.pi * f * tt) * env_exp(d, tau)
            for f, a, tau in ((2093, 1.0, 0.4), (2960, 0.5, 0.24), (4310, 0.28, 0.13), (5270, 0.12, 0.07)))
    return norm(x)


def page():
    """A page turned: two papery swishes, the second longer and softer."""
    out = np.zeros(int(0.55 * SR))
    for at, d, gain in ((0.0, 0.2, 0.9), (0.19, 0.3, 0.7)):
        s = int(at * SR)
        x = bp(noise(d), 1200, 6500) * np.sin(np.pi * t_(d) / d) ** 1.6
        out[s:s + len(x)] += x[: len(out) - s] * gain
    return norm(out)


def stamp():
    """Date stamp pressed onto a card: a dull knock and the ink pad under it."""
    out = np.zeros(int(0.5 * SR))
    knock = thump(0.5, 90) * 0.9
    out[: len(knock)] += knock
    pad = lp(noise(0.12), 700) * env_exp(0.12, 0.03) * 0.35
    s = int(0.04 * SR)
    out[s:s + len(pad)] += pad[: len(out) - s]
    return norm(out)


def scrape():
    """Booth bench dragged as someone gets up."""
    return creak(0.7) * 0.8 + lp(noise(0.22), 900) * S.env_exp(0.22, 0.06) * 0.3


def cloth():
    """Cloth shifting as someone settles in a seat: a short, soft rustle."""
    d = 0.34
    return bp(noise(d), 900, 5200) * np.sin(np.pi * t_(d) / d) ** 2 * 0.5


def chair():
    """Wooden chair taking weight: a dull settle with a dry rub after it."""
    out = np.zeros(int(0.45 * SR))
    k = thump(0.45, 120) * 0.55
    out[: len(k)] += k
    s = int(0.03 * SR)
    r = bp(noise(0.22), 700, 2600) * np.exp(-t_(0.22) / 0.05) * 0.35
    out[s:s + len(r)] += r[: len(out) - s]
    return norm(out)


def pipe():
    """Radiator ticking as the heating cools: four small metal knocks, uneven."""
    out = np.zeros(int(0.75 * SR))
    for at, f, g in ((0.0, 1180, 1.0), (0.19, 940, 0.55), (0.44, 1460, 0.4), (0.61, 1050, 0.25)):
        d = 0.1
        tt = t_(d)
        x = sum(a * np.sin(2 * np.pi * f * m * tt) * env_exp(d, tau)
                for m, a, tau in ((1, 1, 0.04), (2.41, 0.4, 0.025), (5.1, 0.18, 0.015)))
        s = int(at * SR)
        out[s:s + len(x)] += norm(x)[: len(out) - s] * g
    return norm(out) * 0.55


def car():
    """A car down the wet street outside: tyre hiss swelling past the windows."""
    d = 3.2
    tt = t_(d)
    env = np.sin(np.pi * np.clip(tt / d, 0, 1)) ** 2
    body = bp(noise(d), 80, 700) * env
    hiss = hp(noise(d), 2400) * env * 0.35
    return norm(body + hiss) * 0.42


def door():
    """The bell above the door plus the door itself."""
    out = np.zeros(int(1.2 * SR))
    w = whoosh(0.3) * 0.5
    out[: len(w)] += w
    t = thump(0.8, 95) * 0.7
    s = int(0.12 * SR); out[s:s + len(t)] += t[: len(out) - s]
    c = chime() * 0.55
    s = int(0.2 * SR); out[s:s + len(c)] += c[: len(out) - s] * 0.7
    return out


def squeak(d=0.6):
    """A trolley wheel that has needed oiling since 2019: one dry rising cry."""
    tt = t_(d)
    f = 1350 + 950 * (tt / d) ** 0.45 + 55 * np.sin(2 * np.pi * 11 * tt)
    ph = 2 * np.pi * np.cumsum(f) / SR
    x = np.sin(ph) * 0.62 + np.sin(2.01 * ph) * 0.24 + np.sin(3.03 * ph) * 0.1
    return norm(x * np.sin(np.pi * tt / d) ** 1.3)


FX = {
    "chime": chime, "cup": cup, "pour": pour, "scratch": scratch,
    "scrape": scrape, "door": door, "step": lambda: S.step(0.7) * 0.5,
    "creak": lambda: creak(0.6) * 0.5, "click": lambda: S.click(1.2) * 0.35,
    "bell": bell, "page": page, "stamp": stamp,
    "cloth": cloth, "chair": chair, "pipe": pipe, "car": car,
    "fire": lambda: sizzle(1.8) * 0.4, "squeak": squeak,
}

def tumble(d):
    """Six washers on spin: a low drum rumble with the load falling over each turn."""
    tt = t_(d)
    body = bp(noise(d), 70, 340)
    turn = 0.45 + 0.55 * np.abs(np.sin(2 * np.pi * 0.85 * tt + 0.4))
    knock = np.zeros(len(tt))
    for k in range(int(d * 1.1)):                      # the load hitting the drum wall
        at = int((0.2 + k * 0.92 + np.random.rand() * 0.1) * SR)
        hit = lp(noise(0.09), 220) * np.exp(-t_(0.09) / 0.03)
        e = min(len(knock), at + len(hit))
        knock[at:e] += hit[: e - at] * 0.55
    return norm(body * turn + knock)


AMBIENCE = {
    "diner": lambda d: room(d) * 0.55 + rain(d) * 0.5 + sizzle(d) * 0.06,
    "laundry": lambda d: room(d) * 0.35 + tumble(d) * 0.5,
    "street": lambda d: rain(d) * 0.7 + room(d) * 0.15,
    # 6:52 a.m.: a room not yet awake, a clock, birds a street away
    "dawn": lambda d: room(d) * 0.5 + tick(d) * 0.1 + birds(d) * 0.55 + bp(noise(d), 50, 280) * 0.1,
    # four floors up over a courtyard: air, and the city under it
    "balcony": lambda d: room(d) * 0.5 + bp(noise(d), 40, 260) * 0.16,
    # a clearing at night: insects, and a fire close enough to hear
    "jungle": lambda d: crickets(d) * 0.75 + bp(noise(d), 40, 320) * 0.12,
    "library": lambda d: library(d),
    "room": lambda d: room(d),
}


def ambience(kind, duration, fx):
    """Room tone for the whole reel + one-shot foley at `fx` = [(t, name), ...]."""
    d = duration + 0.5
    mono = np.zeros(int(d * SR), np.float32)
    layer = AMBIENCE.get(kind, AMBIENCE["room"])(d)
    mono[: len(layer)] += layer[: len(mono)] * 0.22
    for at, name in fx:
        fn = FX.get(name)
        if not fn or at < 0 or at > duration:
            continue
        x = fn()
        s = int(at * SR)
        if s >= len(mono):
            continue
        e = min(len(mono), s + len(x))
        mono[s:e] += x[: e - s] * 0.85
    buf = np.stack([mono, np.roll(mono, 61)], axis=1)   # 1.3 ms offset: wide, no phase hole
    peak = np.abs(buf).max()
    if peak > 0:
        buf *= 0.9 / peak
    return buf[: int(duration * SR)]


# Every reel gets its own key + tempo + sound palette, seeded from its slug,
# so two reels in the same mood never sound alike.
NOTE_VALUE = {"C": 0, "C#": 1, "Db": 1, "D": 2, "D#": 3, "Eb": 3, "E": 4, "F": 5,
              "F#": 6, "Gb": 6, "G": 7, "G#": 8, "Ab": 8, "A": 9, "A#": 10, "Bb": 10, "B": 11}
SHARP = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"]


def seed_num(seed):
    return int(hashlib.sha1(seed.encode()).hexdigest()[:8], 16)


def transpose(note, k):
    octave = int(note[-1]) + (NOTE_VALUE[note[:-1]] + k) // 12
    return SHARP[(NOTE_VALUE[note[:-1]] + k) % 12] + str(octave)


# Three rotating cut sounds per mood, so consecutive cuts never sound the same.
CUTS = {
    "warm": [(lambda: S.pop(1.0), 0.13), (lambda: S.click(1.15), 0.10), (lambda: S.clack(1.05), 0.08)],
    "bright": [(lambda: S.clack(1.2), 0.15), (lambda: S.pop(1.35), 0.15), (lambda: S.click(1.5), 0.12)],
    "tense": [(lambda: S.thump(0.8, 62), 0.3), (lambda: S.creak(0.9), 0.14), (lambda: S.click(0.8), 0.09)],
}
# Kicker / end accent, one per mood.
KICK = {
    "warm": lambda p=0: S.ding(0.9 + 0.02 * (p % 4)),
    "bright": lambda p=0: S.quindar(1.0, 1650 + 130 * (p % 6)),
    "tense": lambda p=0: S.crash(0.65 + 0.03 * (p % 4)),
}


def cut_sfx(buf, mood, beats, kinds, scenes, seed=0):
    """One sound per picture cut: full cut on a scene change, soft tick inside a scene."""
    cuts = CUTS.get(mood, CUTS["warm"])
    kick = KICK.get(mood, KICK["warm"])
    off = seed % len(cuts)
    crunch_n = 0
    for i, bt in enumerate(beats):
        kind = kinds[i] if i < len(kinds) else "type"
        scene = scenes[i] if i < len(scenes) else 0
        first = i == 0 or scene != (scenes[i - 1] if i else scene)
        pan = 0.3 if i % 2 else -0.3
        if kind == "hook":
            add(buf, S.whoosh(0.5), bt - 0.34, 0.32, pan=pan)
            add(buf, S.thump(0.7, 78 + seed % 24 - 12), bt + 0.02, 0.2, pan=-pan)
        elif kind == "kicker":
            add(buf, S.whoosh(0.32), bt - 0.28, 0.18, pan=pan)
            add(buf, kick(seed), bt + 0.04, 0.22, pan=-pan)
        elif kind == "end":
            add(buf, S.pop(1.2), bt - 0.02, 0.16, pan=pan)
            add(buf, kick(seed), bt + 0.18, 0.16, pan=-pan)
        elif kind == "crunch":
            add(buf, crunch(crunch_n + seed % 3), bt + 0.02, 0.24, pan=-0.15 if crunch_n % 2 else 0.2)
            crunch_n += 1
        elif kind == "boing":
            add(buf, boing(seed), bt + 0.02, 0.3, pan=pan)
        elif kind == "gasp":
            add(buf, gasp(), bt + 0.02, 0.24, pan=pan)
        elif kind == "alarm":
            add(buf, alarm(), bt + 0.02, 0.26, pan=0.15)
        elif kind == "click":
            add(buf, S.click(1.55), bt + 0.02, 0.1, pan=pan)
        elif kind == "step":
            add(buf, S.step(0.9), bt + 0.02, 0.16, pan=pan)
        elif kind == "heart":
            add(buf, S.heartbeat(), bt + 0.02, 0.26, pan=0)
        elif kind == "action":
            pass  # silent action reel: picture cuts stay quiet, line `sfx` carries the foley
        elif first:
            fn, gain = cuts[(i + off) % len(cuts)]
            add(buf, fn(), bt - 0.02, gain, pan=pan)
        elif i % 2 == 0:
            fn, gain = cuts[(i + off) % len(cuts)]
            add(buf, fn(), bt - 0.02, gain * 0.35, pan=pan)


def duck_bed(buf, ducks):
    """Near-silence just before a reveal, so the line lands."""
    for d in ducks:
        s, e = int(max(0, d - 0.55) * SR), int(d * SR)
        n = e - s
        if n <= 0:
            continue
        w = np.ones(n, np.float32)
        a, b = int(n * 0.4), int(n * 0.85)
        w[:a] = np.linspace(1, 0.1, a)
        w[a:b] = 0.1
        w[b:] = np.linspace(0.1, 1, n - b)
        buf[s:e] *= w[:, None]


def score(duration, mood, beats, kinds=None, scenes=None, ducks=None, seed_text=""):
    seed = seed_num(seed_text) if seed_text else 0
    spec = SCORES[mood]
    beat = 60.0 / (spec["bpm"] + seed % 7 - 3)
    bar = beat * 4
    n = int(duration * SR) + SR // 2
    buf = np.zeros((n, 2), np.float32)
    shift = seed % 5 - 2
    prog = [(transpose(root, shift), [transpose(t, shift) for t in tones])
            for root, tones in spec["prog"]]
    lead = LEAD[mood][seed % 3]
    arp = (ARPS if mood == "warm" else ARP_BRIGHT)[seed % 2]

    if mood == "warm":
        for b in range(int(np.ceil(duration / bar))):
            root, tones = prog[b % len(prog)]
            t0 = b * bar
            add(buf, P.strum("nylon_guitar", tones, 2.2, vel=0.30, spread=0.018), t0, 0.32, pan=-0.15)
            add(buf, P.pluck("upright_bass_pizz", root, 1.0, vel=0.55), t0, 0.55)
            add(buf, P.pluck("upright_bass_pizz", tones[1], 0.9, vel=0.4), t0 + 2 * beat, 0.45)
            for k in range(8):
                note = tones[arp[k] % len(tones)]
                vel = 0.55 if k % 4 == 0 else 0.38
                pan = -0.35 if k % 2 else 0.35
                add(buf, P.pluck(lead, note, 1.6, vel=vel), t0 + k * beat / 2, 0.5, pan=pan)
            for k in (1, 3, 5, 7):
                add(buf, hat(), t0 + k * beat / 2, 0.05, pan=0.2)
    elif mood == "bright":
        for b in range(int(np.ceil(duration / bar))):
            root, tones = prog[b % len(prog)]
            t0 = b * bar
            add(buf, P.pluck("upright_bass_pizz", root, 0.7, vel=0.5), t0, 0.5)
            add(buf, P.pluck("upright_bass_pizz", tones[2], 0.5, vel=0.35), t0 + 2 * beat, 0.4)
            for k in range(8):
                note = tones[arp[k] % len(tones)]
                add(
                    buf,
                    P.pluck(lead, note, 0.9, vel=0.5 if k % 2 == 0 else 0.34),
                    t0 + k * beat / 2,
                    0.42,
                    pan=0.25 if k % 2 else -0.25,
                )
            for k in (1, 3, 5, 7):
                add(buf, hat(), t0 + k * beat / 2, 0.06, pan=-0.3)
    else:
        for b in range(int(np.ceil(duration / bar))):
            root, tones = prog[b % len(prog)]
            t0 = b * bar
            add(buf, S.rumble(bar * 1.2, 1) , t0, 0.18)
            add(buf, S.thump(1, 55), t0, 0.5)
            add(buf, S.thump(0.7, 50), t0 + 2 * beat, 0.35)
            add(buf, P.pluck("upright_bass_pizz", root, 1.4, vel=0.5), t0, 0.45)
            melody = [tones[0], tones[2], tones[1], tones[3]]
            for k, note in enumerate(melody):
                add(buf, P.pluck(lead, note, 1.8, vel=0.42), t0 + k * beat, 0.42, pan=-0.2 + 0.13 * k)

    # near-silence before a reveal, then the sound effects on every picture cut
    duck_bed(buf, ducks or [])
    cut_sfx(buf, mood, beats, kinds or [], scenes or [], seed)

    # fades
    fi, fo = int(0.12 * SR), int(min(1.2, duration / 4) * SR)
    buf[:fi] *= np.linspace(0, 1, fi)[:, None]
    buf[-fo:] *= np.linspace(1, 0, fo)[:, None]

    peak = np.abs(buf).max()
    if peak > 0:
        buf *= 0.72 / peak
    return buf[: int(duration * SR)]


def write_wav(path, buf):
    pcm = (np.clip(buf, -1, 1) * 32767).astype("<i2")
    with wave.open(path, "wb") as w:
        w.setnchannels(2)
        w.setsampwidth(2)
        w.setframerate(SR)
        w.writeframes(pcm.tobytes())


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--out", required=True)
    ap.add_argument("--duration", type=float, required=True)
    ap.add_argument("--mood", default="warm", choices=sorted(SCORES))
    ap.add_argument("--beats", default="")
    ap.add_argument("--kinds", default="")
    ap.add_argument("--scenes", default="")
    ap.add_argument("--duck", default="")
    ap.add_argument("--seed", default="")
    ap.add_argument("--amb", default="", help="room tone: diner | street | room")
    ap.add_argument("--fx", default="", help="t:name,t:name — one-shot foley at absolute seconds")
    a = ap.parse_args()
    if a.amb:
        fx = []
        for item in a.fx.split(","):
            if ":" in item:
                at, name = item.split(":", 1)
                fx.append((float(at), name.strip()))
        write_wav(a.out, ambience(a.amb, a.duration, fx))
        return
    beats = [float(x) for x in a.beats.split(",") if x.strip()]
    kinds = [x.strip() for x in a.kinds.split(",") if x.strip()]
    scenes = [int(x) for x in a.scenes.split(",") if x.strip()]
    ducks = [float(x) for x in a.duck.split(",") if x.strip()]
    rows = [i for i, b in enumerate(beats) if b > 0.05]
    write_wav(
        a.out,
        score(
            a.duration,
            a.mood,
            [beats[i] for i in rows],
            [kinds[i] if i < len(kinds) else "line" for i in rows],
            [scenes[i] if i < len(scenes) else 0 for i in rows],
            ducks,
            a.seed,
        ),
    )


if __name__ == "__main__":
    main()
