# Analytics

One row per reel per platform in `reels.csv`. Record at **T+24 h** and **T+7 d**; overwrite
the same row (set `checked_at`) rather than adding a second one.

| column | where it comes from |
|---|---|
| `views` · `likes` · `shares` · `saves` | Studio / Insights overview |
| `followers_gained` | Studio subscribers gained, IG followers gained, for the same window |
| `retention_3s_pct` | YouTube "intro" retention at 0:03, or IG retention graph at 3 s |
| `stayed_to_watch_pct` | YouTube "% stayed to watch" |
| `avg_watch` | average watch duration, `m:ss` |
| `pct_watched` | average percentage viewed |

## Judging a reel

Never on views.

1. Compare it with the **two reels before it on the same platform**, column by column.
2. Beat the format baseline, not the previous reel's luck:
   - YouTube stayed-to-watch: **35.0 %** (ep-004). Below 30 % twice in a row → change the
     format, not the story.
   - Instagram average watch: **0:11** (ep-004), 0:05 (ep-003).
   - Shares + saves: 4 + 4 on the best-performing non-series reel (1,385 views) is the bar.
   - Follower conversion: **0.15 %** of views (13 subs from 8.9k views).
3. Write one line in `notes` on **why** it moved: the first three seconds, the turn, the last
   line, or the packaging. That line is the only thing that makes the next reel better.

## Known context (2026-11)

- YouTube: 8,883 views / 28 days, 99.2 % new viewers, India 49.8 % + US 10.5 %, 35–44 is the
  largest age band, 61 % female, 79.5 % mobile. **97.5 % of views have no caption on** —
  which is why the burned card exists on Instagram and why the YouTube description must lead
  with the first line.
- Instagram: 7 followers. Growth comes from shares, not from follows.
