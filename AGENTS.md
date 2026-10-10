# telegram-wireframes

Renders Telegram bot chats from Bot API JSON with Telegram Web A's own renderer, offline.

## VISION

**Wireframe a Telegram bot by writing the messages it will send, and see them the way Telegram draws them.**

- **Fixtures reuse bot output.** A fixture is a list of messages written with Bot API field names: `text`, `entities`, `photo`, `caption`, `reply_markup`. Bot code can emit fixtures from the same objects it passes to grammY or any other library, so a wireframe turns into real screen code and real screen code turns back into wireframes.
- **Telegram does the drawing.** The renderer is [Telegram Web A](https://github.com/Ajaxy/telegram-tt) running its mocked client, with a small patch and our loader injected. This project never redraws Telegram UI. Use Web A as the reference and accept differences to the iOS and Android apps for wireframing.
- **Offline and deterministic.** No account, no network, no Telegram servers. One command turns fixtures into PNGs, so wireframes can live next to the bot code and run in CI.
- **Current with Telegram.** Telegram ships new chat features often, and Web A follows. Use `/update-web-a` to keep the pinned Web A commit current.
- **Any bot.** Nothing here knows about a specific bot or framework.
- **Mini Apps run as web pages inside Telegram's own frame.** Keep app content in fixture files or a separate dev server. Mock launch responses in `inject/loader.ts` and let Web A own permissions and its iframe bridge.

### Later

- Rich Messages (tables, details blocks, buttons inside blocks), ephemeral messages and message effects.
- Custom emoji in text and as button icons, which need emoji documents from the loader.
- `parse_mode: "HTML"` and `"MarkdownV2"` as an alternative to hand-written entities.
- Group chats with several members and bots, inline query results.
- Storyboards: a sequence of states (edits, button presses) rendered as frames or a short video.

## Layout

| Path | Role |
|---|---|
| `src/fixture.ts` | Fixture types, a Bot API subset. Copied into Web A, so it has no imports. |
| `src/validate.ts` | Fixture checks that run before rendering. |
| `src/upstream.ts` | Fetches the pinned Web A commit into `.cache/web-a`, applies the patch, injects `inject/`, installs and builds. |
| `src/server.ts` | Serves the Web A build and the fixtures under `/__wireframes__/`. |
| `src/render.ts` | Playwright screenshots, one per fixture and theme. |
| `inject/` | Our code that runs inside Web A's worker: fixture loader, Bot API → TL converter, language pack. Copied to `src/lib/gramjs/client/wireframes/` in Web A. |
| `patches/web-a.patch` | The only changes to Web A's own files. |
| `upstream.json` | Pinned Web A repository, branch and commit. |
| `examples/` | Reference fixtures. Every update must still render them. |

## Rules

- **Our logic lives in `inject/`; the patch only adds hooks and fixes the stock mock client.** Keep `patches/web-a.patch` small, because every hunk can conflict on update.
- **Edit `.cache/web-a` only while working on the patch.** Rebuild with `bun run build`, then write the changes back with `bun run save-patch`. Web A commits its `dist/`, and `save-patch` excludes it.
- **Messages use exact Bot API names and shapes.** Add a new Telegram feature under its Bot API name, convert it in `inject/convert.ts`, and validate it in `src/validate.ts`; keep preview metadata such as `mini_app` outside the messages.
- **`inject/` only compiles inside Web A.** Use `bun run typecheck:web-a` to check it with Web A's TypeScript setup because the root `tsc` skips it.
- **License: GPL-3.0-only.** The project distributes a patch to GPL code.
- **Space Emperors artwork:** before every image generation for this game, read its [Art style](../bots/gamebot/docs/ART-STYLE.md) and include the direction in the prompt. Reuse character or object references for continuity.

## Patch

Each hunk in `patches/web-a.patch` and its purpose, so conflicts can be resolved by intent:

- `MockClient.loadScenario`: a `wireframe:<name>` scenario loads the fixture through `inject/loader.ts` and installs its middleware.
- `MockClient.start`: awaits the scenario, then calls the `onConnected` callback that the real client receives as its second argument. Without it, Web A queues every API call forever.
- `MockClient`: no-op stubs for methods the real `TelegramClient` gained after the mock was written (`setIsPremium` and others).
- `MockClient` `upload.GetFile`: honors `offset` and `limit`. Returning the whole file per part corrupts images larger than one part.
- `createMockedPhoto`: reads `w` and `h` from the mock document for the photo sizes.

Requests that Web A needs to boot and the stock mock leaves unanswered are answered in `inject/loader.ts`, not in the patch.

## Checks

`bun run check`, `bun test`, `bun run examples` and `bun run test:mini-app` must pass. After a change that can affect rendering, open the PNGs under `wireframes/examples/` and compare them with `docs/`; inspect the Mini App frame as well as the chat.

When rendering times out, rerun with `--debug --theme dark`. It prints page and worker logs, including `[wireframes] unanswered request <method>` for every request that nothing answers.
