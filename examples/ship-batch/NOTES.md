# Ship batch

This widget shows a Shipyard batch whose ships finish one at a time. Each ship type has a row of glyphs that fill in as its ships finish, and the current ship fills from the bottom up. The top shows the time and finish clock for the whole batch.

## States

- `early`: 2 of 18 ships are finished, and Starter ships are in progress.
- `mid`: the Starter ships are done, the Raiding ships are at 2 of 4 with the next one in 0:42, and the Line ships are waiting.
- `complete`: all 18 ships are finished and stationed.

## chat_data

```json
{ "p": "Mirsol", "c": "1:1:6", "s": 1794336000000,
  "b": [["Starter ship", 12, 45], ["Raiding ship", 4, 120], ["Line ship", 2, 480]] }
```

- `s` is the batch start in epoch ms.
- `b` holds the lines in build order: [ship name, count, seconds per ship after game speed].
- The widget derives every finish time from these values. Ship durations are fixed when the batch starts, so the result matches the server timeline.

## Requests and bot edits

- The widget sends no requests. Cancel stays an inline keyboard button (`✖ Cancel Raiding ship × 4`) and refunds the unfinished ships.
- The bot edits the caption and chat_data when the batch finishes or is cancelled, and when a waiting batch starts. It sends no edit per finished ship, because each finished ship is already stationed on the server.

## Open questions

- The ship names are the provisional en.ts names, because ship class names are not settled.
- The widget does not draw a waiting second batch. It could add a ⏳ line such as "Line ship × 2 · waiting for a free slip".
