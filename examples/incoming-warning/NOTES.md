# Incoming warning

The defender's pinned threat message. One widget message per threatened colony replaces repeated alerts: the bot sends it once for the first incoming movement and then edits its state silently as fleets join, get verified, change their arrival time, turn back or arrive. Each lane is one movement, sorted by arrival; the soonest lane has the large countdown, and in its final minute the number turns to the destructive color and pulses.

## chat_data

```json
{"p":"Ash","c":"1:4:2","b":41,"l":[[7,"1:1:3","Nova",1794339600000,1794343720000,"a","12 Strike ships · 6 Raiding ships"]]}
```

| Key | Meaning |
| --- | --- |
| `p`, `c` | Target colony name and coordinates |
| `b` | Battle id, set once the first fleet arrived and the battle began |
| `l` | Lanes: `[movementId, originCoords, owner or 0, detectedAt, arrivalAt, mission?, details?]` |

`mission` is absent while unknown ("Mission unknown"). With verified intelligence it is `a` Attack, `r` Reinforcements, `t` Transport or `s` Spy and shows with 👁; the bar turns destructive for hostile missions and link-colored for reinforcements. `owner` is 0 while unknown. `details` is a short verified line such as the ship list. Progress runs from `detectedAt` to `arrivalAt`. Lanes whose arrival passed move to the compact "arrived" list without a state edit; the widget re-renders at each arrival.

## Requests and links

| Action | Call | Bot |
| --- | --- | --- |
| Tap a lane | `openTelegramLink('https://t.me/space_emperors_bot/app?startapp=f<movementId>')` | Mini App opens the system view of the target with that movement highlighted |
| ⚔️ Watch the battle | `request('bt:<battleId>')` | Sends the live battle message for this battle again below, so it sits at the bottom of the chat; answers `ok` |

Errors: `BUSY` and `RATE_LIMITED` show "One moment, then try again."; others show "The sky over Ash went dark for a moment. Try again."

## Bot edits

- First incoming movement for a colony: send the message, pin it silently, notify once.
- More movements: silent state edit. At most one new notifying message per additional hostile player, per docs/notifications.md; that message points to this one.
- Verified intelligence, recall or arrival time change: silent state edit (recalled lanes disappear).
- Battle begins: set `b`; the caption switches to the colony lock note.
- Captions carry what the widget does not show: the ships stationed at the colony and its stores while fleets approach, then the colony lock before and during the battle.
- Battle ends: unpin; the battle report follows as text.

## Open questions

- How a defender verifies a fleet's mission and ships is unsettled (fleet observation ship naming hold in GLOSSARY.md). The three-fleet state assumes some scan revealed Nova's main fleet.
- Does the owner of an incoming fleet show by default (the walkthrough says "A fleet from Nova") or only after verification? The widget supports both.
- Ship names are placeholders.
