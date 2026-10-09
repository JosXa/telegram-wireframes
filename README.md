# telegram-wireframes

Wireframe a Telegram bot by writing the messages it will send. telegram-wireframes renders them with [Telegram Web A](https://github.com/Ajaxy/telegram-tt)'s own code, offline, without a Telegram account.

<p>
  <img src="docs/space-emperors-dark.png" width="280" alt="A bot chat in the dark theme: a photo of a hex star map with navigation buttons, a level-up message with a green and a disabled button, and a fleet alert with a red button">
  <img src="docs/space-emperors-light-keyboard.png" width="280" alt="The same chat in the light theme with the reply keyboard menu open">
</p>

## Fixtures

A fixture is one chat between a user and a bot, written with [Bot API](https://core.telegram.org/bots/api) field names. The objects your bot passes to `sendMessage` or `sendPhoto` go straight in:

```json
{
  "bot": { "first_name": "Space Emperors", "commands": [{ "command": "build", "description": "Buildings" }] },
  "messages": [
    { "from": "user", "text": "/start", "entities": [{ "type": "bot_command", "offset": 0, "length": 6 }] },
    {
      "from": "bot",
      "text": "🏢 Headquarters reached level 4",
      "reply_markup": {
        "inline_keyboard": [
          [{ "text": "Queue next upgrade", "callback_data": "upgrade", "style": "success" }],
          [{ "text": "Research Lab (needs HQ 5)", "disabled": {} }]
        ]
      }
    }
  ]
}
```

Supported today:

- Text and captions with entities (bold, italic, underline, code, links, spoilers, block quotes and more).
- Photos, with paths relative to the fixture file.
- Inline keyboards: callback, URL, Web App, login, switch-inline, copy, game and pay buttons, plus `style` and `disabled`.
- Reply keyboards, including contact, location, poll and Web App buttons.
- Bot name, description, peer color and command menu.

[`src/fixture.ts`](src/fixture.ts) has the full format, and [`examples/`](examples) has a complete chat.

## Usage

Requires [Bun](https://bun.sh), Node.js 24+ and npm 11+. Node builds Web A, and Bun runs everything else.

```sh
bun install
bunx playwright install chromium
bun run render path/to/fixture.json --keyboard
```

The first run fetches the pinned Web A commit, patches and builds it into `.cache/` (about a minute). Later runs reuse that build.

```
render <fixture.json...>   Screenshot each fixture into ./wireframes
    --theme dark,light       Themes to render
    --width 420 --height 900 --scale 2
    --keyboard               Also screenshot the opened reply keyboard
    --debug                  Print page and worker logs
serve <fixture.json...>    Serve fixtures for clicking around in a browser
```

## How it works

Web A ships a mocked client for its own tests. telegram-wireframes pins a Web A commit, applies [a small patch](patches/web-a.patch) that repairs the mock client and adds a hook, and injects [a loader](inject/) into Web A's worker. The loader fetches your fixture from a local server and converts the Bot API objects into the MTProto objects Telegram's servers would send. From there, Web A renders the chat as it would any other, and Playwright takes the screenshot.

Web A changes weekly. `upstream.json` pins the commit; [`.opencode/commands/update-web-a.md`](.opencode/commands/update-web-a.md) describes how to move the pin forward and repair the patch.

## License

[GPL-3.0-only](LICENSE), because the project distributes a patch to Telegram Web A, which is GPL-3.0.
