# Nobody Teaches You — reel engine

A local, zero-cost pipeline that turns a topic into a finished 1080×1920 Instagram reel:
script → voice → captions → animation → MP4 + cover + caption text.

No API keys. No subscriptions. No editing software.

```
topic.json ──► compile ──► Piper TTS ──► timeline ──► headless Chrome ──► H.264 + AAC
                                                          │
                                                    cover.jpg, caption.txt, meta.json
```

## Quick start

```bash
npm run list                 # what topics are available
npm run make                 # render today's 2 story reels (1 love + 1 funny)
npm run make -- --count 1    # render one
npm run make -- --style voxel  # force the dark blocky look for this batch
npm run pfp                  # generate out/pfp.png (profile picture)
```

Output lands in `out/YYYY-MM-DD/<topic>/`:

| file | use |
| --- | --- |
| `reel.mp4` | upload this |
| `cover.jpg` | pick as the cover frame |
| `caption.txt` | paste as the caption |
| `meta.json` | timing + copy, for tracking |

`out/YYYY-MM-DD/POST.md` is your posting sheet for the day.

The 30-day publishing plan is in [`PLAN.md`](PLAN.md); account setup and the posting
routine are in [`SETUP.md`](SETUP.md).

## What's under the hood

| piece | what it is |
| --- | --- |
| `bin/ffmpeg`, `bin/ffprobe` | static builds, no system install needed |
| `bin/piper` | offline neural TTS (Amy, en-US) |
| `src/engine/compile.js` | topic → beat structure |
| `src/engine/tts.js` | per-beat voice + audio assembly with gaps |
| `src/engine/captions.js` | word-level caption timing |
| `src/render/reel.js` | deterministic frame renderer (`renderAt(ms)`) |
| `src/render/doodles.js` | hand-drawn SVG props + characters |
| `src/render/voxel.js` | isometric cube figures (dark style) |
| `src/render/capture.js` | Chrome frame capture piped into ffmpeg |
| `topics/*.json` | the content bank |

Everything is deterministic: the same `reel.json` always produces the same video.

## Two visual styles

- **doodle** (default) — warm paper background, hand-drawn characters, marker accents.
- **voxel** — dark navy stage, isometric block characters, outlined captions.

Set `"style": "voxel"` on a topic to make it dark, or pass `--style voxel` to a whole batch.
Mixing both in the feed keeps the grid from looking monotonous.

## Editing other videos

FFmpeg, whisper.cpp, yt-dlp, Remotion and HyperFrames are installed under `bin/` and
`tools/`. Recipes (crop to 9:16, burn captions, mix music, compress for upload) are in
[`VIDEO-TOOLKIT.md`](VIDEO-TOOLKIT.md).

```bash
npm run tools                        # verify all five tools
npm run captions -- myvideo.mp4      # whisper → SRT → burned-in captions
npm run hf:card                      # HyperFrames end-card example
npm run remotion:card                # Remotion title-card example
```

## Adding topics

Drop a new `.json` file in `topics/` (or append to an existing array). Schema:

```json
{
  "id": "unique-slug",
  "subject": "shown on the post sheet",
  "hook": {
    "say": "spoken sentence",
    "lines": ["On screen *first* line", "second line"],
    "icon": "battery"
  },
  "types": [
    {
      "name": "The Thing",
      "say": "spoken sentence",
      "tag": "on-screen chip",
      "figure": "slump | stand | wave | sit",
      "icon": "moon",
      "mood": "smile | flat | frown | open | wavy"
    }
  ],
  "kicker": { "say": "...", "lines": ["...", "..."] },
  "caption": "IG caption, no hashtags",
  "hashtags": ["#one", "#two"]
}
```

`*asterisks*` in a `lines` string highlight that word in the accent colour.

Available icons: `battery phone moon sun clock coin chart heart bed coffee cloud key burst`.

Keep hooks under ~14 words and each `say` under ~14 words. Anything longer starts to
drag the reel past 40 seconds, and retention dies there.

## Tuning

`config.json`:

- `voice.lengthScale` — 1.05 is calm, 0.95 is punchier
- `timing.beatGap` — silence between beats
- `theme.accents` — the palette; one is picked per topic by hash
- `video.fps` — 30 is the sweet spot; 24 renders ~20% faster

## Requirements

Node 22+, Chrome/Chromium at `/usr/bin/google-chrome`, ~2 GB free RAM.
Render speed is roughly 4–5× realtime on an 8-core CPU without a GPU:
a 30-second reel takes ~2.5 minutes.
