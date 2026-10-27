import assert from "node:assert/strict";
import { chromium, type Page } from "playwright";
import { variantIds } from "../examples/ship-batches/model";
import { chatUrl, startServer } from "../src/server";
import { batchesPath, buildBatches, resolveBatch } from "../src/ship-batches";
import { paths } from "../src/upstream";

await buildBatches();
const server = startServer({
	dist: paths.dist,
	fixtures: new Map(),
	resolveFixture: resolveBatch,
});
const browser = await chromium.launch({
	executablePath: process.env.TELEGRAM_WIREFRAMES_CHROMIUM || undefined,
});

/** Drives one variant's chat the way a player would: buttons, typed replies and toasts. */
class Chat {
	constructor(readonly page: Page) {}

	async press(name: string) {
		// Web A edits the text and the keyboard separately; a tap between them hits the old keyboard.
		await this.page.waitForTimeout(400);
		await this.page.getByRole("button", { name, exact: true }).last().click();
	}

	/** Waits for a button, so the next tap lands on the current screen. */
	async sees(name: string) {
		await this.page.getByRole("button", { name, exact: true }).last().waitFor({ timeout: 10_000 });
	}

	async say(text: string) {
		const input = this.page.getByRole("textbox", { name: "Message", exact: true });
		await input.fill(text);
		await input.press("Enter");
	}

	/** The newest bot message settles on this text. */
	async shows(pattern: RegExp) {
		await this.page.locator(".Message").last().filter({ hasText: pattern }).waitFor({ timeout: 10_000 });
	}

	async toast(text: string) {
		await this.page.locator(".Notification-container").filter({ hasText: text }).waitFor({ timeout: 10_000 });
	}
}

const journeys: Record<(typeof variantIds)[number], (chat: Chat) => Promise<void>> = {
	A: async (chat) => {
		await chat.press("🚀 New ship batch");
		await chat.shows(/New ship batch/);
		await chat.press("➕ Starter ship");
		await chat.shows(/Starter ship × 1 /);
		await chat.press("±10");
		await chat.sees("• ±10");
		await chat.press("➕ Starter ship");
		await chat.shows(/Starter ship × 11 /);
		await chat.press("🔒 Heavy line ship");
		await chat.toast("Needs the Orbital Shipyard at level 8 first.");
		await chat.press("🚀 Build 11 ships · 💠 440 · 🔥 110");
		await chat.shows(/Ship batch · 0 of 11 ready/);
		await chat.press("🔄 Refresh");
		await chat.shows(/Ship batch · 6 of 11 ready/);
		await chat.press("🔄 Refresh");
		await chat.shows(/Ship batch finished/);
		// The finished batch replaces the screen with the Shipyard and its notification.
		await chat.page.waitForFunction(() => document.querySelectorAll(".Message").length === 2, null, {
			timeout: 10_000,
		});
	},
	B: async (chat) => {
		await chat.press("🚀 New ship batch");
		await chat.press("Raiding ship");
		await chat.shows(/Attack 6 · Hull 80/);
		await chat.press("+10");
		await chat.shows(/Raiding ship × 10 /);
		await chat.press("✏️ Type amount");
		await chat.shows(/How many Raiding ships\?/);
		await chat.say("999");
		await chat.shows(/Mirsol's stock covers 70 Raiding ships, so the batch holds 70\./);
		await chat.shows(/Raiding ship × 70 /);
	},
	C: async (chat) => {
		await chat.press("🚀 New ship batch");
		await chat.press("Line ship");
		await chat.shows(/Cargo capacity\s+120/);
		await chat.press("+1");
		await chat.shows(/In this batch: 1 /);
		await chat.press("⬅️ New ship batch");
		await chat.shows(/Line ship × 1 /);
	},
	D: async (chat) => {
		await chat.press("✏️ Write a ship order");
		await chat.shows(/Reply with an amount for each ship type/);
		await chat.say("12 starter, 4 raid, 2 line");
		await chat.shows(/Starter ship × 12 /);
		await chat.sees("🚀 Build 18 ships · 💠 2 160 · 🔥 680");
		await chat.say("1 heavy");
		await chat.shows(/Heavy line ships need the Orbital Shipyard at level 8 first\./);
	},
	E: async (chat) => {
		await chat.shows(/Raid wing: Raiding ship × 2/);
		await chat.press("📋 Raid wing");
		await chat.shows(/Raid wing × 1/);
		await chat.press("×3");
		await chat.sees("• ×3");
		await chat.shows(/Raiding ship × 6 /);
		await chat.press("✏️ Edit lines");
		await chat.press("💾 Save as composition");
		await chat.say("Strike pack");
		await chat.shows(/Saved as “Strike pack”\./);
	},
	F: async (chat) => {
		await chat.press("🚀 New ship batch");
		await chat.page.locator(".Message img.full-media").first().waitFor({ timeout: 10_000 });
		await chat.press("Line ship");
		await chat.shows(/Attack 100 · Hull 640/);
		await chat.press("+1");
		await chat.shows(/Line ship × 1 /);
	},
	G: async (chat) => {
		await chat.press("🚀 New ship batch");
		await chat.press("Strike ship");
		await chat.shows(/How many Strike ships\?/);
		await chat.say("seven");
		await chat.shows(/Reply with a whole number, such as 12\./);
		await chat.say("6");
		await chat.shows(/Strike ship × 6 /);
	},
};

try {
	for (const id of variantIds) {
		const context = await browser.newContext({ viewport: { width: 420, height: 900 }, colorScheme: "dark" });
		const page = await context.newPage();
		await page.goto(chatUrl(server.url.origin, `batches-${id}`));
		await page.locator(".Message").first().waitFor();
		try {
			await journeys[id](new Chat(page));
		} catch (error) {
			await page.screenshot({ path: `/tmp/opencode/ship-batches-${id}-failure.png` });
			throw new Error(`Variant ${id}: ${error instanceof Error ? error.message : error}`);
		}
		await context.close();
	}
	const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
	await page.goto(`${server.url.origin}${batchesPath}`);
	// One card per variant, plus the screens every variant shares.
	assert.equal(await page.locator(".variant").count(), variantIds.length + 1);
	console.log(`Ship batch mockups work in ${variantIds.length} variants.`);
} finally {
	await browser.close();
	server.stop(true);
}
