import assert from "node:assert/strict";
import { chromium } from "playwright";
import { admirals, beats, styles, variantName } from "../examples/admiral-onboarding/journey";
import { buildOnboarding, onboardingDir, onboardingPath } from "../src/admiral-onboarding";
import { chatUrl, startServer } from "../src/server";
import { paths } from "../src/upstream";

const fixtures = await buildOnboarding();
for (const beat of beats)
	for (const admiral of admirals)
		for (const style of styles)
			for (const presence of ["frequent", "milestones", "none"] as const) {
				assert.ok(
					fixtures.has(variantName(style.id, admiral.id, beat, presence)),
					`Missing ${style.id}/${admiral.id}/${beat.id}/${presence}`,
				);
			}
const server = startServer({ dist: paths.dist, fixtures });
const browser = await chromium.launch({
	executablePath: process.env.TELEGRAM_WIREFRAMES_CHROMIUM || undefined,
});
try {
	for (const style of styles)
		for (const person of admirals) {
			const context = await browser.newContext({
				viewport: { width: 420, height: 900 },
				colorScheme: "dark",
			});
			const page = await context.newPage();
			await page.goto(chatUrl(server.url.origin, `${style.id}-${person.id}-review`));
			await page.getByRole("button", { name: "Review in Fleet Command", exact: true }).click();
			await page.locator(".Modal.confirm .confirm-dialog-button").first().click();
			const app = page.frameLocator("iframe");
			await app.locator("[data-ready='true']").waitFor();
			await page.waitForTimeout(800); // Telegram's opening animation outlives iframe readiness.
			assert.match(await app.locator("#content").innerText(), new RegExp(person.name));
			assert.match(await app.locator("#content").innerText(), /6 Scout Fighters/);
			assert.match(await app.locator("#content").innerText(), /19:05/);
			assert.ok(
				await app
					.locator(".guide img")
					.evaluate(
						(image) => (image as HTMLImageElement).complete && (image as HTMLImageElement).naturalWidth > 0,
					),
			);
			await app.getByRole("button", { name: "Edit", exact: true }).click();
			await app.locator('[name="speed"]').focus();
			await app.locator('[name="speed"]').press("Home");
			assert.match(await app.locator("#quote").innerText(), /19:50/);
			await app.getByRole("button", { name: "Review dispatch", exact: true }).click();
			await app.getByRole("button", { name: "Dispatch now", exact: true }).click();
			assert.match(await app.locator("#content").innerText(), /6 Scout Fighters are outbound/);
			assert.equal(await app.getByRole("button", { name: "Dispatch now", exact: true }).count(), 0);
			assert.equal(
				await app.locator("body").evaluate(() => document.documentElement.scrollWidth > innerWidth),
				false,
			);
			await context.close();
		}
	const context = await browser.newContext({ viewport: { width: 1440, height: 1050 } });
	const page = await context.newPage();
	await page.goto(`${server.url.origin}${onboardingPath}`);
	await page.getByRole("heading", { name: "First contact", exact: true }).waitFor();
	assert.equal(await page.locator(".preview").count(), 3);
	await page.getByRole("combobox", { name: "Guide", exact: true }).selectOption("both");
	assert.equal(await page.locator(".preview").count(), 6);
	await page.getByRole("link", { name: "An ordinary paid queue", exact: true }).click();
	await page.getByRole("combobox", { name: "Character presence", exact: true }).selectOption("milestones");
	assert.equal(await page.locator(".preview").count(), 2);
	await page.getByRole("combobox", { name: "Character presence", exact: true }).selectOption("none");
	assert.equal(await page.locator(".preview").count(), 1);
	await page.getByRole("button", { name: "Skip here", exact: true }).click();
	await page.getByLabel("What works, or what gets in the way?").fill("The queue should stay compact.");
	await page.reload();
	assert.equal(
		await page.getByRole("button", { name: "Skip here", exact: true }).getAttribute("aria-pressed"),
		"true",
	);
	assert.equal(
		await page.getByLabel("What works, or what gets in the way?").inputValue(),
		"The queue should stay compact.",
	);
	const download = page.waitForEvent("download");
	await page.getByRole("button", { name: "Export my choices", exact: true }).click();
	assert.equal((await download).suggestedFilename(), "admiral-choices.md");
	await page.getByRole("combobox", { name: "Guide", exact: true }).selectOption("voss");
	await page.getByRole("combobox", { name: "Character presence", exact: true }).selectOption("frequent");
	await page.getByRole("link", { name: "First contact", exact: true }).click();
	assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
	await page.screenshot({ path: `${onboardingDir}/comparison-desktop.png`, fullPage: true });
	await page.setViewportSize({ width: 420, height: 900 });
	assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
	await page.screenshot({ path: `${onboardingDir}/comparison-phone.png`, fullPage: true });
	await context.close();
	console.log(
		"All style/admiral/presence paths exist; six Telegram Mini App journeys and comparison controls passed.",
	);
} finally {
	await browser.close();
	server.stop(true);
}
