// Opens each fixture in headless Chromium and saves a screenshot per theme.
import { mkdir } from "node:fs/promises";
import { join, resolve } from "node:path";
import { type Browser, chromium, type Page } from "playwright";

import { chatUrl, type RegisteredFixture } from "./server";

export type Theme = "dark" | "light";

export type RenderOptions = {
	origin: string;
	outDir: string;
	themes: Theme[];
	width: number;
	height: number;
	scale: number;
	keyboard: boolean;
	debug: boolean;
	timeoutMs: number;
};

const SETTLE_MS = 800;

function launch() {
	return chromium.launch({
		executablePath: process.env.TELEGRAM_WIREFRAMES_CHROMIUM || undefined,
	});
}

function collectLogs(page: Page, debug: boolean) {
	const logs: string[] = [];
	const keep = (source: string) => (message: { type(): string; text(): string }) => {
		const text = message.text();
		if (debug || message.type() === "error" || text.includes("[wireframes]")) {
			logs.push(`${source} ${message.type()}: ${text}`);
		}
	};
	page.on("console", keep("page"));
	page.on("pageerror", (error) => logs.push(`page exception: ${error.message}`));
	page.on("worker", (worker) => worker.on("console", keep("worker")));
	return logs;
}

async function waitForChat(page: Page, entry: RegisteredFixture, timeoutMs: number) {
	const messages = entry.fixture.messages.length;
	const photos = entry.fixture.messages.filter((message) => message.photo).length;

	await page.waitForFunction(
		({ messages, photos }) => {
			const rendered = document.querySelectorAll(".Message").length;
			const loaded = [...document.querySelectorAll<HTMLImageElement>(".Message img.full-media")].filter(
				(image) => image.complete && image.naturalWidth > 0,
			).length;
			return rendered >= messages && loaded >= photos;
		},
		{ messages, photos },
		{ timeout: timeoutMs, polling: 250 },
	);
	await page.waitForTimeout(SETTLE_MS);
}

async function renderOne(browser: Browser, entry: RegisteredFixture, theme: Theme, options: RenderOptions) {
	const context = await browser.newContext({
		viewport: { width: options.width, height: options.height },
		deviceScaleFactor: options.scale,
		colorScheme: theme,
	});
	const page = await context.newPage();
	const logs = collectLogs(page, options.debug);
	const files: string[] = [];

	try {
		await page.goto(chatUrl(options.origin, entry.name));
		await waitForChat(page, entry, options.timeoutMs);

		const file = join(options.outDir, `${entry.name}-${theme}.png`);
		await page.screenshot({ path: file });
		files.push(file);

		const hasReplyKeyboard = entry.fixture.messages.some(
			(message) => message.reply_markup && "keyboard" in message.reply_markup,
		);
		if (options.keyboard && hasReplyKeyboard) {
			await page.locator('[aria-label="Show bot keyboard"]').first().click();
			await page.waitForTimeout(SETTLE_MS);
			const keyboardFile = join(options.outDir, `${entry.name}-${theme}-keyboard.png`);
			await page.screenshot({ path: keyboardFile });
			files.push(keyboardFile);
		}
	} catch (error) {
		const details = logs.length ? `\n${logs.join("\n")}` : "";
		throw new Error(`${entry.name} (${theme}): ${(error as Error).message}${details}`);
	} finally {
		if (options.debug && logs.length) console.log(logs.join("\n"));
		await context.close();
	}

	return files;
}

export async function render(fixtures: Map<string, RegisteredFixture>, options: RenderOptions) {
	const outDir = resolve(options.outDir);
	await mkdir(outDir, { recursive: true });
	const browser = await launch();
	const files: string[] = [];

	try {
		for (const entry of fixtures.values()) {
			for (const theme of options.themes) {
				files.push(...(await renderOne(browser, entry, theme, { ...options, outDir })));
			}
		}
	} finally {
		await browser.close();
	}

	return files;
}
