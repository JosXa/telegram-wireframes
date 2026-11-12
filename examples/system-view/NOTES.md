# System view

This widget draws one star system as an SVG map inside the bubble. The star sits at the left edge, orbit arcs are numbered outward, planets have owner rings, and the own planet is highlighted. Fleet movements are dashed routes with a dot that moves each second. An incoming fleet pulses on its target, and the list below the map gives each movement's countdown and arrival clock.

## States

- `quiet`: your fleet is on its way to attack Old Vesk.
- `incoming`: an incoming fleet from Korvin at Ash is also on its way to Lulu.
- `tap`: a tap on Mirsol opens `https://t.me/space_emperors_bot/app?startapp=p1_1_6`.

## chat_data

```json
{ "c": "1:1", "n": 8,
  "p": [[1, "Brannoc", "w", 2], [3, "Lulu", "m", 0], [5, "Old Vesk", "w", 3]],
  "f": [[1, 0, 3, 1794336000000, 1794337920000, "Korvin · from Ash 🌐 1:4:2"],
        [0, 3, 5, 1794336480000, 1794337200000, "Attack · 🌐 1:1:5"]] }
```

- `c` is galaxy:system and `n` the number of orbits.
- `p` holds the planets: [orbit, name, biome key, owner kind]. The owner kinds are 0 for you (link ring), 1 for an alliance member (green ring), 2 for another player (hint ring) and 3 for an abandoned world (dashed ring).
- `f` holds the movements: [kind (0 yours, 1 incoming), origin orbit (0 for outside this system), target orbit, departure, arrival (epoch ms), detail line].
- The bot writes the detail line. For an incoming fleet it holds only what the game shows, the sender and origin, and never the mission.

## Requests and bot edits

- The widget sends no requests. A tap on a planet opens the Mini App at that planet through openTelegramLink.
- The bot edits chat_data when a movement starts, arrives or is recalled, and when a planet changes owner. It also edits the caption with the number of incoming fleets.

## Open questions

- The docs describe the system view as a hexagonal map rendered on the server. This mockup uses arcs instead, and the position of a planet on its arc comes from a seed and has no game meaning.
- Players need a legend for the owner rings, in the widget or in the caption.
- The startapp payload format (`p1_1_6`) is invented here.
