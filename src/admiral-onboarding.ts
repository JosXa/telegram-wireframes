import { cp, mkdir } from "node:fs/promises";
import { resolve } from "node:path";
import { chromium } from "playwright";
import { admirals, beats, makeFixture, styles } from "../examples/admiral-onboarding/journey";
import { render } from "./render";
import { registerFixtures, startServer } from "./server";
import { paths, setup } from "./upstream";

export const onboardingDir = resolve("wireframes/admiral-onboarding");
export const onboardingPath = "/__wireframes__/fixtures/01-calder-welcome/files/review.html";
const source = "examples/admiral-onboarding";
const panels = {
	foundation: ["welcome", "construction", "hangar", "planning"],
	consequences: ["dispatch", "victory", "incoming", "loss"],
};

async function cropArt() {
	await mkdir(`${onboardingDir}/art`, { recursive: true });
	const browser = await chromium.launch({
		executablePath: process.env.TELEGRAM_WIREFRAMES_CHROMIUM || undefined,
	});
	try {
		const page = await browser.newPage();
		for (const style of styles)
			for (const admiral of admirals)
				for (const [sheet, names] of Object.entries(panels)) {
					const file = `${source}/permutations/${style.id}-${admiral.id}-${sheet}.png`;
					const data = Buffer.from(await Bun.file(file).arrayBuffer()).toString("base64");
					const images = await page.evaluate(
						async ({ data }) => {
							const image = new Image();
							image.src = `data:image/png;base64,${data}`;
							await image.decode();
							const width = image.naturalWidth / 2,
								height = image.naturalHeight / 2;
							return Array.from({ length: 4 }, (_, index) => {
								const canvas = document.createElement("canvas");
								canvas.width = width;
								canvas.height = height;
								const context = canvas.getContext("2d");
								if (!context) throw new Error("Canvas unavailable");
								context.drawImage(
									image,
									(index % 2) * width,
									Math.floor(index / 2) * height,
									width,
									height,
									0,
									0,
									width,
									height,
								);
								return canvas.toDataURL("image/jpeg", 0.92).split(",")[1];
							});
						},
						{ data },
					);
					await Promise.all(
						images.map((image, index) =>
							Bun.write(
								`${onboardingDir}/art/${style.id}-${admiral.id}-${names[index]}.jpg`,
								Buffer.from(image, "base64"),
							),
						),
					);
				}
	} finally {
		await browser.close();
	}
}

export async function buildOnboarding() {
	await mkdir(onboardingDir, { recursive: true });
	const build = await Bun.build({
		entrypoints: [`${source}/review.ts`, `${source}/fleet.ts`],
		outdir: onboardingDir,
		target: "browser",
	});
	if (!build.success) throw new Error(build.logs.join("\n"));
	await Promise.all(
		["review.html", "review.css", "fleet.html", "fleet.css"].map((file) =>
			cp(`${source}/${file}`, `${onboardingDir}/${file}`),
		),
	);
	await cp("examples/empire-views/app.css", `${onboardingDir}/app.css`);
	await cropArt();
	const files: string[] = [];
	for (const beat of beats)
		for (const mode of ["art", "voice", "plain"] as const) {
			for (const admiral of mode === "plain" ? admirals.slice(0, 1) : admirals)
				for (const style of mode === "art" ? styles : styles.slice(0, 1)) {
					const name =
						mode === "plain"
							? `plain-${beat.id}`
							: mode === "voice"
								? `voice-${admiral.id}-${beat.id}`
								: `${style.id}-${admiral.id}-${beat.id}`;
					const fixture = makeFixture(style.id, admiral.id, beat, mode);
					if (beat.id === "review")
						fixture.mini_app = { button_text: beat.action, ready_selector: "[data-ready='true']" };
					const path = `${onboardingDir}/${name}.json`;
					await Bun.write(path, `${JSON.stringify(fixture, null, 2)}\n`);
					files.push(path);
				}
		}
	return registerFixtures(files);
}

if (import.meta.main) {
	const command = process.argv[2] || "serve";
	await setup();
	const fixtures = await buildOnboarding();
	if (command === "build") console.log(`Built ${fixtures.size} onboarding fixtures.`);
	else {
		const server = startServer({
			dist: paths.dist,
			fixtures,
			port: command === "serve" ? Number(process.env.PORT || 4244) : 0,
		});
		if (command === "serve") console.log(`Admirals in action\n${server.url.origin}${onboardingPath}`);
		else if (command === "render") {
			try {
				// Each worker owns a browser and disjoint filenames; fixture output remains deterministic.
				const entries = [...fixtures];
				const batches = Array.from(
					{ length: 3 },
					(_, index) => new Map(entries.filter((_, i) => i % 3 === index)),
				);
				const results = await Promise.allSettled(
					batches.map(async (batch, index) => {
						const files = await render(batch, {
							origin: server.url.origin,
							outDir: `${onboardingDir}/screenshots`,
							themes: ["dark", "light"],
							width: 420,
							height: 900,
							scale: 1,
							keyboard: false,
							debug: false,
							timeoutMs: 45000,
						});
						console.log(`Render worker ${index + 1}: ${files.length} images`);
						return files;
					}),
				);
				const failures = results.filter((result) => result.status === "rejected");
				if (failures.length)
					throw new AggregateError(
						failures.map((result) => result.reason),
						"Onboarding render failed",
					);
				console.log(`All ${fixtures.size} states rendered in both themes.`);
			} finally {
				server.stop(true);
			}
		} else {
			server.stop(true);
			throw new Error(`Unknown command: ${command}`);
		}
	}
}
