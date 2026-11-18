# world3d — blocky cinematic renderer

three.js scenes rendered in headless Chrome (SwiftShader, no GPU needed), frames piped
straight into ffmpeg. The audio is music bed, room tone and foley from `src/audio/bed.py`.
There is no voice track: the dialogue lives in the cards and the `.srt`.

## Run

```bash
node src/world3d/index.js stories/ep-001.json     # full reel + audio
node src/world3d/index.js stories/ep-001.json --dry            # timeline + .srt, no frames
node src/world3d/index.js stories/ep-001.json --audio          # bed, room tone, mix — no frames
node src/world3d/stills.js stories/ep-003.json "1:0.5,7:0.8"   # framing preview (scene:seconds)
```

`--audio` exists so a cue can be re-mixed onto a finished reel without re-rendering:
`ffmpeg -i out/world/<id>.mp4 -i .tmp/world3d/<id>/mix.wav -map 0:v -map 1:a -c:v copy ...`

Output: `out/world/<id>.mp4`. Cost on this box: ~0.7 s/frame at 1080x1920,
so a 20 s reel is ~7 min. Frames are JPEG-grabbed from a 2D canvas composite, which is
about 2x faster than `page.screenshot`.

## Storyboard schema

```jsonc
{
  "id": "ep-001",
  "title": "eleven minutes",
  "seed": "ep-001",          // seeds the music bed
  "music": "warm",           // warm | bright | tense
  "ambience": "street",      // street | diner | laundry | room — room tone for the whole reel
  "leadIn": 0.4, "gap": 0.3, "tail": 0.7,
  "characters": ["maya", "arun"],   // characters/<id>.json
  "scenes": [{
    "set": "bus_stop",              // bus_stop | bedroom | diner | laundromat
    "cam": { "shot": "wide", "move": "push", "angle": -7, "targetX": 0, "targetZ": 0 },
    "cast": [{ "id": "maya", "x": -0.5, "z": 0, "pose": "sit", "faceTo": 0.2 }],
    "caption": { "text": "TEXT WITH *ACCENT*", "from": 0.2, "dur": 2.7 },
    "fx": ["chime"],                // set foley that fires as the scene opens
    "lines": [{
      "who": "maya", "say": "…", "pose": "talk",
      "react": "look",              // what the listener does: look | away | down | nod | lean | still
      "fx": "cup",                  // foley cue at this line's start
    }],
    "hold": 1.0
  }],
  "endCard": { "text": "SOME PEOPLE ARE JUST *WAITING*", "dur": 2.1 }
}
```

- `shot`: `wide | two | medium | close | ots` (fixed camera presets)
- `move`: `static | push | pull | track | handheld`
- `angle`: degrees around the cast; 0 faces the camera
- `targetX` / `targetZ`: what the camera looks at (default: cast centre, z = 0)
- `pose`: `idle | sit | talk | react` — the speaker always talks
- Timing is derived from each line's own `dur` (the seconds the card is on screen), and
  `hold`/`tail` are extra seconds of picture after it.
- Every line is drawn as a comment card pointing at the speaker; no per-scene opt-in.

## Adding

- **Set**: add a builder in `sets.js` and register it in `SETS`. Return `{ group, seat, update(t, dt) }`.
- **Character**: add `characters/<id>.json` (body colours, hair, face, flaw).
- **Pose**: extend `poseCharacter` in `rig.js`.
- Audio is two layers: music bed (0.55) and ambience + foley (0.50), summed and mastered
  to −14 LUFS / ≤ −1.5 dBTP. Cue one-shot foley from the storyboard (`fx` on a scene or a
  line); they never move a cue.

## Known gaps

- Knees yes, elbows no: sitting bends the shin to the floor, arms stay straight boxes.
- Rain is 1 px lines under MSAA; reads as drizzle, not downpour.
- No true depth of field — fog and composition do the work.
