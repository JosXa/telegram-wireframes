// Exercise selection against real Telegram DOM, including its nested Mini App iframe.
import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import { join } from "node:path";
import { chromium, type Page } from "playwright";
import { buildStudy, studyPath } from "../src/empire-views";
import type { ReviewComment } from "../src/review";
import { startServer } from "../src/server";
import { paths } from "../src/upstream";

const root = await mkdtemp("/tmp/opencode/wireframe-review-browser-");
const fixtures = await buildStudy();
let server = startServer({ fixtures, dist: paths.dist, reviewDatabase: join(root, "reviews.sqlite") });
const browser = await chromium.launch();
const url = `${server.url.origin}${studyPath}`;
const comments = async () =>
	(await (await fetch(`${server.url.origin}/__wireframes__/review/comments`)).json()) as ReviewComment[];
const ready = async (page: Page) => {
	try {
		await page.waitForFunction(() => !document.querySelector<HTMLButtonElement>("#comment-mode")?.disabled);
	} catch (cause) {
		throw new Error(`${page.url()}: ${await page.locator("#review-status").innerText()}`, { cause });
	}
};
try {
	// Let iframe color-scheme inheritance work instead of forcing a browser-wide media override.
	const context = await browser.newContext({ viewport: { width: 1440, height: 1200 }, colorScheme: null });
	context.setDefaultTimeout(30000);
	const page = await context.newPage();
	const errors: string[] = [];
	page.on("pageerror", (error) => errors.push(error.message));
	await page.goto(`${url}#battle-report`);
	await ready(page);
	const chat = page.frameLocator("#review-frame");
	const heading = chat.locator(".Message strong").filter({ hasText: /^Victory at Ash$/ });
	await heading.waitFor();
	assert.equal(await page.locator("#screenshot").isVisible(), false);
	assert.match((await chat.locator("html").getAttribute("class")) || "", /theme-dark/);
	await page.locator("#comment-mode").click();
	await heading.hover();
	await page.locator("#review-highlight").waitFor();
	const selectedBox = await heading.boundingBox();
	const highlight = await page.locator("#review-highlight").boundingBox();
	assert.ok(selectedBox && highlight);
	assert.ok(Math.abs(highlight.x - selectedBox.x) <= 1 && Math.abs(highlight.width - selectedBox.width) <= 1);
	await heading.click();
	assert.equal(await page.locator("#review-quote").inputValue(), "Victory at Ash");
	await page.locator("#review-text").fill("Use a clearer heading.");
	await page.locator("#review-replacement").fill("Victory at Ash colony");
	// A deployment replaces the stale Telegram screen and restores the comment draft automatically.
	const entry = fixtures.get("battle-report");
	assert.ok(entry);
	const updated = structuredClone(entry.fixture);
	updated.messages[0].text += "\nPreview revision updated.";
	const updatedPath = join(root, "battle-report.json");
	await Bun.write(updatedPath, JSON.stringify(updated));
	fixtures.set("battle-report", { ...entry, path: updatedPath, fixture: updated });
	const port = server.port;
	const reloaded = page.waitForEvent("domcontentloaded");
	await server.stop(true);
	server = startServer({ fixtures, port, dist: paths.dist, reviewDatabase: join(root, "reviews.sqlite") });
	await reloaded;
	await page.getByText("Your unsaved draft has been restored.", { exact: true }).waitFor();
	assert.equal(await page.locator("#review-quote").inputValue(), "Victory at Ash");
	assert.equal(await page.locator("#review-text").inputValue(), "Use a clearer heading.");
	assert.equal(await page.locator("#review-replacement").inputValue(), "Victory at Ash colony");
	assert.match(await chat.locator(".Message .text-content").innerText(), /Preview revision updated/);
	await page.locator("#review-save").click();
	await page.getByText("Comment #1 saved on this server.", { exact: true }).waitFor();
	let saved = await comments();
	assert.equal(saved[0].target?.tag, "strong");
	assert.match(saved[0].target?.selector || "", /#message-1/);
	assert.match(saved[0].target?.html || "", /Victory at Ash/);
	assert.equal(saved[0].snapshot, undefined);
	await page.locator("#review-zoom").selectOption("2");
	const zoomed = await heading.boundingBox();
	const pin = await page.locator(".review-pin").boundingBox();
	assert.ok(zoomed && pin);
	assert.ok(Math.abs(pin.x + pin.width / 2 - zoomed.x) <= 2, "DOM anchor must follow zoom");
	await page.locator("#review-zoom").selectOption("fit");
	// Highlighting words opens a floating composer without entering inspection mode.
	await heading.evaluate((element) => {
		const range = element.ownerDocument.createRange();
		range.setStart(element.firstChild as Node, 0);
		range.setEnd(element.firstChild as Node, 7);
		const selection = element.ownerDocument.getSelection();
		selection?.removeAllRanges();
		selection?.addRange(range);
	});
	const composer = page.locator("#review-form:popover-open");
	await composer.waitFor();
	const composerBox = await composer.boundingBox();
	const anchorBox = await heading.boundingBox();
	assert.ok(composerBox && anchorBox && Math.abs(composerBox.y - anchorBox.y) < 100);
	assert.equal(await page.locator("#review-quote").inputValue(), "Victory");
	assert.equal(await page.locator("#review-text").inputValue(), "");
	await page.locator("#review-text").fill("Only this word needs changing.");
	await page.locator("#review-replacement").fill("Battle won");
	await page.screenshot({ path: "wireframes/empire-views/review-composer.png", fullPage: true });
	await page.locator("#review-save").click();
	await page.getByText("Comment #2 saved on this server.", { exact: true }).waitFor();
	saved = await comments();
	assert.deepEqual(saved[1].target?.selection, { start: 0, end: 7 });
	assert.equal(saved[1].replacement, "Battle won");
	// Drag real text while selecting, rather than supplying a Range through the toolbar.
	await page.locator("#comment-mode").click();
	const word = await heading.evaluate((element) => {
		const range = element.ownerDocument.createRange();
		range.setStart(element.firstChild as Node, 0);
		range.setEnd(element.firstChild as Node, 7);
		return { width: range.getBoundingClientRect().width };
	});
	const headingBox = await heading.boundingBox();
	assert.ok(headingBox);
	await page.mouse.move(headingBox.x + 1, headingBox.y + headingBox.height / 2);
	await page.mouse.down();
	await page.mouse.move(headingBox.x + word.width, headingBox.y + headingBox.height / 2, { steps: 8 });
	await page.mouse.up();
	assert.equal(await page.locator("#review-quote").inputValue(), "Victory");
	await page.keyboard.press("Escape");
	assert.equal(await page.locator("#review-form").isVisible(), false);
	// Select another word clear of existing comment pins, without inspection mode.
	const lastWord = await heading.evaluate((element) => {
		const range = element.ownerDocument.createRange();
		range.setStart(element.firstChild as Node, 11);
		range.setEnd(element.firstChild as Node, 14);
		const box = range.getBoundingClientRect();
		return { offset: box.left - element.getBoundingClientRect().left, width: box.width };
	});
	const normalBox = await heading.boundingBox();
	assert.ok(normalBox);
	await page.mouse.move(normalBox.x + lastWord.offset + 1, normalBox.y + normalBox.height / 2);
	await page.mouse.down();
	await page.mouse.move(normalBox.x + lastWord.offset + lastWord.width, normalBox.y + normalBox.height / 2, {
		steps: 8,
	});
	await page.mouse.up();
	await composer.waitFor();
	assert.equal(await page.locator("#review-quote").inputValue(), "Ash");
	await page.locator("#review-cancel").click();
	// A rebuilt Telegram timestamp must not detach feedback from the message body.
	await page.locator("#comment-mode").click();
	await chat.locator(".Message .text-content").click({ position: { x: 220, y: 40 } });
	assert.match((await page.locator("#review-target").textContent()) || "", /^div/);
	await chat.locator(".Message .message-time").evaluate((node) => {
		node.textContent = "00:00";
	});
	await page.waitForFunction(
		() => (document.querySelector(".review-region.draft")?.getBoundingClientRect().height || 0) > 100,
	);
	await page.locator("#review-cancel").click();
	// Inspection must not activate the native button; normal browsing must still work.
	await page.locator("#comment-mode").click();
	await chat.getByRole("button", { name: "Ship losses and stats", exact: true }).click();
	assert.equal(new URL(page.url()).hash, "#battle-report");
	assert.equal(await page.locator("#review-quote").inputValue(), "Ship losses and stats");
	await page.locator("#review-cancel").click();
	await chat.getByRole("button", { name: "Ship losses and stats", exact: true }).click();
	await chat.getByText("Ash · ship losses 1/2", { exact: true }).waitFor();
	assert.notEqual(new URL(page.url()).hash, "#battle-report");
	await chat.getByRole("button", { name: "⬅️ Battle report", exact: true }).click();
	await page.waitForURL(/#battle-report$/);
	await ready(page);
	await page.locator('[data-theme="light"]').click();
	await ready(page);
	assert.match((await chat.locator("html").getAttribute("class")) || "", /theme-light/);
	assert.equal(await page.locator(".review-pin").count(), 0);
	await page.locator("#review-filter").selectOption("all");
	await page.locator("#review-comment-1 > button").click();
	await page.locator('.review-pin[aria-pressed="true"]').first().waitFor();
	await page.locator("#review-comment-1").getByRole("button", { name: "Edit", exact: true }).click();
	await page.locator("#review-text").fill("Edited heading feedback");
	// Editing existing feedback must not be interrupted by a preview deployment.
	await server.stop(true);
	server = startServer({ fixtures, port, dist: paths.dist, reviewDatabase: join(root, "reviews.sqlite") });
	await page.evaluate(() => window.dispatchEvent(new Event("focus")));
	assert.equal(await page.locator("#review-text").inputValue(), "Edited heading feedback");
	await page.locator("#review-save").click();
	await page.getByText("Comment #1 saved on this server.", { exact: true }).waitFor();
	const refreshed = page.waitForEvent("domcontentloaded");
	await page.evaluate(() => window.dispatchEvent(new Event("focus")));
	await refreshed;
	await ready(page);
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
	assert.match(exported, /Edited heading feedback/);
	assert.match(exported, /Element: #message-1/);
	assert.match(exported, /```html/);
	await page.screenshot({ path: "wireframes/empire-views/review-desktop.png", fullPage: true });
	await page.goto(`${url}#dispatch`);
	await ready(page);
	const app = chat.frameLocator("iframe");
	const appHeading = app.getByRole("heading", { name: "Prepare fleet", exact: true });
	await appHeading.waitFor();
	assert.equal(await app.locator("html").evaluate((node) => getComputedStyle(node).colorScheme), "dark");
	await page.locator("#comment-mode").click();
	await appHeading.click();
	assert.equal(await page.locator("#review-quote").inputValue(), "Prepare fleet");
	await page.locator("#review-text").fill("Mini App heading feedback");
	await page.locator("#review-save").click();
	await page.getByText("Comment #3 saved on this server.", { exact: true }).waitFor();
	saved = await comments();
	assert.equal(saved[2].target?.frames.length, 1);
	assert.match(saved[2].target?.urls[1] || "", /app.html/);
	// Phone taps select native elements without navigating away.
	const phone = await browser.newContext({
		colorScheme: null,
		viewport: { width: 420, height: 900 },
		hasTouch: true,
		isMobile: true,
	});
	phone.setDefaultTimeout(30000);
	const mobile = await phone.newPage();
	await mobile.goto(`${url}#battle-report`);
	await ready(mobile);
	await mobile.locator("#comment-mode").tap();
	await mobile
		.frameLocator("#review-frame")
		.getByRole("button", { name: "Round by round", exact: true })
		.tap();
	assert.equal(await mobile.locator("#review-quote").inputValue(), "Round by round");
	const phoneComposer = await mobile.locator("#review-form:popover-open").boundingBox();
	assert.ok(phoneComposer && phoneComposer.x >= 0 && phoneComposer.x + phoneComposer.width <= 420);
	assert.ok(phoneComposer.y >= 0 && phoneComposer.y + phoneComposer.height <= 900);
	await mobile.locator("#review-text").fill("Touch feedback");
	await mobile.screenshot({ path: "wireframes/empire-views/review-phone-composer.png" });
	await mobile.locator("#review-save").tap();
	await mobile.getByText("Comment #4 saved on this server.", { exact: true }).waitFor();
	assert.equal(await mobile.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
	await mobile.screenshot({ path: "wireframes/empire-views/review-phone.png", fullPage: true });
	await phone.close();
	await context.close();
	const fresh = await browser.newPage({ colorScheme: null });
	await fresh.goto(`${url}?theme=dark&comment=1#battle-report`);
	await fresh.locator('.review-pin[aria-pressed="true"]').waitFor();
	assert.match(await fresh.locator("#review-comment-1").innerText(), /Edited heading feedback/);
	await fresh.goto(`${url}?theme=dark&comment=3#dispatch`);
	await fresh.locator('.review-pin[aria-pressed="true"]').waitFor();
	assert.match(await fresh.locator("#review-comment-3").innerText(), /Mini App heading feedback/);
	assert.equal((await comments()).length, 4);
	assert.deepEqual(errors, []);
	console.log(
		"Live review passed: deployment refresh, draft preservation, native Telegram elements, exact text selection, DOM context, zoom, navigation, themes, Mini Apps, touch, persistence, edits, deep links and export.",
	);
} finally {
	await browser.close();
	server.stop(true);
	await rm(root, { recursive: true, force: true });
}
