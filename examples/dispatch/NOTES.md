# Dispatch

The composer the bot sends from a known target in chat, for example under an espionage report. The player picks a mission, ship counts and dispatch speed; the widget previews travel time, arrival, gas for both legs, cargo capacity and the return time. The server quotes and validates again on dispatch.

## chat_data

| Key | Meaning |
|---|---|
| `t`, `tc`, `w` | Target name, coordinates, owner |
| `sn` | Time of the espionage report, epoch ms (👁 in the subtitle), optional |
| `o`, `oc`, `g` | Home planet name, coordinates, 🔥 gas in stock |
| `k` | `[steps, minutes per step at speed 1, base minutes, gas overhead per step, minimum speed %, battle minutes]` = `[2,264,10,15,25,5]` |
| `ms` | Allowed missions, letters of `a` attack, `t` transport, `r` reinforcement |
| `m` | Default mission |
| `s` | Stationed ship types `[[name, stationed, speed, fuel, cargo, attack, hull], …]` |
| `c`, `pc` | Default counts per type and default speed % |
| `x` | Dispatch time, set by the bot after a successful dispatch; locks the widget |

About 310 B for three ship types.

## Formulas (preview only)

- Top speed is the slowest chosen ship's speed. `f = pc / 100`, with `pc` between `k[4]` (25) and 100.
- Travel minutes = `base + steps × minPerStep / (topSpeed × f)`, rounded to whole seconds.
- Gas for both legs = `ceil(2 × (overhead × steps + Σ count × fuel × steps × f²))`. Gas grows with the square of the speed fraction; the overhead does not.
- Back by = dispatch + 2 × travel, plus the 5‑minute battle window for an attack.
- Walkthrough check: 12 Strike + 6 Raiding at 100% gives 1:08:40 and 🔥 876; at 80% 🔥 582.

## Interaction

- Tap −/+ to step a count; tap the count to cycle 0 → half (rounded up) → all → 0.
- Drag the speed slider (pointer capture, `touch-action:pan-y`, track starts about 80 px from the left). Cancel restores the previous speed.
- Choices persist in `localStorage` key `d` until the bot sets `x`.
- Transport needs cargo amounts, which are typed input, so the button reads "📦 Choose cargo ↗" and opens `https://t.me/space_emperors_bot/app?startapp=t1_4_2_t_100_0_6_12` (the composed order with `_` separators) in the Mini App.

## Request

`d:<coords>:<mission>:<speed%>:<counts joined by .>`, e.g. `d:1:4:2:a:100:0.6.12` (20 B; 64 B fit about 12 ship types).

The bot checks ships and gas, reserves gas for both legs and answers `ok`. It then edits this message's `chat_data` to add `x` with the dispatched `c` and `pc`, and sends a new fleet-movement widget for the fleet. Any other answer text is shown under the button; a rejected request shows "The order didn't reach Lulu. Try again."

## Button states

| Condition | Label |
|---|---|
| Ready | ⚔️ Dispatch (mission emoji) |
| Pending | ⏳ One moment… |
| No ships | Choose ships (disabled) |
| Short of gas | Lulu needs 🔥 236 more (disabled) plus "Slower flight burns less gas." |
| Transport | 📦 Choose cargo ↗ |
| Dispatched | Dispatched at 20:40 (disabled) |

## Open questions

- The mission button reads "Reinforce"; the glossary settles the nouns reinforcement and Reinforcements but no verb label.
- Minimum dispatch speed is open in warfare.md; this uses the walkthrough's 25%.
- Colonization is a glossary mission but needs a free position as target, so the composer from a known planet offers attack, transport and reinforcement only.
- Ship class names are placeholders under the naming hold.
