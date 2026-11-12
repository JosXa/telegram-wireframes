# Construction queue

This widget shows a planet's upgrade queue as a live tree. 🔨 marks the running upgrade, with a progress bar, the remaining time and the finish clock. ⏳ marks the waiting upgrade, with its own finish clock and its start time. When a waiting upgrade is missing a prerequisite, it shows 🔒 with the reason and no time.

## States

- `queue`: Mineral Mine (⬆️ 8) is running and Logistics Depot (⬆️ 3) is waiting.
- `blocked`: the waiting Orbital Shipyard (⬆️ 3) needs Mineral Mine at level 8 first.
- `finished`: two seconds after the running upgrade finished. The widget marks it ✅ and starts the waiting upgrade locally, before the bot's edit arrives.

## chat_data

```json
{ "p": "Lulu", "c": "1:1:3", "q": [
  { "n": "Mineral Mine", "l": 8, "s": 1794336000000, "e": 1794339240000 },
  { "n": "Logistics Depot", "l": 3, "d": 2880000 },
  { "n": "Orbital Shipyard", "l": 3, "k": ["Mineral Mine", 8] } ] }
```

- `p` is the planet name and `c` the coordinates.
- `q` holds the entries in queue order.
- A running entry has `s` and `e`, its start and finish in epoch ms.
- A waiting entry has `d`, its duration in ms. The widget starts it when the entry before it finishes.
- A blocked entry has `k`, the missing [building, level]. The widget skips it and shows no time.

## Requests and bot edits

- The widget sends no requests. Cancel stays an inline keyboard button under the message (`✖ Cancel Mineral Mine (⬆️ 8)`) and opens the usual confirmation.
- The bot edits chat_data and the caption when an upgrade finishes, when work is queued or cancelled, and when a prerequisite changes. The local transition covers the time until that edit arrives.
- The local start of the waiting upgrade is a prediction. If the prerequisite check fails when the work starts, the bot's edit moves the entry to 🔒.

## Open questions

- en.ts writes levels as `Mineral Mine (⬆️ 8)`, so the widget uses that form instead of "Mineral Mine → 8".
- The header says "Upgrade queue". The glossary has Queue and Upgrade but no settled name for this view.
