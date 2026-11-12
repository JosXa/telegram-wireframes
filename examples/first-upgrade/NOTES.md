# First upgrade

This widget shows the onboarding moment of the First Mineral Mine challenge. The 3-second upgrade counts down and completes in place with no bot edit. The widget then shows the new production rate and one next step, which claims the challenge reward.

## States

- `counting`: 0.4 s after the start. The bar fills smoothly and the countdown runs.
- `done`: the upgrade is finished, production is 💠 90/h (was 💠 60/h), and the claim button is shown.
- `claiming`: the claim request is pending.
- `claimed`: the bot answered with the delivered resources.

## chat_data

```json
{ "p": "Lulu", "c": "1:1:3", "l": 1, "s": 1794336000000, "e": 1794336003000, "r": [60, 90] }
```

- `l` is the target level, and `s` and `e` are the start and finish in epoch ms.
- `r` holds the minerals production per hour before and after the upgrade. The provisional balance gives 60 at level 0 and 90 at level 1.

## Requests and bot edits

- `claim`: the bot claims the firstMineralMine reward and answers with display text such as `💠 150 · 🔥 40 delivered.` (advisor-received). The widget hides the button and shows that text. Then the bot replaces the message with the next challenge in the chain.
- BUSY and RATE_LIMITED show interaction-busy. NOT_ALLOWED says that only the planet's owner can claim. Every other failure shows something-went-wrong and enables the button again.
- The bot sends no edit when the upgrade completes. The domain completes the upgrade at `e`, so a claim after `e` finds it done.
- A forward has no chat_data and shows a static line.

## Open questions

- The widget uses the reward claim as the single next step. If the design prefers "upgrade the Logistics Depot" first, the button changes and the claim moves to the Advisor message.
- The claim answer is display text from the bot. A structured answer would let the widget format the resources itself.
