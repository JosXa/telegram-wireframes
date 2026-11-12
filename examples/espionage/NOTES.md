# Espionage

Dispatches spy drones to one target. The slider picks the drone count and shows, live, the chance that each section of the espionage report comes back; the button dispatches them with one request. While the drones fly, the widget shows their route and the countdown to arrival. When they arrive, it points to the espionage report, which the bot sends as text below.

The bot sends this widget when the player picks "Spy" on a target (system view, or a button under an earlier espionage report).

## chat_data

```json
{"t":"Ash","c":"1:4:2","w":"Korvin","o":"Lulu","h":20,"d":3,"n":12,"m":1656000,"g":[30,2],
 "l":[12,1794337200000,1794338856000],"r":[12,3,1794338880000]}
```

| Key | Meaning |
| --- | --- |
| `t`, `c`, `w` | Target name, coordinates, owner (omit `w` if unowned) |
| `o` | Origin colony name |
| `h` | Spy drones in the origin hangar |
| `d` | Defending drones from the last report, absent if never seen |
| `n` | Last count sent to this target, the slider's start value (default 5) |
| `m` | Travel time in ms |
| `g` | Gas for the trip: `g[0] + g[1] · drones` |
| `l` | In flight: `[sent, dispatchedAt, arrivesAt]` |
| `r` | Arrived: `[sent, shot down, seenAt]` |

## Odds formula

`r = sent / (1 + defending drones)`, and the chance per section is `1 − e^(−r/k)` with `k` = 0.5 Resources, 1.5 Stationed ships, 3 Buildings and work, 6 Research (docs/warfare.md proposal). Each defending drone shoots down one spy drone. Display caps at 99% until the chance is exactly 1. In the walkthrough, Nova's 12 drones against Korvin's 3 give r = 3: 99%, 86%, 63%, 39%, and her report showed resources and stationed ships only.

## Requests

| Action | Call | Answer | Widget |
| --- | --- | --- | --- |
| 👁 Spy with n drones | `request('spy:<n>')` | `ok` | Bot dispatches, sets `l`, lowers `h`; the widget switches to the flight view on `chatDataChanged` |
| | | `gas` | "The tanks at Lulu are too low for this trip." |
| | | `hangar` | "The hangar holds fewer drones now. Pick again." (the bot also updates `h`) |
| Spy again | local | | Back to the slider |

Request errors: `BUSY` and `RATE_LIMITED` show "One moment, then try again."; others show "The hangar crews did not answer. Try again."

## Bot edits

On dispatch: `l`, `h`. On arrival: `r`, `d` (defenders seen), then the text espionage report as a new message, which notifies once. The target gets its own "Spy drones over Ash" notice from the existing flow.

## Open questions

- Odds use the defending drones from the last report. With no report, they assume an unguarded sky and say so, which makes a first attempt look safer than it is. Alternatives: show a range, or hide the odds until a first report.
- Spy drones are used up (one-way proposal in docs/warfare.md). If they return, drop "The drones do not come back." and add a return leg.
- "Buildings and work" and "Research" are the walkthrough's section names; the active espionage installation and the espionage archive names are still on hold in GLOSSARY.md.
- The button says "Spy"; GLOSSARY.md avoids "launch".
