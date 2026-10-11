// Check anchoring against actual browser geometry at different zoom levels and on touch screens.
import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import { join } from "node:path";
import { chromium } from "playwright";
import { buildStudy, studyPath } from "../src/empire-views";
import type { ReviewComment } from "../src/review";
import { startServer } from "../src/server";
import { paths } from "../src/upstream";

const root = await mkdtemp("/tmp/opencode/wireframe-review-browser-");
const fixtures = await buildStudy();
const server = startServer({ fixtures, dist: paths.dist, reviewDatabase: join(root, "reviews.sqlite") });
const browser = await chromium.launch();
try {
	const context = await browser.newContext({ viewport: { width: 1440, height: 1100 } });
	const page = await context.newPage();
	const errors: string[] = [];
	page.on("pageerror", (error) => errors.push(error.message));
	const url = `${server.url.origin}${studyPath}#battle-report`;
	await page.goto(url);
	await page.waitForFunction(
		() =>
			!document.querySelector<HTMLButtonElement>("#comment-mode")?.disabled &&
			document.querySelector<HTMLImageElement>("#screenshot")?.complete,
	);
	await page.locator("#comment-mode").click();
	const image = await page.locator("#screenshot").boundingBox();
	assert.ok(image);
	await page.mouse.move(image.x + image.width * 0.2, image.y + image.height * 0.3);
	await page.mouse.down();
	await page.mouse.move(image.x + image.width * 0.6, image.y + image.height * 0.4, { steps: 10 });
	await page.mouse.up();
	assert.equal(await page.locator("#review-x").inputValue(), "84");
	assert.equal(await page.locator("#review-y").inputValue(), "270");
	assert.equal(await page.locator("#review-width").inputValue(), "168");
	assert.equal(await page.locator("#review-height").inputValue(), "90");
	await page.locator("#review-text").fill("Explain the cargo cap here.");
	await page.locator("#review-copy summary").click();
	await page.locator("#review-copy-text").evaluate((node) => {
		const range = document.createRange();
		range.selectNodeContents(node);
		const selection = getSelection();
		selection?.removeAllRanges();
		selection?.addRange(range);
		document.dispatchEvent(new Event("selectionchange"));
	});
	await page.locator("#review-use-quote").click();
	assert.match(await page.locator("#review-quote").inputValue(), /Victory at Ash/);
	await page.locator("#review-replacement").fill("Loot is limited by surviving cargo space.");
	await page.reload();
	await page.getByText("Your unsaved draft has been restored.", { exact: true }).waitFor();
	assert.equal(await page.locator("#review-text").inputValue(), "Explain the cargo cap here.");
	await page.locator("#review-save").click();
	await page.getByText("Comment #1 saved on this server.", { exact: true }).waitFor();
	let saved = (await (
		await fetch(`${server.url.origin}/__wireframes__/review/comments`)
	).json()) as ReviewComment[];
	assert.equal(saved.length, 1);
	assert.equal(saved[0].x, 84);
	assert.equal(saved[0].width, 168);
	await page.locator("#review-zoom").selectOption("2");
	const zoomed = await page.locator("#screenshot").boundingBox();
	assert.ok(zoomed);
	assert.equal(zoomed.width, 840);
	const pin = await page.locator(".review-pin").boundingBox();
	assert.ok(pin);
	assert.ok(
		Math.abs(pin.x + pin.width / 2 - zoomed.x - 168) < 1,
		"Pin must stay on the same original pixel after zoom",
	);
	await page.locator("#review-zoom").selectOption("fit");
	await page.locator("#comment-mode").click();
	await page.locator("#review-overlay").press("ArrowRight");
	await page.locator("#review-overlay").press("Enter");
	assert.equal(await page.locator("#review-x").inputValue(), "211");
	await page.locator("#review-text").fill("Keyboard point");
	await page.locator("#review-save").click();
	await page.getByText("Comment #2 saved on this server.", { exact: true }).waitFor();
	await page.locator('[data-theme="light"]').click();
	await page.getByText("No open comments for this screen and theme.", { exact: true }).waitFor();
	assert.equal(await page.locator(".review-pin").count(), 0);
	await page.locator("#review-filter").selectOption("all");
	await page.locator("#review-comment-1 > button").click();
	await page.locator('.review-pin[aria-pressed="true"]').waitFor();
	assert.equal(await page.locator('[data-theme="dark"]').getAttribute("aria-pressed"), "true");
	await page.locator("#review-comment-1").getByRole("button", { name: "Edit", exact: true }).click();
	await page.locator("#review-text").fill("Edited cargo feedback");
	await page.locator("#review-save").click();
	await page.getByText("Comment #1 saved on this server.", { exact: true }).waitFor();
	await page.locator("#review-comment-1").getByRole("button", { name: "Resolve", exact: true }).click();
	await page.getByText("Comment resolved. Use Include resolved to see it.", { exact: true }).waitFor();
	await page.locator("#review-resolved").check();
	await page.locator("#review-comment-1").getByRole("button", { name: "Reopen", exact: true }).click();
	await page.getByText("Comment reopened.", { exact: true }).waitFor();
	const download = page.waitForEvent("download");
	await page.locator("#review-export").click();
	const file = await download;
	assert.equal(file.suggestedFilename(), "space-emperors-feedback.md");
	const exportPath = await file.path();
	assert.ok(exportPath);
	const exported = await Bun.file(exportPath).text();
	assert.match(exported, /Edited cargo feedback/);
	assert.match(exported, /x=84, y=270, width=168, height=90/);
	assert.match(exported, /Victory at Ash/);
	await page.screenshot({ path: "wireframes/empire-views/review-desktop.png", fullPage: true });
	const phone = await browser.newContext({
		viewport: { width: 420, height: 900 },
		hasTouch: true,
		isMobile: true,
	});
	const mobile = await phone.newPage();
	await mobile.goto(url);
	await mobile.locator(".review-pin").first().waitFor();
	await mobile.locator("#comment-mode").tap();
	await mobile.locator("#review-overlay").tap({ position: { x: 80, y: 120 } });
	await mobile.locator("#review-text").fill("Touch feedback");
	await mobile.locator("#review-save").tap();
	await mobile.getByText("Comment #3 saved on this server.", { exact: true }).waitFor();
	assert.equal(await mobile.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
	await mobile.screenshot({ path: "wireframes/empire-views/review-phone.png", fullPage: true });
	await phone.close();
	await context.close();
	const fresh = await browser.newPage();
	await fresh.goto(`${server.url.origin}${studyPath}?theme=dark&comment=1#battle-report`);
	await fresh.locator('.review-pin[aria-pressed="true"]').waitFor();
	assert.match(await fresh.locator("#review-comment-1").innerText(), /Edited cargo feedback/);
	saved = (await (
		await fetch(`${server.url.origin}/__wireframes__/review/comments`)
	).json()) as ReviewComment[];
	assert.equal(saved.length, 3);
	assert.deepEqual(errors, []);
	console.log(
		"Review passed: exact regions, zoom anchoring, keyboard and touch pins, copy selection, drafts, server persistence, edits, resolution, deep links and export.",
	);
} finally {
	await browser.close();
	server.stop(true);
	await rm(root, { recursive: true, force: true });
}
