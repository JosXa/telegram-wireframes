# Mixed ship batches

A Space Emperors planet builds one ship batch at a time. A batch holds several ship types with an amount each, such as 12 Starter ships, 4 Raiding ships and 2 Line ships. The Shipyard builds them in the order they were added, and each ship joins the stationed ships as soon as it is ready. Adding ships to a running batch grows the unfinished line of that type or adds a new line at the end. The planet's stock bounds every amount, so the batch needs no size limit.

This study compares seven ways to compose such a batch in a Telegram chat:

- **A · Paired buttons:** ➖ and ➕ for every ship type, with one shared step size.
- **B · One stepper:** pick a type, then set its amount with one stepper.
- **C · Ship pages:** each type opens its painted page with stats and a stepper.
- **D · Written order:** one typed reply such as `12 starter, 4 raid, 2 line`.
- **E · Compositions:** saved mixes, built at a chosen multiple.
- **F · Painted selector:** between B and C. B's stepper inside a photo message whose painting follows the selected type.
- **G · Typed amounts:** between C and D. Tap a type and reply with a number.

All variants share the Shipyard, the production view, ➕ Add ships, 🔁 Last batch and the notification when a batch finishes.

## Try them

```sh
bun run batches:render
bun run batches:serve
```

Open the URL printed by the serve command. The gallery shows each variant's screenshots with its strengths and costs. Open Telegram from a card to use the mock: every button and typed reply works. 🔄 Refresh moves the clock forward, so a batch finishes after a few taps.

## How it works

[model.ts](model.ts) holds the ship catalog and the batch rules as pure functions over one state. [screens.ts](screens.ts) turns a state into a Bot API fixture. A fixture's name encodes its state, and each button navigates to the state its action produces. The server computes those fixtures on request, so the mock needs no list of screens. [variants.ts](variants.ts) names the gallery shots and their readable aliases.

## Assumptions

- Ship names, stats and costs are gamebot's provisional catalog. The names are placeholders until the game's glossary settles the ship classes.
- No batch can be cancelled. Whether a batch can be cancelled, and for how much, is still open in the game's economy design.
- The Shipyard is at level 5, so the Heavy line ship stays locked and shows why.
- The paintings in `art/` are reduced copies of gamebot's `assets/ships/`.
