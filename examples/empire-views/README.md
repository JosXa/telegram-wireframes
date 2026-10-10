# Space Emperors: all views

This study covers the game's [view shortlist](https://github.com/JosXa/space-emperors/blob/main/docs/design-shortlist.md#views), text battle reports, and the action states needed to review those views. Telegram Web A renders the chat and Mini App frame. The fleet app uses local sample state.

## Open the catalogue

```sh
bun run views:render
bun run views:serve
```

Open the connected bot URL printed by `views:serve`. Its menu links to every view and both admiral onboarding journeys. Native Telegram buttons load the next sample screen. Use **All views** to return to the menu, or send `/menu`, `/colony`, `/empire`, `/advisor` or `/start`. Close a Mini App with Telegram's header control to return to the chat.

The catalogue URL provides searchable snapshots, source notes, related states and player journeys. **Open in Telegram** starts the connected prototype at that state; **Try interactive view** opens its app content directly. Export coverage downloads a Markdown index. Onboarding snapshots use the art comparison's images.

Chat callbacks navigate between authored snapshots, so they do not simulate a persistent economy. The fleet app supports dispatch preparation and confirmation, speed and gas previews, cargo limits, recall, reinforcement withdrawal, investigation outcomes and verification expiry. Battle summaries, ship losses, resource accounting and round details use native Telegram text and buttons.

`views:render` creates both light and dark screenshots under the ignored `wireframes/empire-views/` directory. `views:serve` rebuilds the fixtures and app assets. Rerun rendering after changing a source file so the catalogue images match it. `bun run test:views` checks the interactions inside Telegram at phone and desktop sizes.

## Source and scope

`catalogue.ts` contains typed Bot API fixtures and review metadata. `connected.ts` joins those states with the admiral journeys, a shared menu and preview navigation. `app.ts` demonstrates fleet interactions. `gallery.ts` provides navigation and coverage export. `src/empire-views.ts` builds and serves them through the existing fixture tools. `bun run test:connected` exercises chat navigation, commands, character continuity and the return from Mini Apps.

`battle-reports.ts` holds names from the ship shortlist, sample base stats and battle outcomes. The example data specifies losses. The renderer calculates loot and salvage from those losses, construction costs and surviving cargo capacity. Large reports page through owners without abbreviating ship names or drawing one icon per ship.

Buildings, research, resources and battle reports stay in chat. Maps and fleet controls open in the Mini App. Ship lists show names, counts and per-ship stats as text. The map states reuse the existing galaxy example. The system chat state uses a rendered hexagonal image.

Draft labels are authorized for this wireframe pass, while final naming holds remain in the game glossary. Command Center, Mineral Mine and Atmospheric Harvester follow the settled names in the local docs. Research, Fleet Command, Intelligence, Alliance, and several ship and installation labels remain drafts.

Prices, rates, prerequisites, losses and dates are sample values. The catalogue identifies proposed and later mechanics:

- Supply Routes shows the manual-dispatch entry point because automation is outside V1.
- The battle-in-progress state illustrates the proposed battle window and its colony locks.
- Season duration, speed, the formula for alliance rankings, and the full tech tree remain undecided.
- Energy has no stock or balance display. Resource amounts use 💠 minerals and 🔥 gas in that order.
- Reports are snapshots. Planet reports expire after 14 days, while fleet verification ends with its movement leg.
- The preview for the alliance group uses a private fixture because group rendering is not supported yet.
- This pass uses English copy; German localization remains a separate design pass.

No fixture requires a Telegram account, sends a real message, or changes game state.
