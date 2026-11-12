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

## Widgets

The [widget lab](widget-lab.html) redesigns the composer as a [Telegram widget](https://core.telegram.org/bots/widgets): one message whose bubble holds the whole Shipyard. The draft lives in the widget, so dragging and stepping change nothing on Telegram until the player places the order. The order travels as one `request()` such as `b:0*12,1*4`; the bot checks it against the stock, answers with any refusal and edits the widget state, and the same bubble turns into the production view. ➕ Add ships flips it back to the composer, and the bot posts a notification when the batch is finished.

- **Slider rows** (A with sliders): a row per type with a slider, − and +. The hatched end of each track marks where the stock runs out.
- **Ship tabs** (B and F): a tab per type with its amount; the selected type shows stats, a slider, steps and Max.
- **Build order** (new): the batch as a timeline. Each line is as wide as its build time, shows when its last ship is ready, and moves earlier or later.
- **Mixes** (E): the last batch and saved mixes, built in multiples. Naming a mix needs typed text, so a button under the message asks for it in a reply.

The lab runs every widget in a frame with a stand-in for Telegram's runtime and a mock bot, on a clock you can move forward. `widgets/` holds the sources: `common.ts` is the runtime all layouts share, each layout adds its own script and CSS, `data.ts` holds the state schema and the bot's side, and `build.ts` bundles each layout into the single document the bot would send. The lab shows each document's size against Telegram's limit of 4,096 compressed bytes. Open in Telegram shows a widget in Telegram Web A, which draws it on a fixed clock and leaves orders pending.

Widget limits shaped the layouts: taps and horizontal drags only, no typed input, no images except drawn shapes, at most 1,024 bytes of state and a bubble at most 600 pixels tall. The ship paintings therefore stay in the chat layouts, and the widgets draw small silhouettes.

```sh
bun src/ship-batches.ts lab          # serves the lab without rebuilding Telegram Web A
bun test test/ship-widgets.test.ts   # sizes, widget profile, state size and the bot's answers
bun test/ship-widgets.smoke.ts       # orders in all four widgets and saves screenshots
```

## Assumptions

- Ship names, stats and costs are gamebot's provisional catalog. The names are placeholders until the game's glossary settles the ship classes.
- No batch can be cancelled. Whether a batch can be cancelled, and for how much, is still open in the game's economy design.
- The Shipyard is at level 5, so the Heavy line ship stays locked and shows why.
- The paintings in `art/` are reduced copies of gamebot's `assets/ships/`.
