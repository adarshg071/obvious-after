# Setup — account + posting routine

> Read [`PLAN.md`](PLAN.md) for the 30-day cadence, [`STORY-PLAYBOOK.md`](STORY-PLAYBOOK.md)
> for how every script is written, and [`VIDEO-TOOLKIT.md`](VIDEO-TOOLKIT.md)
> for editing commands (FFmpeg, whisper, yt-dlp, Remotion, HyperFrames).

This is the part I deliberately do **not** automate.

Creating an Instagram account and posting through it means signing in as you. Automating
that (scripted logins, password-based posting tools) is against Meta's terms, gets accounts
banned within days, and puts your Google account at risk too. So: the machine makes the
reels, you press publish. It takes about 12 minutes a day.

---

## What is not in the repo

`tools/`, `voices/`, `bin/` and `.cache/` are git-ignored — they are downloaded toolchains
(whisper.cpp + its models, Remotion, HyperFrames, static FFmpeg, Piper voice models) and the
biggest single file is 700 MB, so GitHub rejects them. Re-fetch them on a new machine; see
[`VIDEO-TOOLKIT.md`](VIDEO-TOOLKIT.md). Nothing the renderer needs is missing: `src/`,
`stories/`, `characters/` and `out/` are all tracked.

---

## 1. Create the account (≈10 min, once)

1. Open an incognito window → `instagram.com` → **Sign up**.
2. Use your Gmail. Do **not** reuse a handle you've used before — new accounts with recycled
   names get extra scrutiny.
3. Pick a handle that states the promise, not the niche:

   - `nobodyteachesyou_` / `stuffnobodyteaches`
   - `thequietexplainer`
   - `_notinagenda`

   Avoid: numbers, underscores everywhere, `official`, `daily`, `ai`, `motivation`.
4. Confirm the email code. **Do not skip this** — unverified accounts get reach-limited.
5. Complete the profile before posting anything (below).

## 2. Profile

**PFP:** `npm run pfp` → upload `out/pfp.png`. Readable at 110px, no small text.

**Bio** — one promise, one line of proof, one CTA:

```
The stuff nobody teaches you.
Small ideas that explain your week.
New reel most days ↓
```

**Account type:** Settings → Account type → **Switch to professional** → Creator.
You need this for Insights (reach, follows, retention). It's free and reversible.

**Links:** skip the link until you have a reason for one. An empty link-in-bio page looks worse
than no link.

## 3. Warm-up (days 1–3, before any posting)

New accounts that immediately post 3 videos a day look exactly like spam farms.

- Day 1: follow 10–15 accounts in your niche, watch reels for ~15 min, like a few.
- Day 2: same, plus save 5 posts. Comment once or twice, genuinely.
- Day 3: post **one** reel. Then browse for 10 minutes.

Do not add 300 followers, do not join engagement pods, do not DM strangers a link.

## 4. Posting ramp

| week | posts/day | why |
| --- | --- | --- |
| 1 | 1 | establish it's a real account |
| 2 | 2 | find which format lands |
| 3+ | 2–3 | scale what worked |

Space them **at least 3 hours apart**. Three posts in one hour splits your own reach.
Best windows: 07:00–09:00, 12:00–13:00, 19:00–21:00 local time.

## 5. Rendering on a schedule

You can render the day's batch automatically before you wake up:

```bash
bash scripts/install-cron.sh install   # renders at 07:30 local time
bash scripts/install-cron.sh show      # check it
bash scripts/install-cron.sh remove    # stop it
```

Cron only fires if the machine is on at 07:30. If you'd rather render by hand,
`npm run make` does the same thing in about 8 minutes.

## 6. Daily routine (12 min)

```bash
npm run make          # 2 reels (1 love + 1 funny), ~5 minutes, runs while you do something else
```

Then for each reel in `out/<today>/`:

1. Instagram → **+** → Reel → upload `<topic>/reel.mp4`
2. Cover → upload `<topic>/cover.jpg`
3. Caption → paste `<topic>/caption.txt`
4. Share to your Story as well (cheap extra reach)
5. **Reply to every comment for the first 30 minutes.** This is the single highest-leverage
   thing you can do — early comment velocity is what pushes a reel into Explore.

## 7. Reading the numbers

After 7 days, open Insights and look at **saves** and **follows per 1,000 views**, not likes.

- `< 5 follows / 1k views` → the content is consumable but not followable. The hook is fine,
  the *promise* is missing.
- `> 500 views, < 30% watched` → the first 2 seconds are wrong, not the topic.
- A reel that beats your median by 5× → make three more like it immediately. That's the whole job.

## 8. Rules that keep the account alive

- **Never repost someone else's reel.** Meta's originality rules will suppress the whole account,
  not just the post.
- Music: don't add licensed tracks to AI-voiced reels. The voice track is the audio.
- Label AI content if you ever generate photorealistic people. Illustrated content doesn't need it,
  but don't claim a human drew it.
- Don't automate the login. Don't buy followers. Don't use "growth" services.
- One account. A second account posting identical content gets both throttled.

---

## Reel format

Every reel is caption-only: no AI narrator. Captions carry the story over a
synthesised music bed with one sound per cut. Target **22–26 seconds**, 6–11 lines,
2–5 words per bubble. Write against [`STORY-PLAYBOOK.md`](STORY-PLAYBOOK.md).

- `"music": "warm"|"bright"|"tense"` picks the score (default: `warm` for
  love/money/body/life, `bright` for funny, `tense` for mind).
- `"style": "love"|"comic"|"voxel"` picks the look (default: the beige doodle style).
- `"motion": "drift"|"snap"|"rise"` picks the entrance animation (default: `drift`
  for love, `snap` for funny).
- `"format": "list"|"scene"` picks the shape. `list` is the type card reel. `scene`
  is a story: named actors on stage, one speech bubble that follows the speaker,
  mouth flaps, and optional multi-scene cuts. Cast size is whatever the script
  needs. Scene topics use `cast` + `scenes` (or `lines` for a single-scene reel):

```json
"format": "scene",
"cast": {
  "her": { "figure": "stand", "x": 0.32 },
  "him": { "figure": "stand", "x": 0.68 }
},
"scenes": [
  { "bg": "street", "time": "night", "cast": ["her", "him"],
    "lines": [ { "who": "her", "say": "You're late." } ] }
]
```

`bg` is `room|cafe|street|park`, `time` is `day|night`. Each new scene is a real
backdrop cut; the old two-hander (`cast: {left,right}` + top-level `lines`) still
renders as a single scene.

Line options: `prop` (`phone|photo|bill|…`), `cam` (`push|pull`), `duck` (near-silence
before the line), `figure` (override pose for that line), `mood`. A scene can move a
character with `"pos": { "him": 0.5 }`. Hooks and kickers also take `lines` with
`*highlight*` words. The renderer adds per-line faces, blinks, camera push, weather
and props; audio ducks before reveals.

Cut sounds vary by beat kind and rotate within a reel (pop / click / clack for warm
and bright, thump / creak / click for tense); hooks get a whoosh, kickers and ends get
a mood accent (ding / two-tone quindar / crash).

Music reels need the Lemo-Opuscar audio tier once:
`sh ~/lemo-opuscar/plugin/skills/lemo-opuscar/scripts/setup.sh deps music`.

Content pillars are now **love** and **funny** (`topics/05-love.json`,
`topics/06-funny.json`); the old psychology topics still render if picked.

Render a future batch with `npm run make -- --topics a,b --date 2026-11-07`.

## YouTube

Same brand, same files, second platform:

- Channel: `@obviousafter` — https://www.youtube.com/@obviousafter
- Banner: `npm run banner` → `out/banner.png` (2048×1152)
- Post every reel as a **Short**: same `reel.mp4`, title from the hook, description =
  `caption.txt` + a link to the Instagram handle. Vertical and under 3 minutes is all
  Shorts needs.

---

## What is and isn't automated

| automated | manual |
| --- | --- |
| topic selection, script, voice, captions, animation, cover, caption text | account creation, profile setup, uploading, replying to comments |
| daily 2-reel batch (`npm run daily`) | the 12-minute publish routine |
