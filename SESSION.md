# Session log — @obviousafter

One file, everything done. New sessions are appended at the bottom (newest last); older
sessions are never rewritten, only corrected if a fact was wrong.

- **Last session:** 2026-11-15 — `ep-006` **forty pages** posted to Instagram and YouTube.
- **Next:** 2026-11-16 reel. Storyboard first, in `stories/`, before any scene work.
- Superseded session files: `SESSION-2026-11-08.md` and `SESSION-2026-11-11.md` were folded
  into this file and deleted on 2026-11-15.

---


## 2026-11-16 — ep-008 "the dark one" and ep-009 "the clearing"

Two reels shipped: the balcony (society windows as the story) and the jungle clearing
(bonfire, moon, stars). Both carded + clean + `.srt`, both posted to Instagram and YouTube.

**What the sets taught us**

- The portrait frame at `two` (r 7.1) is only ±11–14° wide. Any `angle` off 0 swings a
  narrow set's camera into a side wall or out of a parapet. Both balcony and jungle are
  built straight-on and every camera angle is 0.
- Hemi alone will not light a surface facing away from the key: the society facades were
  black until `GRADE.balcony.key` became a cool moon. Same lesson in the jungle — the trunks
  are lit by the fire and by the key, never by the hemisphere.
- A practical in frame has to be measured, not guessed. The bonfire at intensity 24 blew
  every face to orange at 1080p; 9.5 with a 2.2 bounce is the working number, and it still
  flickers. Emissive geometry (flames) is `MeshBasic` + `fog: false` so the fog can't grey it.
- Stars and moon: `fog: false` on the material, or 30 m of `FogExp2` eats them. Keep a gap in
  the canopy along the moon's azimuth or a canopy box clips the disc.
- Sky objects need the canopy kept out of their sightline by a rule, not by eye:
  `if (z < -12 && Math.abs(x - 0.13 * z) < 4) continue;` in the tree loop.

**Props are per scene.** Dev's notebook and Meera's book come from `characters/*.json`, so
they follow the character into every set. A scene can now drop them with a cast-level
`"props": []` — the notebook does not come to the jungle. `stage.js` merges it into the spec.

**New ambience and cue.** `AMBIENCE["jungle"]` = crickets (five gated chirp trains at
different pitches over low air) + a little low noise. `FX["fire"]` = the existing `sizzle`
at 1.8 s. Cued twice per reel, never looped.

**Publishing notes (both platforms)**

- **Instagram Crop step: pick 9:16.** The default is Original; the crop panel is behind the
  **Select Crop** button. Next → Next → caption → click the video preview to dismiss hashtag
  suggestions → Share.
- **YouTube Studio: "No, it's not Made for Kids" is on the Details step** in this version,
  and **Next stays disabled until it is answered**. Answer it first, or Next looks broken.
  A hashtag suggestion opens a modal that also blocks Next; close it with
  `ytcp-social-suggestions-dropdown` → `tp-yt-paper-dialog.close()`. **Never press Escape** —
  it discards the upload.
- `ep-009` was deleted on Instagram after the first post and reposted with the 9:16 crop:
  the live URL is the second one.

**Render cost.** 779 frames in 445 s (jungle, fewer objects than the balcony), 776 in 871 s
(balcony). Node still hangs after muxing now and then — check `ffprobe` for duration + audio,
then kill it; the files are complete.

## Current state (as of 2026-11-15)

### What the channel is now

Not the "4 types of people" card format any more. Since 13 Nov it is **blocky-avatar
cinematic reels**: original Roblox-adjacent characters, real 3D sets, 1080x1920, 30 fps,
22–30 s, sound design only. Nobody speaks — the dialogue is on-screen comment cards and
the `.srt`, and it is never voiced. No TTS, no humming, no vocalisation of any kind.

### The world

A branch library after hours, **Meera** (librarian) and **Dev** (sixteen, nowhere to be
until ten). Same room, same amber lamp, same table, same clock. Continuity lives in
objects, never in conversation — they never mention the last night.

Reel shape: two people, one prop, faces from frame 0, no establishing wide, first line by
0.3 s, one real laugh early, last line answers or reframes the first over the shot it
opened on, title spoken in the final line, hard cut, no end card.

### Pipeline

```bash
cd /home/adarsh/yt
node src/world3d/index.js stories/<ep>.json --dry     # timeline + .srt, no frames
node src/world3d/index.js stories/<ep>.json --audio   # rebuild the mix only
node src/world3d/index.js stories/<ep>.json           # full render, carded + clean
```

- three.js in headless Chrome (SwiftShader) → 2D canvas composite → two ffmpeg encoders at
  once (carded + clean) → `out/world/<ep>.mp4`, `out/world/<ep>-clean.mp4`,
  `out/world/<ep>.srt`.
- Music + room tone + foley: `src/audio/bed.py` (numpy synthesis, seeded per episode). Muse
  bed at `volume=0.55`, ambience/foley at `0.5`, mastered
  `loudnorm=I=-14:TP=-2.8:LRA=11` + `apad=pad_dur=0.3`.
- Render cost ≈ 1.4 s/frame (884 frames ≈ 20 min). Never two renders at once
  (`~/lemo-opuscar/.venv` is `MUSIC_PY`; frames need RAM).
- Line timing comes from the storyboard: each line's `dur` is the time the eye needs to
  read it. There is no voice track to measure, so the storyboard is the clock.

### Exports and posting

- `out/world/<ep>.mp4` — burned-in comment cards. **Both platforms.** The cards are the
  only dialogue, so a clean upload plays as a wordless clip (that mistake cost a deleted
  YouTube upload on 14 Nov).
- `out/world/<ep>-clean.mp4` + `.srt` — clean plate and sidecar subs, kept for archive.
- One reel a day, 20:00–22:00 IST. Track YouTube and Instagram separately at T+24 h and
  T+7 d in `analytics/reels.csv`.
- `out/<date>/POST.md` — post sheet with the live URLs; `STORY_HISTORY.md` — premise, cast,
  twist, hook per reel.

---

## 2026-11-02 → 2026-11-07 — the card format

Two to three posts a day of **text-card explainers** ("8 types of…" / "which one are
you"), captions over music, no characters. Nine reels across five post sheets:
`social-battery`, `chronotypes`, `being-alone`, `resting`, `ways-to-say-it`, `group-chat`,
`wedding-people`, `im-fine`, plus 02 Nov's `awkward-text`/`being-wrong`/`compliments`.

This era is retired. It taught the posting mechanics (caption + 3–5 hashtags, reply to the
first ten comments inside the hour) and nothing else that survives.

## 2026-11-08 — the story engine

Brief: stop the feed looking repetitive — real stories, not lists. Owner's changes: many
characters on stage at once, 3 locations per reel with real cuts, day→night lighting, one
story (setup → turn → punchline), a different cut sound per scene, short captions.

Shipped: **the last train** (41.9 s, 3 scenes, 3 characters) and **the group chat meets
up** (41.3 s, 5 characters).

- IG: /reel/Dfdu7ruo25H/ · /reel/DfdvGAioyjF/
- YT: /shorts/i3ri5PVT2Bc · /shorts/f3reuvDRBhI

Code: `src/engine/compile.js` gained `normalizeCast()` / `normalizeScenes()` (old
`cast: {left,right}` topics still wrap into one scene); `src/render/reel.js` builds one
actor per cast member, shows only the current scene's cast, and moves one bubble whose
`--tail` points at the speaker; `reel.css` got per-room day/night palettes.

Fixed: unreadable hook text at night, actors too small, five-actor overlap, bubble tail
landing between characters, kicker repeated as both big type and caption.

Bugs that still bite today: Instagram's Share can close the dialog without posting (wait
for "Your reel has been shared."), and YouTube's "not made for kids" / "Public" radios need
`page.evaluate` clicks because they detach mid-click.

## 2026-11-09 → 2026-11-11 — formats widen, VoiceStudio

Shipped: `the-photo` (23.7 s), `five-minutes` (24.4 s), `crunchy-leaves` (rebuilt, 14.1 s),
`the-umbrella` (24.0 s), `the-alarm` (19.1 s), `the-draft` (18.2 s, solo),
`the-coffee` (9.7 s, silent) — the last one was deleted on the owner's call.

- IG: five-minutes/photo via post sheet, crunchy Dfi4TgzoRTO, umbrella Dfi8FFqI6HE,
  alarm Dfi8Wf4oDqt, draft DflnLzjoj8F, coffee DflnucHIMtT (deleted)
- YT: sss_DPJPv0k, QVtyVExF1wc, CUADeWQUPss, 99mKjgmd7CQ — coffee never uploaded

New rules from the owner: a solo reel is a complete story; some reels have no dialogue at
all. Format rotation went into `STORY-PLAYBOOK.md` (two-hander / solo / silent action).

Code: `silent: true` topics (no hook, no kicker, no end card, no default cut clicks);
`react: true` reaction takes; per-line camera moves `close` / `snap` / `shake`; prop
staging fields `propX` / `propY` / `propTurn` / `propScale`; the music bed is seeded from
the slug so no two reels share a bed; new SFX `boing`, `gasp`, `alarm`, `heart`, `step`,
`click` (the last one had been silently missing from the dispatcher).

**VoiceStudio** was installed (`~/voicestudio`, app 0.5.7, local runtime 3.11.16) and
stopped before any model download: 5.7 GB RAM against an 8 GB ask, ROCm not configured so
it would run CPU-only, and no model licence/size had been consented to. It is a speech
tool, not an SFX generator, so it was never the right tool for these reels — and it became
moot the next time the audio brief changed.

Killed: `the-coffee`. Lesson recorded — a silent reel lives on the prop reading in
silhouette; the mug sat against her chest and the gag never read.

## 2026-11-12 → 2026-11-13 — the blocky 3D world

The flat-card renderer was replaced by a real 3D pipeline: `src/world3d/` (three.js in
headless Chrome, SwiftShader, two encoders), sets in `sets.js` (`bus_stop`, `bedroom`,
`diner`, `laundromat`, `library`), procedural R6-style rigs in `rig.js`, comment cards and
grade in `stage.js`, frame grab in `capture.js`.

Characters moved into `characters/*.json` (a bible: never change clothes, colours,
proportions, hair between episodes) and stories into `stories/ep-*.json`.

Live from this batch:

| ep | title | length | IG | YT |
|---|---|---|---|---|
| 001 | eleven minutes | — | (logged 2026-10, no data) | (logged 2026-10, no data) |
| 002 | leave it on | — | (no data) | 46 % avg viewed |
| 003 | four minutes | 46.5 s | /reel/Dfr8bgDIWov/ | /shorts/vvXATiGpLd4 |
| 004 | dry it | 49.2 s | /reel/Dfr5505IsaR/ | /shorts/jiLhGuMr-lU |

ep-003 and ep-004 were still 46–49 s, well past the 22–30 s the channel now holds to.
`analytics/reels.csv` was started here; ep-004 is the baseline to beat (35 % average
viewed on YouTube, 0:11 on Instagram).

## 2026-11-14 — `ep-005` still open: the voice experiment, then sound design only

Goal: finish and publish ep-005 (*Four hours. One page.* — Dev won't go home till ten
because home is too quiet; Meera drags a chair over and reads with him).

Order of events, because the reversal matters:

1. A **voice system** was built (`src/audio/voice.py`, per-character voice profiles in
   `characters/*.json`, per-line mood) so characters spoke.
2. It was rejected outright as trash and **removed completely**: `voice.py` deleted, every
   `voice-*.wav` / `line-*.wav` / `dialogue.wav` deleted, `voice`/`vocal` blocks stripped
   from the character bible, `mood` stripped from the storyboard.
3. The reel was rebuilt as **sound design only**: library room tone (air handling, wall
   clock, rain on the glass) plus one-shot foley cued from the storyboard — `cloth`,
   `page`, `car`, `pipe`, `scrape`, `chair`, `bell`. Rain was softened (band-passed drops,
   fewer, quieter) and `cloth` / `chair` / `pipe` / `car` were added to `bed.py`.
4. `AGENTS.md` and `src/world3d/README.md` were rewritten around "sound design only, nobody
   speaks".

Code: the dialogue bus, synth, silence concat, ducking and stale-take logic came out of
`index.js`; `readTime()` / `lineDur()` went in, so each line's `dur` is authoritative and
the `.srt` is byte-identical to the approved cut. Mastered to −14.5 LUFS / −2.2 dBTP over
742 frames (24.73 s).

Posted: IG /reel/DftRP5goduG/ (carded). YouTube first got the **clean** plate —
`BXTn3O2tePo` — which played with no comment cards at all; it was deleted forever and the
carded file re-uploaded as `/shorts/KQIp3kp_k7Y`. That is why exports now say carded on
both platforms.

## 2026-11-15 — `ep-006` forty pages

Premise: 9:12 p.m., same library. Dev wants forty pages of a care-home job form printed.
It is £8. He has £2. Meera charges him to the penny, tells him to take the night shifts,
says she isn't his mother — then prints all forty pages and bills him Friday.

The owner rewrote the dialogue for a faster hook and asked for a comparison before any file
changed. Verdict: the instinct (open on the money problem) was right, the draft wasn't
shootable — cards 5–9 had the two speakers inverted, "Then print ten." was given to Dev
(who can't instruct her, and it is her arithmetic), "It's for a care home. Nights?" was in
Meera's mouth although she can't know it, and the 20p rate never appeared so the figures
couldn't be checked. The merged cut keeps the money-first opening and the original middle:

```
1  meera  That's eight pounds.
2  dev    I've only got two pounds.
3  meera  Forty pages, twenty p a page.
4  meera  Then print ten.
5  dev    Ten isn't a form.
6  dev    It's for a care home. Nights.
7  meera  You're fifteen.
8  dev    Sixteen in March.
9  meera  And nights pay more.
10 meera  Then take the nights.
11 dev    You're not telling me no.
12 meera  I'm not your mother.
13 dev    Who pays the eight pounds.
14 meera  You do. Friday.
15 meera  Forty pages.
```

40 × 20p = £8 · £2 buys ten pages · he still owes the £8, due Friday. 15 cards, 29.5 s, 884
frames, 9 scenes, cue `pipe` / `stamp` / `page`.

Render trouble: two full renders each produced a **complete muxed mp4** and then hung —
SwiftShader never returned from `page.close()`, leaving node alive at 0 % CPU for half an
hour after the file was done. The first time it was killed mid-teardown and a finished cut
was thrown away. A per-frame timeout patch was written, then deleted: the frame loop was
never the problem. The fix that stayed is in `capture.js`: close the page and browser with
a 5 s deadline, then SIGKILL the browser process so a wedged renderer can't hold the
pipeline open.

Posted: IG /reel/DfwD5hwIBAP/ · YT /shorts/HRAIuyuL6pM (carded, verified in the public
player, 29.5 s, −14 LUFS / −2.2 dBTP).

---

## Open items

- `analytics/reels.csv` is empty from ep-005 on: T+24 h and T+7 d numbers for ep-005 and
  ep-006 still need collecting, separately per platform.
- The `capture.js` teardown guard has not been proven by a fresh render yet.
- `ep-001`–`ep-004` have no `dur` values, so re-rendering them would re-time their cards.
  Leave them alone unless asked.
- YouTube custom thumbnails still need phone verification in Studio.
- ep-003 / ep-004 are 46–49 s, outside the current 22–30 s rule. Not to be re-cut; the rule
  applies to new reels.
- Two reels in a row under 30 % stayed-to-watch on the same platform → change the format,
  not the story. ep-005 and ep-006 are the first test of the new shape.

## Rules that came out of these sessions

- Storyboard in `stories/<ep>.json` and approved before any scene work.
- Nobody speaks. Ever. Cards + `.srt` only, and they ship carded on both platforms.
- One reel = one idea: two people, one prop, 22–30 s, loop ending, title in the last line.
- Genre rotates (loneliness, relationships, childhood, failure, discipline, self-respect,
  reality) — never two of the same in a row by default.
- The library, Meera, Dev and any published cut are not changed without being asked.
- Don't add a dependency, a service or a config knob for something the repo already does.

## 2026-11-17 — ep-010 "before ten"

First solo reel and first morning reel. Meera alone at 6:52 a.m., unlocking the branch library,
turning on every light, pushing a squeaking trolley, turning the sign to OPEN at seven. 26.6 s,
798 frames, 1256 s render (~1.57 s/frame). Carded + clean + `.srt`, both posted.
IG https://www.instagram.com/reel/Df1D4ZNotUn/ · YT https://www.youtube.com/shorts/u3lNJFt86mo

**What the dawn set taught us**

- The clock had to move above the door: its old spot was inside the back-right shelf bay, so a
  morning shot of the door could not also show the time. Continuity prop, wrong wall — check the
  prop is in frame for the shot you are actually building.
- **A doorway cannot be raised.** The clock needs the ceiling; the door needs the clock. Meera is
  2.55 m and the opening is 2.31 m, so no street-side camera can frame her head in the doorway —
  the lintel always crops it. Every "shoot S5 from outside" plan died on this. S5 is now shot from
  inside, behind her back, while the door swings out and the sign turns toward the lens.
- Door opens **outward** (`+1.15 rad`) and the top rail is gone with the glass extended to
  `1.13–2.30`, or the door eats the lens and the pane eats her face.
- **Pendant lights are inverse-square and the room is exposed for a 4 m throw.** At 0.5 m a pendant
  blows her face to flat white; 1 m is still too close. Pendants 12.5 → 9, desk lamp 25 → 14, and
  she never stands under a pendant. `GRADE.morning.faceFill` 13.
- The bob has a side panel that reads as a slab past ~35° off frontal — profile-ish shots have to
  stay near-frontal, which limits how much "turn to the door" acting the camera can see.
- Dawn exterior: the far wall across the street is `glow(0x51688a, 0.5)` when `morning`, or the
  door glass is a black hole instead of a lit one.

**Bug fixed in `bookAt()`.** Books were being added to the outer group instead of the bay group,
which built a floating wall of books mid-room. Signature is now `bookAt(parent, px, py, pz, w, h, k)`.
Same class of bug as the clock hands, which rotated about their own centres and floated off the
dial — both were "added to the wrong parent".

**Publishing.** Instagram showed the crop ratios inline (Original / 1:1 / 9:16 / 16:9) rather than
behind a "Select Crop" button this time; the 9:16 source needed no crop and Next went straight to
Edit. YouTube: the "No, it's not Made for Kids" radio is on Details and `#next-button` stays
`aria-disabled` until it is answered. `#done-button` is the publish button on Visibility.
Loudness verified: −14.6 LUFS integrated, −2.7 dBTP.

**Solo reels.** One character works when the absence is the point — the room is the second
character here. Do not use solo to skip writing the second person.
