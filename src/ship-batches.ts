// Mixed ship batch study: seven clickable Shipyard layouts. Screens are computed from the state
// encoded in each fixture name, so every combination of taps and replies has a screen.
import { cp, mkdir, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import { aliases, fixtureFor } from "../examples/ship-batches/screens";
import { shared, variants } from "../examples/ship-batches/variants";
import { layouts, widgetHtml, widgetSize } from "../examples/ship-batches/widgets/build";
import { widgetFixture } from "../examples/ship-batches/widgets/fixtures";
import { render } from "./render";
import { type RegisteredFixture, startServer } from "./server";
import { paths, setup } from "./upstream";
import { validateFixture } from "./validate";

export const batchesDir = resolve("wireframes/ship-batches");
export const batchesPath = "/__wireframes__/fixtures/batches-A/files/index.html";
export const labPath = "/__wireframes__/fixtures/batches-A/files/widget-lab.html";
const source = "examples/ship-batches";

export async function resolveBatch(name: string): Promise<RegisteredFixture | undefined> {
	const fixture = fixtureFor(name) ?? (await widgetFixture(name));
	if (!fixture) return undefined;
	// Photos resolve relative to the study folder, as for a fixture file stored there.
	const path = join(batchesDir, "fixture.json");
	await validateFixture(fixture, path);
	return { name, path, fixture };
}

export async function buildBatches() {
	await mkdir(batchesDir, { recursive: true });
	const build = await Bun.build({
		entrypoints: [`${source}/gallery.ts`, `${source}/widget-lab.ts`],
		outdir: batchesDir,
		target: "browser",
	});
	if (!build.success) throw new Error(build.logs.join("\n"));
	await Promise.all(
		["index.html", "gallery.css", "widget-lab.html", "widget-lab.css"].map((file) =>
			cp(`${source}/${file}`, `${batchesDir}/${file}`),
		),
	);
	await cp(`${source}/art`, `${batchesDir}/art`, { recursive: true });
	await writeWidgets();
}

/** Writes each widget as the bot would send it, with its size as Telegram counts it. */
export async function writeWidgets() {
	await mkdir(`${batchesDir}/widgets`, { recursive: true });
	const sizes: Record<string, ReturnType<typeof widgetSize>> = {};
	for (const layout of layouts) {
		const html = await widgetHtml(layout);
		sizes[layout] = widgetSize(html);
		await writeFile(`${batchesDir}/widgets/${layout}.html`, html);
	}
	await writeFile(`${batchesDir}/widgets/sizes.json`, JSON.stringify(sizes));
}

/** The states the gallery shows, plus each variant's start. */
export async function galleryFixtures() {
	const names = [
		...variants.flatMap((variant) => [`batches-${variant.id}`, ...variant.shots.map((shot) => shot.alias)]),
		...shared.map((shot) => shot.alias),
		...layouts.flatMap((layout) => [`widget-${layout}`, `widget-${layout}-production`]),
	];
	const fixtures = new Map<string, RegisteredFixture>();
	for (const name of names) {
		if (!aliases[name] && !name.startsWith("widget-")) throw new Error(`Gallery shot ${name} has no alias`);
		const entry = await resolveBatch(name);
		if (entry) fixtures.set(name, entry);
	}
	return fixtures;
}

if (import.meta.main) {
	const command = process.argv[2] || "serve";
	// The widget lab needs no Telegram Web A, so it skips rebuilding it.
	if (command !== "lab") await setup();
	await buildBatches();
	const fixtures = await galleryFixtures();
	if (command === "build") console.log(`Built the ship batch study with ${fixtures.size} gallery states.`);
	else {
		const server = startServer({
			dist: paths.dist,
			fixtures: new Map(),
			resolveFixture: resolveBatch,
			port: command === "render" ? 0 : Number(process.env.PORT || 4245),
		});
		if (command === "serve" || command === "lab")
			console.log(
				`Mixed ship batches\n${server.url.origin}${batchesPath}\nWidget lab\n${server.url.origin}${labPath}`,
			);
		else if (command === "render") {
			try {
				const entries = [...fixtures];
				const batches = Array.from(
					{ length: 3 },
					(_, index) => new Map(entries.filter((_, i) => i % 3 === index)),
				);
				const results = await Promise.allSettled(
					batches.map((batch) =>
						render(batch, {
							origin: server.url.origin,
							outDir: `${batchesDir}/screenshots`,
							themes: ["dark", "light"],
							width: 420,
							height: 900,
							scale: 1,
							keyboard: false,
							debug: false,
							timeoutMs: 45000,
						}),
					),
				);
				const failures = results.filter((result) => result.status === "rejected");
				if (failures.length)
					throw new AggregateError(
						failures.map((result) => result.reason),
						"Ship batch render failed",
					);
				console.log(`Rendered ${fixtures.size} states in both themes.`);
			} finally {
				server.stop(true);
			}
		} else {
			server.stop(true);
			throw new Error(`Unknown command: ${command}`);
		}
	}
}
