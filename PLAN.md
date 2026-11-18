# The plan

## The bet

Faceless "N types of person" reels work because they are **identity tests**. The viewer
doesn't learn a fact — they find out which one they are, then check the comments to see if
other people agree. That produces saves and shares, which is what Instagram actually ranks.

The format is also cheap to produce: one script, four characters, one loop. That's why it
can run 2–3 times a day without a team.

Every reel follows the same skeleton:

```
hook (1 line, < 2s) → type 1 → type 2 → type 3 → type 4 → kicker (the turn) → end card
```

The kicker is the part most accounts get wrong. It should reframe the whole list in one
sentence ("You're not lazy. You're scheduled."). Without it the reel is a list; with it,
it's an insight.

## Cadence

| phase | days | posts/day | goal |
| --- | --- | --- | --- |
| set-up | 1–3 | 0 | profile, warm-up, 1 test reel on day 3 |
| learn | 4–10 | 1 | find which pillar (mind / money / body / life) gets follows |
| double down | 11–24 | 2 | repeat the winning pillar, vary the visual style |
| scale | 25–30 | 2–3 | only if saves/view is holding above 1% |

Don't jump to 3/day in week one. New accounts that burst-post get treated like spam.

**Slots** (local time): 07:30, 13:00, 19:30. At least 3 hours apart. The render job runs at
07:30; you publish when you're free.

## Content bank

`topics/` currently holds **24 topics** — 12 days at 2/day, 8 days at 3/day.

| pillar | file | topics |
| --- | --- | --- |
| mind | `topics/01-mind.json` | 6 |
| money | `topics/02-money.json` | 6 |
| body | `topics/03-body.json` | 6 |
| life | `topics/04-life.json` | 6 |

The batch picker now round-robins across pillars, so a normal day is one mind, one money,
one body — not three of the same.

**Replenish weekly.** Author 5 new topics every Sunday (≈45 min). Each one is a 4-type
list and a kicker. Sources that convert: your own habits, arguments you've had, things
friends apologise for, r/AskReddit threads read as patterns (not copied), comments on
your own reels ("this is me" = next topic).

At 2/day you need 14/week. Five authored + reusing the best performers covers it; the
picker recycles the oldest-used topic when it runs dry, and the log tells you when.

## Weekly loop

**Sunday, 45 min**

1. `npm run list` — how many unused topics are left?
2. Write 5 new ones in the weakest-performing pillar.
3. Look at insights for the week: saves per 1,000 views, follows per 1,000 views,
   3-second retention.
4. Pick the top reel and the bottom reel. Write down the difference in one sentence.
5. Delete nothing. The bottom reels are your data.

**Daily, 12 min** — render (automatic), upload, paste caption, reply to comments for
30 minutes after posting.

## Metrics that decide something

| signal | read | action |
| --- | --- | --- |
| 3s retention < 65% | hook is slow or the first frame is weak | cut the hook to 5 words, lead with the twist |
| saves / 1k views < 5 | interesting but not useful | sharpen the kicker into advice |
| follows / 1k views < 3 | consumable, not followable | add a promise to the bio and end card; make a series |
| one reel 5× median | format found | make 3 variations within 48 hours |
| comments arguing | polarization | reply, don't delete; make a follow-up |

Likes are noise. Saves and follows are the only numbers worth changing the plan for.

## What stays manual

Account creation, login, and publishing. Automating those breaks Meta's terms and gets
the account banned — usually within the first two weeks. The machine makes the reel;
you press post. That's 12 minutes a day, and it is also the only way to reply to comments,
which matters more than the upload itself.

## Failure modes to avoid

- **Posting identical-looking reels.** Alternate `doodle` and `voxel` topics.
- **Chasing a trend with no pillar.** A viral reel that doesn't fit any pillar brings
  followers who never watch again, and that tanks the next 10 posts.
- **Reading likes.** They measure reach, not value.
- **Adding music over the voice.** The voice is the format; music muddies it and adds a
  licensing claim.
- **Buying followers or engagement.** It suppresses reach and is unrecoverable.

## 30-day success definition

Not 100k followers. In 30 days, success is:

- 40+ reels published, none deleted;
- one format family with a follows/1k above 5;
- 60+ topics in the bank, so the machine never stalls;
- a posting routine that takes under 15 minutes and doesn't feel like a second job.

Hit those and month two is just repetition with better hooks.
