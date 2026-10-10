// Build the game-specific study using the existing fixture server and Telegram renderer.
import { cp, mkdir } from "node:fs/promises";
import { resolve } from "node:path";
import { chromium } from "playwright";
import { scenes } from "../examples/empire-views/catalogue";
import { render } from "./render";
import { registerFixtures, startServer } from "./server";
import { paths, setup } from "./upstream";

export const studyDir = resolve("wireframes/empire-views");
export const studyPath = "/__wireframes__/fixtures/command-center/files/index.html";

async function systemImage() {
	const browser = await chromium.launch({
		executablePath: process.env.TELEGRAM_WIREFRAMES_CHROMIUM || undefined,
	});
	try {
		const page = await browser.newPage({ viewport: { width: 800, height: 500 }, deviceScaleFactor: 1 });
		const locations = [
			[170, 115],
			[340, 85],
			[510, 115],
			[640, 220],
			[555, 365],
			[375, 395],
			[190, 365],
			[75, 240],
		];
		const planets = locations
			.map(([x, y], index) => {
				const hex = Array.from(
					{ length: 6 },
					(_, j) => `${x + Math.cos((j * Math.PI) / 3) * 62},${y + Math.sin((j * Math.PI) / 3) * 62}`,
				).join(" ");
				const own = index === 5;
				const abandoned = index === 7;
				return `<g><polygon points="${hex}" fill="#18222e" stroke="${own ? "#8ed4c8" : "#344451"}"/><circle cx="${x}" cy="${y - 7}" r="${own ? 20 : 13}" fill="${own ? "#77ad9e" : abandoned ? "#b79975" : "#647b88"}"/><text x="${x}" y="${y + 29}" text-anchor="middle" fill="#e1e8ec" font-size="14">${own ? "Nacre · 214:6" : abandoned ? "Ash · 214:8" : `214:${index + 1}`}</text>${own ? `<text x="${x}" y="${y + 48}" text-anchor="middle" fill="#8ed4c8" font-size="11">YOUR COLONY</text>` : ""}</g>`;
			})
			.join("");
		await page.setContent(
			`<html><body style="margin:0"><svg xmlns="http://www.w3.org/2000/svg" width="800" height="500" style="font-family:system-ui"><rect width="800" height="500" fill="#111923"/><text x="24" y="30" fill="#b3c1cb" font-size="13">SOLARA / SYSTEM 214</text><circle cx="375" cy="230" r="32" fill="#e7c181"/><text x="375" y="289" fill="#e7c181" font-size="14" text-anchor="middle">Solara</text>${planets}<path d="M760 410 436 395" stroke="#eac079" stroke-dasharray="5 6"/><text x="590" y="445" fill="#eac079" font-size="13">Incoming fleet · 20:40</text></svg></body></html>`,
		);
		await page.screenshot({ path: `${studyDir}/system.png` });
	} finally {
		await browser.close();
	}
}

export async function buildStudy() {
	await mkdir(studyDir, { recursive: true });
	const result = await Bun.build({
		entrypoints: ["examples/empire-views/app.ts", "examples/empire-views/gallery.ts"],
		outdir: studyDir,
		target: "browser",
	});
	if (!result.success) throw new Error(result.logs.join("\n"));
	await Promise.all(
		["app.html", "app.css", "index.html", "gallery.css"].map((file) =>
			cp(`examples/empire-views/${file}`, `${studyDir}/${file}`),
		),
	);
	await Bun.write(
		`${studyDir}/verification.json`,
		JSON.stringify({
			movement: "mira-outbound-1",
			mission: "Reinforce",
			ships: { "Scout Fighter": 12 },
			verifiedAt: "18:12",
		}),
	);
	await systemImage();
	const files = await Promise.all(
		scenes.map(async (scene) => {
			const path = `${studyDir}/${scene.id}.json`;
			await Bun.write(path, `${JSON.stringify(scene.fixture, null, 2)}\n`);
			return path;
		}),
	);
	return registerFixtures([...files, "examples/galaxy/fixture.json"]);
}

if (import.meta.main) {
	const command = process.argv[2] || "serve";
	await setup();
	const fixtures = await buildStudy();
	if (command === "build") {
		console.log(`Built ${scenes.length} states in ${studyDir}`);
	} else {
		const server = startServer({
			dist: paths.dist,
			fixtures,
			port: command === "serve" ? Number(process.env.PORT || 4243) : 0,
		});
		if (command === "serve")
			console.log(`Space Emperors · ${scenes.length} states\n${server.url.origin}${studyPath}`);
		else if (command === "render") {
			try {
				const selected = new Map([...fixtures].filter(([name]) => name !== "galaxy"));
				const files = await render(selected, {
					origin: server.url.origin,
					outDir: `${studyDir}/screenshots`,
					themes: ["dark", "light"],
					width: 420,
					height: 900,
					scale: 1,
					keyboard: false,
					debug: false,
					timeoutMs: 30000,
				});
				console.log(`Rendered ${files.length} images to ${studyDir}/screenshots`);
			} finally {
				server.stop(true);
			}
		} else {
			server.stop(true);
			throw new Error(`Unknown study command: ${command}`);
		}
	}
}
