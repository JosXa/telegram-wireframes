#!/usr/bin/env bun
import { parseArgs } from "node:util";

import { render, type Theme } from "./render";
import { chatUrl, registerFixtures, startServer } from "./server";
import {
	paths,
	readUpstream,
	rebuild,
	resolveBranchHead,
	savePatch,
	setup,
	typecheck,
	writeUpstream,
} from "./upstream";

const USAGE = `telegram-wireframes <command>

Commands:
  render <fixture.json...>   Screenshot each fixture
      --out <dir>              Output directory (default: wireframes)
      --theme <themes>         dark, light or dark,light (default: dark,light)
      --width <px>             Viewport width (default: 420)
      --height <px>            Viewport height (default: 900)
      --scale <n>              Device scale factor (default: 2)
      --keyboard               Also screenshot the opened reply keyboard
      --timeout <ms>           Time to wait for the chat (default: 30000)
      --debug                  Print page and worker logs, and report unanswered mock requests
  serve <fixture.json...>    Serve fixtures for clicking around in a browser
      --port <n>               Port (default: 4242)
  setup [--force]            Fetch, patch and build the pinned Web A commit
  build                      Rebuild .cache/web-a as is (while editing the patch)
  typecheck                  Type-check inject/ and the patch inside Web A
  save-patch                 Write .cache/web-a changes to patches/web-a.patch
  pin [<commit>|latest]      Print or change the pinned Web A commit
`;

const { positionals, values } = parseArgs({
	allowPositionals: true,
	options: {
		out: { type: "string", default: "wireframes" },
		theme: { type: "string", default: "dark,light" },
		width: { type: "string", default: "420" },
		height: { type: "string", default: "900" },
		scale: { type: "string", default: "2" },
		keyboard: { type: "boolean", default: false },
		timeout: { type: "string", default: "30000" },
		debug: { type: "boolean", default: false },
		port: { type: "string", default: "4242" },
		force: { type: "boolean", default: false },
		help: { type: "boolean", short: "h", default: false },
	},
});

const [command, ...args] = positionals;

function parseThemes(value: string): Theme[] {
	const themes = value.split(",").map((theme) => theme.trim());
	for (const theme of themes) {
		if (theme !== "dark" && theme !== "light") throw new Error(`Unknown theme: ${theme}`);
	}
	return themes as Theme[];
}

async function fixturesFromArgs() {
	if (!args.length) throw new Error("Pass at least one fixture file.");
	return registerFixtures(args);
}

async function main() {
	if (values.help || !command) {
		console.log(USAGE);
		return;
	}

	switch (command) {
		case "render": {
			const fixtures = await fixturesFromArgs();
			await setup();
			const server = startServer({ dist: paths.dist, fixtures, debug: values.debug });
			try {
				const files = await render(fixtures, {
					origin: server.url.origin,
					outDir: values.out,
					themes: parseThemes(values.theme),
					width: Number(values.width),
					height: Number(values.height),
					scale: Number(values.scale),
					keyboard: values.keyboard,
					debug: values.debug,
					timeoutMs: Number(values.timeout),
				});
				for (const file of files) console.log(file);
			} finally {
				server.stop(true);
			}
			return;
		}
		case "serve": {
			const fixtures = await fixturesFromArgs();
			await setup();
			const server = startServer({
				dist: paths.dist,
				fixtures,
				port: Number(values.port),
				debug: values.debug,
			});
			for (const name of fixtures.keys()) console.log(chatUrl(server.url.origin, name));
			return;
		}
		case "setup":
			await setup({ force: values.force });
			return;
		case "build":
			await rebuild();
			return;
		case "typecheck":
			await typecheck();
			return;
		case "save-patch":
			await savePatch();
			return;
		case "pin": {
			const upstream = await readUpstream();
			const target = args[0];
			if (!target) {
				console.log(`${upstream.repository} ${upstream.branch} ${upstream.commit}`);
				return;
			}
			const commit = target === "latest" ? await resolveBranchHead(upstream) : target;
			await writeUpstream({ ...upstream, commit });
			console.log(`Pinned ${upstream.repository} at ${commit}`);
			return;
		}
		default:
			console.error(USAGE);
			process.exitCode = 1;
	}
}

main().catch((error: Error) => {
	console.error(error.message);
	process.exitCode = 1;
});
