---
description: Update the pinned Telegram Web A commit and repair the patch
---
Update telegram-wireframes to a newer Telegram Web A commit: $ARGUMENTS (a commit SHA, or the latest `master` if empty).

Current pin: !`bun src/cli.ts pin`

Follow the Patch and Checks sections in AGENTS.md. The update is done when every step below holds.

1. **Pin.** Run `bun run pin latest`, or `bun run pin <sha>` when a SHA was given. If the commit did not change, say so and stop.
2. **Build.** Run `bun run setup`.
   - If the patch does not apply, `.cache/web-a` holds 3-way conflict markers. Resolve each hunk by its intent from AGENTS.md against the new upstream code, run `bun run build`, then `bun run save-patch`.
3. **Type-check.** `bun run typecheck:web-a` exits 0. Fix errors in `inject/` or in the patch, never by loosening Web A's config.
4. **Render.** `bun run examples` and `bun run test:mini-app` exit 0. Inspect every PNG against `docs/` for: all messages present, photo loaded, bold text, primary/success/danger button colors, greyed disabled button, command menu button, colored bot avatar, the reply keyboard in the `-keyboard` shots, and the galaxy inside Telegram's Mini App frame.
   - On a timeout or a wrong render, rerun with `--debug --theme dark` and read the page exceptions and `[wireframes] unanswered request` lines. Failure classes seen before:
     - `client.<method> is not a function`: the real `TelegramClient` gained a method. Add a no-op stub to `MockClient`.
     - Boot stops after a request that returns nothing: answer it in the middleware in `inject/loader.ts`.
     - No API call reaches the worker: compare `MockClient.start` with the call site in `src/api/gramjs/methods/client.ts`.
     - Raw language keys in the UI: the language pack request changed. See `inject/langpack.ts`.
     - Avatars and names lose their color: the `help.GetPeerColors` shape changed.
   - Remove temporary logging from `.cache/web-a` before `bun run save-patch`.
5. **New Telegram features.** Read the Bot API changelog (https://core.telegram.org/bots/api-changelog) since the previous pin date and check which features the new Web A renders (`src/lib/gramjs/tl/static/api.tl`, `src/api/gramjs/apiBuilders/`). List the ones the fixture format could adopt. Report them and wait for a request before implementing them.
6. **Project checks.** `bun run check` and `bun test` pass.
7. **Previews.** If rendering changed visibly, refresh `docs/` from `wireframes/examples/` at 50% size.
8. **Commit and push.** One commit, `Update Web A to <short sha>`, with `upstream.json`, `patches/web-a.patch`, and any `inject/`, `src/` and `docs/` changes. Push to `origin main`.

Report the old and new commit, what changed in the patch or `inject/`, the screenshot paths, and the feature list from step 5.
