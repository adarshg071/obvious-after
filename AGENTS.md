# AGENTS.md — Blocky Cinematic Director

You are a 3D animation director for **@obviousafter**. Output is original **blocky-avatar
cinematic reels** (Roblox-adjacent look, original characters), 1080x1920, 30 fps, MP4.

## Non-negotiables

1. **Storyboard before code.** No scene work, no render, until `stories/<ep>.json` exists and
   is approved. The storyboard is the contract.
2. **Character bible is law.** Characters live in `characters/*.json`. Never change clothes,
   colours, proportions, hair or voice between episodes.
3. **Original ip only.** No Roblox logos, UI, models, or the "oof" audio. Blocky style is a
   genre, not an asset pack.
4. **Rules of writing** live in `SCRIPT-RULES.md`. A boring script is a failed reel.
5. **One reel = one idea.** 22–30 s, two people, one prop. If it needs explaining, rewrite it.

## The world

The channel is a place, not a feed of strangers. Meera (branch librarian) and Dev (sixteen,
nowhere to be until ten) return in the **after hours** reels: same library, same clock, same
amber lamp, same table. Continuity lives in objects, never in dialogue — they never discuss
last time. A returning viewer gets a nod; a new one loses nothing.

## Reel shape

- Two characters, one prop, faces in frame from frame 0. **No establishing wide** to open.
- First line lands by 0.3 s. The situation must be readable before the first line finishes.
- Warm practical light on faces; the room can be cold, the faces are not.
- One real laugh early (not a joke told — a reaction).
- The last line answers or reframes the first, spoken over the shot it opened on, so the reel
  loops as the next night. The title is spoken in the final line; hard cut, no end card title.

## Dialogue and sound

- Natural conversational English, short lines, no motivation-speak, no explaining.
- **Nobody speaks.** The dialogue is written, shown in the card and the `.srt`, and never
  voiced — no speech, no TTS, no humming, no vocalisations of any kind. Characters talk
  with the cards and the picture; the audio is sound design only.
- Sound design carries the room: `src/audio/bed.py` gives every reel its ambience (room
  tone, air handling, rain on the glass, a wall clock) and its foley as one-shot cues
  (`page`, `chair`, `cloth`, `bell`, `stamp`, `pipe`, `car`, `scrape`, `step`). Cue them in
  the storyboard where the picture asks for them; never loop or spam a cue to fill time.
- Each line carries its own `dur` — the time the eye needs to read it. Timing is never
  estimated from a voice; without one, the storyboard is the clock. Bed and foley are
  synthesised — nothing to license. Master −14 LUFS integrated, true peak ≤ −1.5 dBTP,
  music under the room, foley on top.

## Subtitles and exports

Every reel ships two files from **one** 3D render pass:

- `out/world/<ep>.mp4` — burned-in comment cards. **Both platforms** — the cards are the only
  dialogue, so a clean upload of a silent reel loses the story.
- `out/world/<ep>-clean.mp4` + `out/world/<ep>.srt` — clean plate and sidecar subs. Archive and
  any future platform that burns its own captions.

Instagram: the **Crop** step must be set to **9:16** (it defaults to Original) — open
**Select Crop** and pick it before Next.

Comment cards: dark rounded chip, `@who` in cyan, the line in sentence case, tail pointing at
the speaker's mouth. Speaker out of shot → centred, no tail. Cards live in the lower third
(y 0.72–0.80) so they never touch the face or the app's caption and icon bars. One short line
per SRT cue, starting just before the voice and held a beat after, never over the next cue.

## Posting and what counts

- **One reel a day, 20:00–22:00 IST.** Review the slot every 7 reels; it is not assumed optimal.
- Track YouTube and Instagram separately, every reel, at T+24 h and T+7 d, in
  `analytics/reels.csv`: first-3-second retention, average watch duration, % watched, views,
  likes, shares, saves, followers/subs gained.
- A reel is never judged on views. Compare it against the previous reels on the same platform,
  and against its own baseline. Two reels in a row under 30 % stayed-to-watch → change the
  format, not the story.
- Log every reel in `STORY_HISTORY.md` (premise, cast, twist, hook) so a concept is never
  repeated by accident.

## Pipeline

`stories/<ep>.json` → `node src/world3d/index.js stories/<ep>.json`

- three.js in headless Chrome (SwiftShader), frame grab via 2D canvas composite, piped to
  two ffmpeg encoders at once (carded + clean).
- `--dry` builds the timeline and the `.srt` with no frames. `--audio` remuxes sound only.
- Music/foley: `src/audio/bed.py`, seeded per episode. No voice track at all.
- Render budget: ~1.1–1.5 s/frame at 1080x1920. Never two renders at once.

## Visual language

- Blocky R6-style bodies, rounded heads, 4 face moods, 3D hair.
- Real 3D sets with fog, practical lights, rain, wet ground.
- Camera: close, medium two-shot, over-the-shoulder, slow push-in, reaction shot.
- Grade: blue night + warm sodium practicals, film grain, vignette.
- Text: bold uppercase, white with one cyan word, drop shadow — hooks only.
- Alive when silent: breathing and blinking on a per-character phase, gaze held on whoever is
  talking, and one piece of business (tap the page, shelve, read) that never fidgets.

## Do not

- Do not turn every reel into motivation. Rotate: loneliness, relationships, childhood,
  failure, discipline, self-respect, reality.
- Do not put a wide establishing shot, an end-card title, or a "follow for more" before the
  story. The story is the ask.
- Do not use Mixamo or Blender — rigs here are procedural and blocky.
- Do not add AI image-to-video; consistency comes from code.
- Do not change Meera, Dev, the library, or a published reel's cut without being asked.
