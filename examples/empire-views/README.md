# Space Emperors: all views

This study covers the game's [view shortlist](https://github.com/JosXa/space-emperors/blob/main/docs/design-shortlist.md#views), battle replay, and the action states needed to review those views. Telegram Web A renders the chat and Mini App frame. The fleet app uses local sample state.

## Open the catalogue

```sh
bun run views:render
bun run views:serve
```

Open the URL printed by `views:serve`. Select a view, search for a state, or follow one of the player journeys. Each state has source notes and links to related states. **Open in Telegram** opens the fixture in Web A; **Try interactive view** opens its app content directly. Export coverage downloads a Markdown index.

Chat buttons are visual examples. Use related states to follow a chat action. The fleet app supports dispatch preparation and confirmation, speed and gas previews, cargo limits, recall, reinforcement withdrawal, investigation outcomes, verification expiry, and replay playback and scrubbing.

`views:render` creates both light and dark screenshots under the ignored `wireframes/empire-views/` directory. `views:serve` rebuilds the fixtures and app assets. Rerun rendering after changing a source file so the catalogue images match it. `bun run test:views` checks the interactions inside Telegram at phone and desktop sizes.

## Source and scope

`catalogue.ts` contains typed Bot API fixtures and review metadata. `app.ts` demonstrates fleet interactions. `gallery.ts` provides navigation and coverage export. `src/empire-views.ts` builds and serves them through the existing fixture tools.

Buildings, research and resource management stay in chat. Maps, fleet controls and battle replay open in the Mini App. The map states reuse the existing galaxy example. The system chat state uses a rendered hexagonal image.

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
