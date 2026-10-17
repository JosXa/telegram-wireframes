import assert from "node:assert/strict";
import { chromium } from "playwright";
import { admirals, beats, words } from "../examples/admiral-onboarding/journey";
import { battles } from "../examples/empire-views/battle-reports";
import { scenes, views } from "../examples/empire-views/connected";
import { buildStudy, studyDir } from "../src/empire-views";
import { chatUrl, startServer } from "../src/server";
import { paths } from "../src/upstream";

const fixtures = await buildStudy();
const reachable = new Set<string>();
function visit(name: string) {
	if (reachable.has(name)) return;
	reachable.add(name);
	for (const target of Object.values(fixtures.get(name)?.fixture.navigation || {})) visit(target);
}
visit("menu");
for (const scene of scenes) assert.ok(reachable.has(scene.id), `${scene.id} cannot be reached from the menu`);

const server = startServer({ fixtures, dist: paths.dist });
const browser = await chromium.launch({
	executablePath: process.env.TELEGRAM_WIREFRAMES_CHROMIUM || undefined,
});
try {
	const page = await browser.newPage({
		viewport: { width: 420, height: 900 },
		colorScheme: "dark",
		hasTouch: true,
	});
	page.setDefaultTimeout(30000);
	await page.goto(chatUrl(server.url.origin, "menu"));
	await page.getByRole("button", { name: "Start onboarding", exact: true }).waitFor();
	for (const view of views) {
		const root = view === "Command Center";
		await page.getByRole("button", { name: root ? "⬅️ Command Center" : view, exact: true }).click();
		const allViews = page.getByRole("button", { name: root ? "⬅️ All views" : "All views", exact: true });
		await allViews.waitFor();
		assert.equal(await page.locator(".Message").count(), 1, `${view} replaces the previous screen`);
		await allViews.click();
		await page.getByRole("button", { name: "Start onboarding", exact: true }).waitFor();
	}
	await page.getByRole("button", { name: "Buildings", exact: true }).click();
	await page.getByRole("button", { name: "Logistics Depot · Level 6", exact: true }).click();
	const back = page.getByRole("button", { name: "⬅️ Buildings", exact: true });
	await back.waitFor();
	assert.equal(await page.locator(".Message button").last().innerText(), await back.innerText());
	await page.screenshot({ path: `${studyDir}/back-button-phone.png` });
	await back.click();
	await page.getByRole("button", { name: "Logistics Depot · Level 6", exact: true }).click();
	await page.getByRole("button", { name: "Queue upgrade · Level 7", exact: true }).click();
	await page.getByRole("button", { name: "Cancel Logistics Depot → 7", exact: true }).click();
	await page.locator(".Message").getByText("Logistics Depot upgrade cancelled", { exact: false }).waitFor();
	await page.getByRole("button", { name: "All views", exact: true }).click();
	// All report reading stays in native messages; only a collection order opens fleet controls.
	for (const battle of battles) {
		await page.getByRole("button", { name: "Battle Reports", exact: true }).click();
		await page.getByRole("button", { name: battle.title, exact: true }).click();
		// The archive also lists battle titles, so wait for the report's own action before reading its heading.
		const losses = page.getByRole("button", { name: "Ship losses and stats", exact: true });
		await losses.waitFor();
		assert.match(await page.locator(".Message").innerText(), new RegExp(`^${battle.title}$`, "m"));
		assert.equal(await page.locator("iframe, .Message img.full-media").count(), 0);
		await losses.click();
		for (let index = 0; index < battle.contingents.length; index++) {
			await page
				.locator(".Message")
				.getByText(`${battle.planet} · ship losses ${index + 1}/${battle.contingents.length}`, {
					exact: true,
				})
				.waitFor();
			assert.match(await page.locator(".Message").innerText(), new RegExp(battle.contingents[index].owner));
			if (battle.contingents[index].groups.length)
				assert.match(await page.locator(".Message").innerText(), /Atk .*Hull/);
			if (index + 1 < battle.contingents.length)
				await page.getByRole("button", { name: "Next fleet →", exact: true }).click();
		}
		await page.getByRole("button", { name: "⬅️ Battle report", exact: true }).click();
		await page.getByRole("button", { name: "Loot and losses", exact: true }).click();
		await page.locator(".Message").getByText(`${battle.planet} · resources`, { exact: true }).waitFor();
		assert.equal(await page.locator("iframe").count(), 0);
		if (battle.id === "battle-raid") {
			await page.getByRole("button", { name: "Collect salvage", exact: true }).click();
			await page.waitForFunction(
				() => document.querySelector(".Modal.confirm") || document.querySelector("iframe"),
			);
			const permission = page.locator(".Modal.confirm .confirm-dialog-button").first();
			if (await permission.isVisible()) await permission.click();
			const app = page.frameLocator("iframe");
			await app.locator("[data-ready='true']").waitFor();
			for (const [index, name] of ["sector", "system", "orbit"].entries())
				assert.equal(
					await app.locator(`[name="${name}"]`).inputValue(),
					battle.coordinates.split(":")[index],
				);
			await app
				.locator("body")
				.evaluate(() =>
					parent.postMessage(JSON.stringify({ eventType: "web_app_close", eventData: {} }), location.origin),
				);
			await page.locator("iframe").waitFor({ state: "detached" });
		}
		await page.getByRole("button", { name: "All views", exact: true }).click();
		await page.getByRole("button", { name: "Start onboarding", exact: true }).waitFor();
	}
	await page.getByRole("button", { name: "Battle Rounds", exact: true }).click();
	await page.locator(".Message").getByText("Round 3 · victory", { exact: true }).waitFor();
	assert.equal(await page.locator("iframe").count(), 0);
	await page.getByRole("button", { name: "All views", exact: true }).click();
	for (const person of admirals) {
		await page.getByRole("button", { name: "Start onboarding", exact: true }).click();
		await page.getByRole("button", { name: person.name, exact: true }).click();
		for (const beat of beats.slice(0, 12)) {
			await page.getByText(beat.title, { exact: true }).waitFor();
			if (["welcome", "home", "shipyard", "returned"].includes(beat.id))
				await page.waitForFunction(() =>
					[...document.querySelectorAll<HTMLImageElement>(".Message img.full-media")].some(
						(image) => image.complete && image.naturalWidth > 0,
					),
				);
			// Only character dialogue names the admiral; other beats carry the advisor's plain lines.
			const message = await page.locator(".Message").innerText();
			assert.ok(message.includes(beat.lines[person.id]), `${beat.id} shows ${person.name}'s line`);
			if (beat.id === "returned") assert.match(message, new RegExp(person.name));
			if (["mine", "mine-ready", "departed"].includes(beat.id))
				assert.equal(await page.locator(".Message img.full-media").count(), 0);
			if (beat.id === "review") {
				await page.getByRole("button", { name: beat.action, exact: true }).click();
				await page.waitForFunction(
					() => document.querySelector(".Modal.confirm") || document.querySelector("iframe"),
				);
				const permission = page.locator(".Modal.confirm .confirm-dialog-button").first();
				if (await permission.isVisible()) await permission.click();
				const app = page.frameLocator("iframe");
				await app.locator("[data-ready='true']").waitFor();
				assert.ok((await app.locator("#content").innerText()).includes(beat.lines[person.id]));
				await app
					.locator("body")
					.evaluate(() =>
						parent.postMessage(
							JSON.stringify({ eventType: "web_app_close", eventData: {} }),
							location.origin,
						),
					);
				await page.locator("iframe").waitFor({ state: "detached" });
			}
			await page
				.getByRole("button", {
					name:
						beat.app || ["departed", "victory"].includes(beat.id) ? words.continueOnboarding : beat.action,
					exact: true,
				})
				.click();
		}
		await page.getByRole("button", { name: "Quiet hours", exact: true }).waitFor();
		await page.getByRole("button", { name: "All views", exact: true }).click();
	}
	// Commands use the same fixture routing as buttons, through Telegram's message composer.
	const input = page.getByRole("textbox", { name: "Message", exact: true });
	await input.fill("/advisor");
	await input.press("Enter");
	await page.getByRole("button", { name: "Renn Calder", exact: true }).waitFor();
	await page.waitForFunction(() => document.querySelectorAll(".Message").length === 2);
	await page.getByRole("button", { name: "Renn Calder", exact: true }).click();
	await page.getByText(beats[0].title, { exact: true }).waitFor();
	await page.waitForFunction(() => document.querySelectorAll(".Message").length === 1);
	await input.fill("/colony");
	await input.press("Enter");
	await page.getByRole("button", { name: "Spy on incoming fleet", exact: true }).waitFor();
	await page.waitForFunction(() => document.querySelectorAll(".Message").length === 2);
	await input.fill("hello");
	await input.press("Enter");
	await page
		.locator(".Message")
		.getByText("Use the buttons or listed commands to explore this preview.", { exact: false })
		.waitFor();
	await page.waitForFunction(() => document.querySelectorAll(".Message").length === 3);
	for (const text of ["/unknown", "constructor"]) {
		await input.fill(text);
		await input.press("Enter");
		await page.locator(".Message").getByText(text, { exact: false }).waitFor();
		await page.waitForFunction(() => document.querySelectorAll(".Message").length === 3);
	}
	await page.getByRole("button", { name: /^(⬅️ )?All views$/ }).click();
	await page.getByRole("button", { name: "Start onboarding", exact: true }).waitFor();
	await page.waitForFunction(() => document.querySelectorAll(".Message").length === 1);
	await page.screenshot({ path: `${studyDir}/connected-phone.png` });
	await page.setViewportSize({ width: 1280, height: 900 });
	await page.screenshot({ path: `${studyDir}/connected-desktop.png` });
	console.log(
		`${views.length} views and ${scenes.length} reachable states; native chat, commands, both guides and Mini App return passed.`,
	);
} finally {
	await browser.close();
	server.stop(true);
}
