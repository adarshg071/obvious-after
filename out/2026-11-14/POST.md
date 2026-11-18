# Posted — 2026-11-14

`ep-005` — **still open**, 24.7 s, 1080x1920, 30 fps.

| platform | url | file |
|---|---|---|
| Instagram (Reel) | https://www.instagram.com/reel/DftRP5goduG/ | `out/world/ep-005.mp4` |
| YouTube (Shorts) | https://www.youtube.com/shorts/KQIp3kp_k7Y | `out/world/ep-005.mp4` |

Both take the carded file — the comment cards are the only dialogue. (`ep-005-clean.mp4` and
`ep-005.srt` are still rendered and kept, but a clean upload was deleted: it had no cards.)

Audio: sound design only — library room tone (air handling, wall clock, rain on the glass),
one-shot foley (cloth, page, chair, car outside, radiator tick, bell), music bed under it.
No voice of any kind. −14 LUFS integrated, true peak −2.1 dBTP.

## Captions as written

**Instagram**

```
He's got nowhere to be till ten. She's got a library to close. Neither of them says it.

#storytime #shortfilm #relatable #animation #sliceoflife
```

**YouTube** — title `still open #Shorts`, description = the Instagram caption plus
`https://www.instagram.com/obviousafter/`. Visibility public, not made for kids.

## Upload notes (from the last run)

- **Instagram:** after the caption, click the **video preview** to dismiss the hashtag
  suggestions — clicking the page backdrop instead silently drops the post. Then Share and
  wait for "Your reel has been shared."
- **YouTube Studio:** hashtags in the description open a suggestions dropdown that
  intercepts clicks on the Visibility tab. Press Escape first.
- No cover picker for reels on the web flow; Instagram picks its own frame.

## After it's live

- Log the two URLs here, then T+24 h and T+7 d in `analytics/reels.csv`
  (first-3-second retention, avg watch, % watched, views, likes, shares, saves, followers/subs).
- Reply to the first ten comments inside the hour on each reel.
