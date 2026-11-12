# Battle

One widget for a battle, from the first round to the end. During the battle window (docs/adrs/ADR-timed-battles.md: round 1 at the first arrival, then one round per minute up to round 6, elimination ends it early), it shows the current round, the countdown to the next one and every participant's ships as small squares. When a round resolves, the bot pushes its result and the widget plays that round at once: the lost ships turn into outlines one after another, losses from earlier rounds take the track color, and the round strip advances. Players watch without tapping. When the battle ends, the widget switches to the done view: the final squares, the outcome line, losses per side, salvage, ↺ Replay and 📜 Battle report. The text battle report stays the authoritative record.

Animation uses background and outline colors with transitions only (no opacity). With prefers-reduced-motion, the squares and strip change without transitions.

## chat_data

```json
{"p":"Ash","c":"1:4:2","v":"d","b":41,"t":1794343720000,"o":"x","s":[1080,318],
 "g":[["a","Nova","Strike ship",12,[11,9,8,7,6,6]],
      ["a","Mirela","Line ship",3,[0,0,0,0,3,3],5],
      ["d","Korvin","Starter ship",30,[26,22,18,15,8,1]]]}
```

| Key | Meaning |
| --- | --- |
| `p`, `c` | Battle location name and coordinates |
| `v` | Viewer's side, `a` or `d`: own side link color, the other side destructive. `d` adds the 🔒 colony lock note while the battle runs |
| `b` | Battle id |
| `t` | Round 1 time, epoch ms; round n fires at `t + (n−1)·60 000` |
| `g` | Groups in display order: `[side, owner, ship, start count, ships left after each resolved round, join round?]` |
| `o` | Outcome, set with the last round: `a` attackers won, `d` defenders won, `x` draw |
| `s` | Salvage `[minerals, gas]` |

Each round appends one number to every group's array, so the current round is the longest array. A fleet with a join round later than the current one shows empty squares and "joins in round 5"; its array holds zeros for the rounds before it joins. A viewer sees only the groups his side knows of, so Korvin's round 1 omits Mirela.

### Size

The ended state of the walkthrough battle uses 315 B. The fixed keys take about 86 B and a group with a long ship name and three-digit counts about 60 B, so 1024 B holds about 15 groups over 6 rounds. Larger battles need a compact encoding: an owner table plus one string per group, such as `"n":["Nova","Mirela","Korvin"]` and `"g":["a0S12.11.9.8.7.6.6","a1L3.0.0.0.0.3.3@5"]` (side, owner index, ship code, start count, then the counts after each round, `@` join round). That takes about 31 B per group plus about 9 B per owner, which fits about 28 groups.

### Many participants

To keep the done view under about 560 px, the widget merges rows when there are more than 9 rows of groups and owner headings: first one row per owner, then one row per side. One square stands for up to `ceil(start/30)` ships, so a row never wraps past two lines.

## Bot edits

| When | Edit |
| --- | --- |
| Round 1 resolves | Send the message to each participant, with `g` holding one count per group. Only this message notifies |
| Each later round resolves | Silent `editMessageWidgetData`: append the round's counts; add a group when a fleet's arrival becomes known, with its join round |
| Last round resolves (round 6 or elimination) | Same edit, plus `o` and `s`. The widget plays the round, then switches to the done view about 1.8 s later. Then send the text battle report, which notifies once |

Captions add what the widget does not show: during the battle, that other colonies take orders as usual and that fleets in battle cannot turn back; after it, that the colony takes orders again. The bot edits the caption with the last round.

## Widget behavior

- `chatDataChanged` with exactly one new round plays that round. A jump of several rounds, a first open mid-battle, or a re-created message draws the current round directly. A message opened within 2 s of its round's resolution plays that round once.
- ↺ Replay plays every round locally, one per 1.2 s, then returns to the done view. It sends no request.

## Requests

| Action | Call | Bot |
| --- | --- | --- |
| 📜 Battle report | `request('br:<battleId>')` | Sends the text battle report again below and answers `ok`; the button then reads "📜 Sent below" |

Errors: `BUSY` and `RATE_LIMITED` show "One moment, then try again."; others show "The record keepers are still writing. Try again."

## States

- `round-1`: Korvin's view right after round 1, with the colony lock note.
- `round-4-ally`: Nova's view as round 4 plays; Mirela's 3 Line ships join in round 5.
- `ended`: Korvin's done view of the draw after round 6, after tapping 📜 Battle report.
- `replaying`: the same done view with ↺ Replay tapped, at round 3.

In the walkthrough, Mirela arrives two minutes after Nova, joins in round 3 and the attackers win in round 5. These states delay her to round 5 to show a joining fleet, which ends in a draw (simulation in /tmp/opencode/sim/sim.ts).

## Open questions

- Should defenders see a joining fleet's owner and ships before it fires?
- Does a draw leave salvage? The simulation creates it; docs/warfare.md does not say.
- Ship names are placeholders.
