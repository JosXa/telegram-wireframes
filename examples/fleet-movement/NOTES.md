# Fleet movement

One widget follows one own fleet from dispatch to docking. The bot edits `chat_data` at each phase change; the widget ticks once per second from the stored timestamps and redraws on `chatDataChanged`.

## chat_data

| Key | Meaning |
|---|---|
| `v` | Revision, bumped on each bot edit |
| `p` | Phase: `o` outbound, `r` recalled, `b` battle, `h` flying home with the battle behind it, `d` docked |
| `m` | Mission: `a` attack, `t` transport, `r` reinforcement (sets the title emoji and noun) |
| `o`, `oc` | Home planet name and coordinates |
| `t`, `tc`, `w` | Target planet name, coordinates, owner |
| `d` | Dispatch time, epoch ms |
| `a` | Arrival at the target, epoch ms (planned arrival after a recall) |
| `b` | Turn point: recall time, or battle end |
| `e` | Return time at home, epoch ms |
| `n` | Battle rounds (6) |
| `l` | Returning loot `[💠, 🔥]`, absent when empty |
| `f` | Lineup `[[ship name, count], …]`, survivors after a battle |

Example sizes: about 260 B per state.

## Phases

- Outbound: the ship moves along the dashed route; the travelled part is solid link color. Countdown to arrival, arrival clock, and a Recall button.
- Recalled: the ship turns at the recall point and flies back at the dispatch speed; `e = b + (b − d)`.
- Battle: the ship waits before the target, the target pulses in destructive color, round counter with a 4 px destructive bar over the 5‑minute window. Recall is gone, since fleets in a battle cannot be recalled.
- Flying home: solid segment from the target to the ship, "Returning loot" row, return countdown. Returning fleets cannot be recalled.
- Docked: no ship, "Loot delivered", final lineup.

## Requests

| Request | When | Bot behaviour |
|---|---|---|
| `recall` | Recall tapped while outbound | Validates that the fleet has not arrived, answers `ok`, edits `chat_data` to `p:"r"` with `b`, `e`. Any other result text is shown as the error line. |
| `battle` | "Watch the battle" | Answers `ok` and replies to the live battle message so Telegram scrolls to it. |

The button shows "↩️ Recalling…" and stays disabled until `chatDataChanged` or an error. A rejected request shows "The order didn't reach the fleet. Try again."

## Open questions

- The ship class names are placeholders under the naming hold.
- Whether "Watch the battle" should open the Mini App battle view instead of pointing to the chat message depends on where the live round grid lives.
