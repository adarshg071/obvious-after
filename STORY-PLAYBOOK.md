# Story playbook (v2, 2026-11-09)

Distilled from the animated-reels guide and the three reference reels. Apply this to
every script, render and review — not as advice, as a checklist.

## The 22–26 second shape

| Time | Beat | Job |
|---|---|---|
| 0.0–0.2 | Cold open | Most charged image + first words. No logo, no lead-in. |
| 0.2–3.2 | Hook | One contradiction / number / confession. ≤8 words. Raises a question. |
| 3.2–8 | Lock-in | 2–3 lines: who, what's at risk, why care. Not filler. |
| 8–16 | Body 1 + rehook | New clue, then a line that reopens the question. |
| 16–20 | Body 2 + headfake | Flip the obvious assumption. |
| 20–23 | Payoff | Answer the hook's question. |
| 23–26 | Kicker | Reframe in one quotable line, 8–12 words. |
| 26–28 | End card | CTA tied to the emotion. Max 2.5s. |

One idea, one conflict, one payoff. 6–11 dialogue lines. Every line must add information
or emotion; delete anything that could be cut without loss.

## Format rotation (do not default to two people talking)

Three formats, all valid. Rotate them; never force a second character in to fill the frame.

| Format | Cast | Text | Length |
|---|---|---|---|
| Two-hander | 2–3 | speech bubbles | 18–26s |
| Solo | 1 | bubbles or one-line captions | 12–20s |
| Silent action | 1 (or 1 + pet/prop) | **none** | 7–14s |

- A solo reel is a complete story: one character, one want, one obstacle.
- **Silent action reels have no dialogue and no captions at all.** The character
  performs the joke; foley, music and camera carry the meaning. Hook is visual in
  the first 0.5s. 5–8 action beats, hard cuts, one punchline frame, then the end card.
- At least one of every week's reels should be silent action; mix them into the
  two-a-day schedule instead of always shipping dialogue.

## Hook (text > visual)

- The caption is the hook; there is no voice. Text beats visuals for speed of reading.
- Frame 1 must *prove* the line. If the hook says photo, show the phone/polaroid.
- Formats that work: contradiction, specific number, confession, suspense, twist setup.
- The kicker must answer the hook. If it doesn't, rewrite one of them.

## Curiosity loop

1. **Stakes** — rootable character + something at risk + urgency.
2. **Big question** — planted in the hook, answered only at the payoff.
3. **Headfake** — contradict what the viewer assumes.
4. **Rehook** — a new small question every 6–8 seconds.

Withhold the answer until ~75% of the reel. Silence before it lands.

## Captions

- 2–5 words per bubble; 3–8 absolute max. One thought.
- Whole line appears at once (120ms fade), never word-by-word.
- Hold ≈ reading time + 0.3s; emotional lines get +0.5s.
- One accent-highlighted word per line, on the word that carries the emotion.
- Keep out of the bottom 250px / right 120px. Never cover a face.
- Mute test: the story must read with sound off.

## Cast and continuity

- 2–5 recurring characters, named by role (organiser, ghost, her, him).
- Fixed accent + silhouette per character across reels. Recognition = series.
- Mood is content: the speaker's face changes per line; listeners keep their own face.
- `figure`: stand / sit / wave / slump. Change it per scene when the story moves
  (e.g. slump in bed, wave on the street).
- Cast positions live in `cast[].x`; a scene can override with `"pos": { "him": 0.5 }`.

## Scenes

- 2–4 scenes. Every cut changes information or emotion.
- Open on the most charged location, end on the quietest.
- Night = doubt, day = clarity. Keep lighting logic consistent.
- 4 actors at x = 0.16 / 0.36 / 0.6 / 0.84; 2 actors at 0.3 / 0.58.
- Leave the top third for the hook and the bottom quarter for platform UI.
- A mid-line location cut (café "I'll cover it if you just—" → street "—pay me back")
  is cheap film grammar. Use it.

## Animation rules

- Change something every 1.5–2s: cut, expression, camera, prop, ambient, light.
- Camera: push-in on hook and headfake, pull-back on the payoff. Never shake.
- Ambient: rain on street-night, glow in room-night, dust in park. Subtle, behind actors.
- Props: one at a time, in the speaker's outer hand (phone, photo, bill).
- Faces: per-line mood + blink. Mouth flaps only while speaking.
- Speech bubbles sit fully above the speaker's head; the tail may touch, the box never covers a face. Anchored from head height, capped so it stays inside the Instagram 4:5 crop.
- Scaled characters: keep `scale` ≤ 1.4, or the bubble is forced into the crop zone.
- Never animate text line-by-line or bounce every word.
- Everything is driven from `renderAt(ms)`; no CSS keyframes (capture seeks frames).

## Sound

| Moment | Sound |
|---|---|
| Hook lands | whoosh + soft thump |
| Scene cut | whoosh/swell, then thump/click |
| Inside a scene | soft tick on speaker change only; no sound on every line |
| Reveal/headfake | 0.45s near-silence, then one impact/ding (`duck: true`) |
| Into the kicker | short riser, then mood accent |
| End card | pop, resolve |

- Music: warm = love, bright = funny, tense = mind. One bed per reel, ducked before reveals.
- Every reel is seeded from its slug: key, tempo, lead instrument and SFX palette vary. Two reels must never share the same bed.
- Repeated action effects (crunch, door, step) rotate at least three variants; never use the identical sample twice in one reel.
- Never stack effects. Silence is an effect.

## Topic JSON (scene format)

```json
{
  "id": "slug", "subject": "title", "pillar": "love",
  "format": "scene", "style": "love", "motion": "drift", "music": "warm",
  "hook": { "say": "...", "lines": ["...", "*highlight*"] },
  "cast": { "her": { "figure": "stand", "mood": "flat", "accent": "#C2185B", "x": 0.36 } },
  "scenes": [
    { "bg": "street", "time": "night", "cast": ["her", "him"],
      "pos": { "him": 0.68 },
      "lines": [
        { "who": "her", "say": "One more.", "mood": "smile", "prop": "phone" },
        { "who": "her", "say": "This is the one you *deleted*.", "mood": "wavy",
          "duck": true, "cam": "push", "prop": "photo" }
      ] }
  ],
  "kicker": { "say": "...", "lines": ["...", "*...*"] },
  "end": { "lines": ["Send this to", "the one who *gets* it."], "pill": "SEND IT" },
  "caption": "context, never the twist",
  "hashtags": ["#love", "#relationships", "#storytime"]
}
```

Optional line fields: `prop`, `cam` (`push`/`pull`), `duck`, `figure`, `dur`, `mood`.

## Before render

- Hook ≤8 words and frame 1 proves it.
- Kicker answers the hook; would you screenshot it?
- One headfake; no dead line.
- Mute test passes.
- Runtime 22–26s.

## After post

- Watch 3-second retention first, then saves and follows per 1k. Likes are noise.
- One reel 5× median → make three variations within 48 hours.
