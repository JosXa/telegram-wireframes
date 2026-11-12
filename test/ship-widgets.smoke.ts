/** Orders ships in every Shipyard widget of the widget lab, lets the batches finish and saves screenshots. */
import { mkdir } from "node:fs/promises";
import { chromium, type FrameLocator, type Page } from "playwright";
import { startServer } from "../src/server";
import { batchesDir, buildBatches, labPath, resolveBatch } from "../src/ship-batches";
import { paths } from "../src/upstream";

await buildBatches();
const server = startServer({ dist: paths.dist, fixtures: new Map(), resolveFixture: resolveBatch });
const browser = await chromium.launch({
	executablePath: process.env.TELEGRAM_WIREFRAMES_CHROMIUM || undefined,
});
const shots = `${batchesDir}/widget-shots`;
await mkdir(shots, { recursive: true });

type Layout = "rows" | "tabs" | "timeline" | "mixes";

class Phone {
	readonly frame: FrameLocator;
	constructor(
		readonly page: Page,
		readonly layout: Layout,
	) {
		this.frame = page.frameLocator(`[data-layout="${layout}"] iframe`);
	}

	async tap(selector: string) {
		await this.frame.locator(selector).first().click();
	}

	async sees(selector: string, text: string | RegExp) {
		await this.frame.locator(selector).filter({ hasText: text }).first().waitFor({ timeout: 10_000 });
	}

	/** Drags a slider from its left end to a share of its width, as a finger would. */
	async drag(selector: string, share: number) {
		const box = await this.frame.locator(selector).boundingBox();
		if (!box) throw new Error(`${this.layout}: ${selector} is not visible`);
		const y = box.y + box.height / 2;
		await this.page.mouse.move(box.x + 2, y);
		await this.page.mouse.down();
		await this.page.mouse.move(box.x + box.width * share, y, { steps: 8 });
		await this.page.mouse.up();
	}

	async build(label: RegExp) {
		await this.sees("#go", label);
		await this.tap("#go");
		await this.sees(".hd", "🚀 Ship batch");
		await this.page
			.locator(`[data-layout="${this.layout}"] .caption`)
			.filter({ hasText: "in production" })
			.waitFor({ timeout: 10_000 });
	}

	async shoot(name: string, theme: string) {
		await this.page.waitForTimeout(300);
		await this.page
			.locator(`[data-layout="${this.layout}"] .screen`)
			.screenshot({ path: `${shots}/${this.layout}-${name}-${theme}.png` });
	}
}

const journeys: Record<Layout, (phone: Phone, theme: string) => Promise<void>> = {
	rows: async (phone, theme) => {
		for (let i = 0; i < 3; i++) await phone.tap("#p0");
		await phone.sees("#n0", "3");
		await phone.drag("#sl1", 0.3);
		await phone.sees("#go", /^Build \d+ ships$/);
		const raiding = Number(await phone.frame.locator("#n1").textContent());
		if (!(raiding > 0)) throw new Error(`rows: the slider set ${raiding} raiding ships`);
		await phone.shoot("compose", theme);
		await phone.build(/^Build \d+ ships$/);
		await phone.tap("#go");
		await phone.sees(".hd", "➕ Add to the ship batch");
		await phone.tap("#p2");
		await phone.build(/^Add 1 ship$/);
		await phone.sees("#pl", "Strike ship");
		await phone.shoot("production", theme);
	},
	tabs: async (phone, theme) => {
		await phone.tap('.tab[data-i="3"]');
		await phone.sees("#card", "Line ship");
		await phone.tap('[data-d="1"]');
		await phone.tap('[data-d="1"]');
		await phone.sees("#cn", "2");
		await phone.tap('.tab[data-i="4"]');
		await phone.sees("#card", "level 8");
		await phone.tap('.tab[data-i="0"]');
		await phone.tap('[data-d="10"]');
		await phone.sees("#c0", "10");
		await phone.shoot("compose", theme);
		await phone.build(/^Build 12 ships$/);
	},
	timeline: async (phone, theme) => {
		await phone.tap('.add [data-i="3"]');
		await phone.tap('.add [data-i="0"]');
		await phone.drag("#sl", 0.25);
		await phone.tap('[data-m="-1"]');
		await phone.sees("#ls > :first-child", "Starter ship");
		await phone.shoot("compose", theme);
		await phone.build(/^Build \d+ ships$/);
	},
	mixes: async (phone, theme) => {
		await phone.sees("#go", "Choose a mix");
		await phone.tap('.mx[data-i="1"]');
		await phone.tap('[data-t="3"]');
		await phone.sees("#pv", "Raiding ship × 6 · Starter ship × 12");
		await phone.shoot("compose", theme);
		await phone.build(/^Build 18 ships$/);
	},
};

try {
	for (const theme of ["light", "dark"]) {
		const page = await browser.newPage({ viewport: { width: 1600, height: 1200 } });
		const errors: string[] = [];
		page.on("pageerror", (error) => errors.push(error.message));
		page.on("console", (message) => {
			if (message.type() === "error") errors.push(message.text());
		});
		await page.goto(`${server.url.origin}${labPath}`);
		await page.locator("#theme").selectOption(theme);
		for (const layout of Object.keys(journeys) as Layout[]) {
			const phone = new Phone(page, layout);
			await phone.sees("#go", /./);
			try {
				await journeys[layout](phone, theme);
			} catch (error) {
				await page.screenshot({ path: `/tmp/opencode/ship-widgets-${layout}-failure.png` });
				throw new Error(`${layout} (${theme}): ${error instanceof Error ? error.message : error}`);
			}
		}
		// Moves the lab clock until every batch is stationed and its notification arrived.
		for (let step = 0; step < 12; step++) await page.locator('[data-minutes="20"]').click();
		for (const layout of Object.keys(journeys) as Layout[]) {
			await page
				.locator(`[data-layout="${layout}"] .msg.text`)
				.filter({ hasText: "finished" })
				.waitFor({ timeout: 10_000 });
			await new Phone(page, layout).shoot("finished", theme);
		}
		if (errors.length) throw new Error(`Widget lab errors (${theme}):\n${errors.join("\n")}`);
		await page.close();
	}
	console.log("All four Shipyard widgets order, add, finish and notify in both themes.");
} finally {
	await browser.close();
	server.stop(true);
}
