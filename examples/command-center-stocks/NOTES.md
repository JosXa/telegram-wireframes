# Command Center stocks

This widget is a live resource ticker for one planet. The 💠 and 🔥 stocks grow each second from the stored amount, the production rate and the settle time, with storage bars and the time until each store is full. A small seeded SVG planet in the biome's colors takes the place of the painted Command Center photo.

## States

- `normal`: Lulu, a ⛰️ mountainous home planet.
- `gas-nearly-full`: Ash, 🌋 volcanic, with gas storage full in about 50 minutes.
- `gas-full`: the same planet an hour later. Gas is at storage capacity, so its production shows "stopped".
- `snowy`, `tropical`, `wasteland`: the other biomes. The tropical state shows the K display for large stocks.

## chat_data

```json
{ "p": "Lulu", "c": "1:1:3", "b": "m", "h": 1, "t": 1794336000000,
  "m": [5970, 640, 40000], "g": [1480, 190, 20000] }
```

- `b` is the biome key (m, s, t, v, w), `h` the home planet flag and `t` the settle time in epoch ms.
- `m` (minerals) and `g` (gas) hold [stock at `t`, production per hour, storage capacity]. A stock above storage capacity stays as it is, as after a refund.
- The coordinates seed the planet drawing, so the same planet always looks the same.

## Requests and bot edits

- The widget sends no requests. Building levels stay in the caption, and buttons stay on the inline keyboard.
- The bot edits chat_data when a rate or a storage capacity changes, for example after an upgrade, a battle or a delivery. Ticking needs no edits.

## Trade-off: procedural planet or painted photo

- The widget gains live stocks and storage bars in one bubble. It needs no photo upload and no file_id cache, every planet looks different, and the caption has room for building levels.
- The widget loses the painted photo, which carries the game's art style and mood far better than a 92 px vector disc. A photo also has more visual weight in the chat than a widget, and photos render on clients where widgets may not.
- A middle path keeps the painted photo for rare moments, such as colonization or the season start, and uses this widget for the Command Center that players check every day.
