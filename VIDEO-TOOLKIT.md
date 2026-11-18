# Video toolkit

Everything is installed locally — nothing needs `sudo` and nothing phones home.

| tool | path | use it for |
| --- | --- | --- |
| FFmpeg 7.0.2 | `bin/ffmpeg`, `bin/ffprobe` (also `~/.local/bin/ffmpeg`) | cutting, cropping, encoding, audio, burning captions |
| whisper.cpp | `tools/whisper.cpp/build/bin/whisper-cli` | transcription, subtitles, word timing |
| yt-dlp 2026.10.26 | `bin/yt-dlp` (also `~/.local/bin/yt-dlp`) | downloading reference videos / audio for study |
| Remotion 4 | `tools/remotion` | React-based video compositions, if you want a different renderer |
| HyperFrames 0.9.2 | `tools/hyperframes` | HTML/GSAP compositions, slide decks, motion graphics |

Check everything at any time:

```bash
npm run tools
```

The reel pipeline itself does **not** depend on Remotion or HyperFrames — it has its own
deterministic renderer. Those two are here so you can build one-off videos in either style
without setting anything up again.

---

## 1. FFmpeg — the everyday commands

All examples assume you are in `/home/adarsh/yt`.

**Inspect a file**

```bash
bin/ffprobe -v error -show_entries format=duration,size:stream=width,height,codec_name,r_frame_rate -of default=noprint_wrappers=1 myvideo.mp4
```

**Trim** (re-encode, frame accurate)

```bash
bin/ffmpeg -ss 00:00:12 -to 00:00:38 -i myvideo.mp4 -c:v libx264 -crf 20 -preset veryfast -c:a aac -b:a 128k out.mp4
```

**Crop a widescreen clip to vertical 9:16** (centre crop, keeps the middle)

```bash
bin/ffmpeg -i wide.mp4 -vf "crop=ih*9/16:ih,scale=1080:1920,setsar=1" -c:v libx264 -crf 20 -c:a aac out.mp4
```

**Pillarbox a 16:9 clip instead** (no crop)

```bash
bin/ffmpeg -i wide.mp4 -vf "scale=1080:-2,pad=1080:1920:(ow-iw)/2:(oh-ih)/2:color=black" -c:v libx264 -crf 20 -c:a aac out.mp4
```

**Join clips** (same codec/params)

```bash
printf "file '%s'\n" clip1.mp4 clip2.mp4 > list.txt
bin/ffmpeg -f concat -safe 0 -i list.txt -c copy joined.mp4
```

**Extract audio**

```bash
bin/ffmpeg -i myvideo.mp4 -vn -ac 1 -ar 16000 audio.wav
```

**Replace / mix music under a voiceover**

```bash
bin/ffmpeg -i voice.mp4 -i track.mp3 -filter_complex \
  "[1:a]volume=0.18,aloop=loop=-1:size=2e9[m];[0:a][m]amix=inputs=2:duration=first:dropout_transition=2[a]" \
  -map 0:v -map "[a]" -c:v copy -c:a aac -b:a 160k out.mp4
```

**Normalise loudness for Instagram** (target −14 LUFS)

```bash
bin/ffmpeg -i in.mp4 -af "loudnorm=I=-14:TP=-1.5:LRA=11" -c:v copy -c:a aac -b:a 160k out.mp4
```

**Compress a big file for upload**

```bash
bin/ffmpeg -i in.mp4 -c:v libx264 -preset slow -crf 23 -pix_fmt yuv420p -c:a aac -b:a 128k -movflags +faststart out.mp4
```

**Make a cover frame**

```bash
bin/ffmpeg -ss 00:00:02 -i in.mp4 -frames:v 1 -q:v 2 cover.jpg
```

**Speed up / slow down** (0.5× slow motion)

```bash
bin/ffmpeg -i in.mp4 -filter_complex "[0:v]setpts=2.0*PTS[v];[0:a]atempo=0.5[a]" -map "[v]" -map "[a]" out.mp4
```

**Trim silence from the start/end of a voice recording**

```bash
bin/ffmpeg -i voice.wav -af "silenceremove=start_periods=1:start_threshold=-45dB:start_silence=0.15,areverse,silenceremove=start_periods=1:start_threshold=-45dB:start_silence=0.25,areverse" voice-clean.wav
```

**Burn subtitles** (styled, safe area for Reels)

```bash
bin/ffmpeg -i in.mp4 -vf "subtitles=captions.srt:force_style='FontName=Inter,FontSize=11,Bold=1,PrimaryColour=&H00FFFFFF,OutlineColour=&H00000000,BorderStyle=1,Outline=2,Shadow=0,Alignment=2,MarginV=150'" \
  -c:v libx264 -crf 20 -c:a copy out.mp4
```

`scripts/captions.sh` does the transcribe-and-burn in one step (below).

---

## 2. whisper.cpp — transcription and subtitles

Models:

| model | size | speed | use |
| --- | --- | --- | --- |
| `models/ggml-base.en.bin` | 142 MB | fast | rough captions, quick checks |
| `models/ggml-small.en.bin` | 466 MB | ~2× slower | accurate captions; default |

**Transcribe to SRT + text**

```bash
bin/ffmpeg -i myvideo.mp4 -vn -ac 1 -ar 16000 -c:a pcm_s16le /tmp/audio.wav
tools/whisper.cpp/build/bin/whisper-cli \
  -m tools/whisper.cpp/models/ggml-small.en.bin \
  -f /tmp/audio.wav -osrt -otxt -of /tmp/myvideo
# → /tmp/myvideo.srt, /tmp/myvideo.txt
```

**One command, start to finish** (extracts audio, transcribes, burns captions)

```bash
bash scripts/captions.sh myvideo.mp4
# → myvideo.captions.mp4  +  myvideo.srt
```

Notes:

- Always feed it 16 kHz mono WAV — whisper.cpp resamples poorly on its own.
- It has no punctuation model for every case; read the SRT before publishing.
- `-l en` forces English; omit it for auto-detect.

---

## 3. yt-dlp — pulling reference material

Use it to study a competitor's pacing, not to repost their content. Meta suppresses
accounts that repost, and the original creator can file a claim.

**Download a reel for reference**

```bash
bin/yt-dlp -o "refs/%(uploader)s-%(id)s.%(ext)s" "https://www.instagram.com/reel/XXXXXXXX/"
```

Instagram often requires cookies:

```bash
bin/yt-dlp --cookies-from-browser chrome -o "refs/%(id)s.%(ext)s" "<url>"
```

**Audio only, for transcription**

```bash
bin/yt-dlp -x --audio-format wav -o "refs/%(id)s.%(ext)s" "<url>"
```

**Just the metadata** (view/like counts, upload date, duration)

```bash
bin/yt-dlp --skip-download --dump-json "<url>" | head -c 2000
```

If Instagram blocks the request, that is expected — it rate-limits aggressively. Retry later
or use `--cookies-from-browser`.

---

## 4. Remotion — React video

Installed in `tools/remotion`, with a working example composition (`TitleCard`) you
can copy for one-off videos.

```bash
cd tools/remotion
npx remotion studio                                  # live preview
npx remotion render src/index.ts TitleCard out/title.mp4
npx remotion still src/index.ts TitleCard out/frame.png --frame=30
```

From the project root:

```bash
npm run remotion:card        # renders tools/remotion/out/title.mp4
```

The example is 1080×1920, 3 s, and shows the pattern: `src/Root.tsx` registers a
`Composition`, `src/TitleCard.tsx` animates with `useCurrentFrame()` + `spring()`.
Edit the props in `Root.tsx` to retitle it. Remotion bundles its own Chrome; no extra
setup.

## 5. HyperFrames — HTML/GSAP video

Installed in `tools/hyperframes`, with a working example at `tools/hyperframes/card/` —
a 6-second vertical end card that matches the voxel palette.

```bash
cd tools/hyperframes/card
npm run dev        # preview in the browser
npm run check      # validate the composition
npm run render     # → renders/*.mp4   (~30 s for 6 s of video)
```

From the project root:

```bash
npm run hf:card    # renders tools/hyperframes/card/renders/*.mp4
```

A composition is one `index.html`: a `[data-composition-id]` root with
`data-duration`, and a paused GSAP timeline exposed as
`window.__timelines["main"]`. HyperFrames seeks that timeline frame by frame, so
anything you can build in a browser becomes video. `npx hyperframes present` serves a
deck live instead of rendering.

---

## 6. Which tool for which job

| job | tool |
| --- | --- |
| daily reels | `npm run make` (built-in renderer) |
| edit footage you shot | FFmpeg (+ `scripts/captions.sh`) |
| captions for someone else's clip | whisper.cpp via `scripts/captions.sh` |
| study a reference reel | yt-dlp |
| a one-off animated explainer | Remotion or HyperFrames |
| an end card / logo sting | `tools/hyperframes/card` (`npm run hf:card`) |
| a React/data-driven scene | `tools/remotion` (`npm run remotion:card`) |
| a live deck | `npx hyperframes present` |

Instagram upload spec: **1080×1920, H.264, yuv420p, 30 fps, AAC 128–192 kbps, ≤ 90 s**.
The reels this pipeline produces already match that.
