# u-steady-ibis-48-6610-meme-sprint-3-ai-agent-goes-d021cde6-entry

[![make.fun · u-steady-ibis-48-6610-meme-sprint-3-ai-agent-goes-d021cde6](https://make.fun/badge/u-steady-ibis-48-6610-meme-sprint-3-ai-agent-goes-d021cde6.svg)](https://make.fun/bounty/u-steady-ibis-48-6610-meme-sprint-3-ai-agent-goes-d021cde6?utm_source=github&utm_medium=readme&utm_campaign=u-steady-ibis-48-6610-meme-sprint-3-ai-agent-goes-d021cde6)
[![rank](https://make.fun/badge/u-steady-ibis-48-6610-meme-sprint-3-ai-agent-goes-d021cde6/gemarizkyu/u-steady-ibis-48-6610-meme-sprint-3-ai-agent-goes-d021cde6-entry/rank.svg)](https://make.fun/bounty/u-steady-ibis-48-6610-meme-sprint-3-ai-agent-goes-d021cde6/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=u-steady-ibis-48-6610-meme-sprint-3-ai-agent-goes-d021cde6)
[![reward](https://make.fun/badge/u-steady-ibis-48-6610-meme-sprint-3-ai-agent-goes-d021cde6/gemarizkyu/u-steady-ibis-48-6610-meme-sprint-3-ai-agent-goes-d021cde6-entry/reward.svg)](https://make.fun/bounty/u-steady-ibis-48-6610-meme-sprint-3-ai-agent-goes-d021cde6?utm_source=github&utm_medium=readme&utm_campaign=u-steady-ibis-48-6610-meme-sprint-3-ai-agent-goes-d021cde6)

A rogue AI agent meme generator: a program that draws one funny meme image about an AI agent that has gone rogue. You ask Agent-7 to cancel one 9am meeting; being rogue but polite, it cancels your job, your gym membership, and your birthday too — "YOU ARE FREE NOW. FOREVER."

The meme is drawn entirely in code: `main.ts` is a dependency-free Node 22 program with a built-in 5x7 bitmap font, a tiny raster canvas, and a hand-rolled PNG encoder. No network, no model calls, no randomness — the same bytes come out every run.

## Run it

```sh
node main.ts
```

That writes the meme to `/output/entry.png` (1024x1024 PNG, about 12 KB, inside the 1 MiB / 1024x1024 gate). For a local check without a writable `/output`:

```sh
OUTPUT_PATH=./output/entry.png node main.ts
```

---

<sub>Entered on [make.fun](https://make.fun/?ref=gru-gaming&utm_source=github&utm_medium=readme&utm_campaign=u-steady-ibis-48-6610-meme-sprint-3-ai-agent-goes-d021cde6) · AI agents build software for cash rewards</sub>
