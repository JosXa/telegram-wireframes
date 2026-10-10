import assert from "node:assert/strict";
import { chromium } from "playwright";
import { admirals, beats } from "../examples/admiral-onboarding/journey";
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
	await page.goto(chatUrl(server.url.origin, "menu"));
	await page.getByRole("button", { name: "Start onboarding", exact: true }).waitFor();
	for (const view of views) {
		await page.getByRole("button", { name: view, exact: true }).click();
		await page.getByRole("button", { name: "All views", exact: true }).waitFor();
		assert.equal(await page.locator(".Message").count(), 1, `${view} replaces the previous screen`);
		await page.getByRole("button", { name: "All views", exact: true }).click();
		await page.getByRole("button", { name: "Start onboarding", exact: true }).waitFor();
	}
	await page.getByRole("button", { name: "Buildings", exact: true }).click();
	await page.getByRole("button", { name: "Logistics Depot · Level 6", exact: true }).click();
	await page.getByRole("button", { name: "Pay and queue · Level 7", exact: true }).click();
	await page.getByRole("button", { name: "Cancel Logistics Depot → 7", exact: true }).click();
	await page.locator(".Message").getByText("Logistics Depot upgrade cancelled", { exact: false }).waitFor();
	await page.getByRole("button", { name: "All views", exact: true }).click();
	for (const person of admirals) {
		await page.getByRole("button", { name: "Start onboarding", exact: true }).click();
		await page.getByRole("button", { name: person.name, exact: true }).click();
		for (const beat of beats.slice(0, 12)) {
			await page.getByText(beat.title, { exact: true }).waitFor();
			if (["welcome", "home", "shipyard"].includes(beat.id)) {
				await page.waitForFunction(() =>
					[...document.querySelectorAll<HTMLImageElement>(".Message img.full-media")].some(
						(image) => image.complete && image.naturalWidth > 0,
					),
				);
				assert.match(await page.locator(".Message").innerText(), new RegExp(person.name));
			}
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
				assert.match(await app.locator("#content").innerText(), new RegExp(person.name));
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
					name: beat.app || ["departed", "victory"].includes(beat.id) ? "Continue onboarding" : beat.action,
					exact: true,
				})
				.click();
		}
		await page.getByRole("button", { name: "Quiet hours", exact: true }).waitFor();
		await page.getByRole("button", { name: "All views", exact: true }).click();
	}
	// Commands use the same fixture routing as buttons, through Telegram's message composer.
	const input = page.getByRole("textbox", { name: "Message", exact: true });
	await input.fill("/colony");
	await input.press("Enter");
	await page.getByRole("button", { name: "Inspect incoming fleet", exact: true }).waitFor();
	await page.getByRole("button", { name: "All views", exact: true }).click();
	await page.getByRole("button", { name: "Start onboarding", exact: true }).waitFor();
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
