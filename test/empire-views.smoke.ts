// Exercise the state boundaries a static screenshot cannot prove, inside Telegram's actual Mini App frame.
import assert from "node:assert/strict";
import { chromium } from "playwright";
import { scenes, views } from "../examples/empire-views/catalogue";
import { buildStudy, studyPath } from "../src/empire-views";
import { chatUrl, startServer } from "../src/server";
import { paths } from "../src/upstream";

const fixtures = await buildStudy();
assert.equal(new Set(scenes.map((scene) => scene.id)).size, scenes.length);
for (const view of views)
	assert.ok(
		scenes.some((scene) => scene.view === view),
		`${view} needs a wireframe`,
	);
for (const scene of scenes)
	for (const id of scene.related) assert.ok(fixtures.has(id), `${scene.id} links to missing ${id}`);
const server = startServer({ fixtures, dist: paths.dist });
const browser = await chromium.launch({
	executablePath: process.env.TELEGRAM_WIREFRAMES_CHROMIUM || undefined,
});
try {
	for (const width of [420, 1280]) {
		const context = await browser.newContext({
			viewport: { width, height: 900 },
			colorScheme: "dark",
			hasTouch: width === 420,
		});
		const page = await context.newPage();
		await page.goto(chatUrl(server.url.origin, "dispatch"));
		await page.getByRole("button", { name: "Prepare dispatch", exact: true }).click();
		await page.locator(".Modal.confirm .confirm-dialog-button").first().click();
		const frame = page.frameLocator("iframe");
		await frame.locator("[data-ready='true']").waitFor();
		await page.waitForTimeout(800);
		assert.equal(await frame.getByRole("heading", { name: "Prepare dispatch" }).count(), 1);
		const coordinates = frame.getByRole("group", { name: "Target coordinates", exact: true });
		const values = () =>
			coordinates
				.locator("input")
				.evaluateAll((inputs) => inputs.map((input) => (input as HTMLInputElement).value));
		assert.deepEqual(await values(), ["1", "218", "2"]);
		await frame.locator('[name="target"]').selectOption("4");
		assert.deepEqual(await values(), ["1", "214", "8"]);
		assert.equal(await frame.locator('[name="mission"]').inputValue(), "Collect salvage");
		await frame.locator('[name="mission"]').selectOption("Attack");
		assert.equal(await frame.locator('[name="target"]').inputValue(), "1");
		await frame.locator('[name="mission"]').selectOption("Collect salvage");
		assert.equal(await frame.locator('[name="target"]').inputValue(), "4");
		await frame.locator('[name="target"]').selectOption("2");
		assert.equal(await frame.locator('[name="target"]').inputValue(), "2");
		assert.match(await frame.locator("#dispatch-error").innerText(), /Choose the salvage/);
		await frame.locator('[name="mission"]').selectOption("Transport");
		await frame.locator('[name="target"]').selectOption("2");
		assert.deepEqual(await values(), ["1", "219", "3"]);
		await coordinates.getByRole("textbox", { name: "Sector", exact: true }).fill("2");
		assert.equal(await frame.locator('[name="target"]').inputValue(), "");
		assert.equal(await frame.getByRole("button", { name: "Review dispatch" }).isDisabled(), true);
		await coordinates.getByRole("textbox", { name: "Sector", exact: true }).fill("1");
		await coordinates.getByRole("textbox", { name: "System", exact: true }).fill("218");
		await coordinates.getByRole("textbox", { name: "Orbit", exact: true }).fill("2");
		assert.equal(await frame.locator('[name="target"]').inputValue(), "0");
		await coordinates.getByRole("textbox", { name: "Orbit", exact: true }).fill("");
		assert.match(await frame.locator("#dispatch-error").innerText(), /positive whole number/);
		await frame.locator('[name="target"]').selectOption("0");
		assert.deepEqual(await values(), ["1", "218", "2"]);
		await page.screenshot({ path: `wireframes/empire-views/coordinates-${width}.png` });
		assert.match(await frame.locator("#quote").innerText(), /19:35/);
		const speed = frame.locator('[name="speed"]');
		await speed.fill("100");
		assert.match(await frame.locator("#quote").innerText(), /19:05/);
		await frame.locator('[name="minerals"]').fill("9999");
		assert.equal(await frame.getByRole("button", { name: "Review dispatch" }).isDisabled(), true);
		assert.match(await frame.locator("#dispatch-error").innerText(), /capacity/);
		await frame.locator('[name="minerals"]').fill("2000");
		await frame.getByRole("button", { name: "Review dispatch" }).click();
		assert.match(await frame.locator("#content").innerText(), /Rime · 1:218:2/);
		await frame.getByRole("button", { name: "Dispatch now" }).click();
		assert.equal(await frame.getByRole("heading", { name: "Fleet dispatched" }).count(), 1);
		await frame.getByRole("button", { name: "Stationed", exact: true }).click();
		assert.match(await frame.locator("#content").innerText(), /4 Resource Transports/);
		assert.equal(await frame.getByRole("button", { name: /Mira.*dispatch|dispatch.*Mira/i }).count(), 0);
		await frame.getByRole("button", { name: "Withdraw your 8 ships" }).click();
		await frame.getByRole("button", { name: "Confirm withdrawal" }).click();
		assert.equal(await frame.getByRole("button", { name: "Withdrawal started" }).isDisabled(), true);
		await frame.getByRole("button", { name: "Movements", exact: true }).click();
		await frame.getByRole("button", { name: "Recall transport", exact: true }).click();
		await frame.getByRole("button", { name: "Confirm recall" }).click();
		assert.equal(await frame.getByRole("button", { name: "Already returning" }).isDisabled(), true);
		await frame.locator(".warning").click();
		assert.match(await frame.locator("#content").innerText(), /Mission unverified/);
		await frame.getByRole("button", { name: "Sample failure", exact: true }).click();
		assert.match(await frame.locator("#content").innerText(), /Mission unverified/);
		await frame.getByRole("button", { name: "Investigate · sample success" }).click();
		await frame.getByRole("heading", { name: "Reinforcements incoming" }).waitFor();
		assert.match(await frame.locator("#content").innerText(), /12 Scout Fighter/);
		await frame.getByRole("button", { name: "Movements", exact: true }).click();
		assert.match(await frame.locator("#content").innerText(), /Reinforcements incoming/);
		await frame.locator(".warning").click();
		await frame.getByRole("button", { name: "Preview recall / verification expiry" }).click();
		assert.match(await frame.locator("#content").innerText(), /Current mission and ship composition unknown/);
		await frame.getByRole("button", { name: "Dispatch", exact: true }).click();
		await frame.locator('[name="target"]').selectOption("2");
		await frame.locator('[name="mission"]').selectOption("Attack");
		await frame.getByRole("button", { name: "Review dispatch" }).click();
		assert.equal(await frame.getByRole("button", { name: "Dispatch now" }).isDisabled(), true);
		await frame.getByRole("checkbox", { name: "I intend to attack Mira" }).check();
		assert.equal(await frame.getByRole("button", { name: "Dispatch now" }).isEnabled(), true);
		await frame.getByRole("button", { name: "Replay", exact: true }).click();
		await frame.getByRole("button", { name: "Play", exact: true }).click();
		await frame.getByRole("button", { name: "Play again", exact: true }).waitFor();
		assert.match(await frame.locator("#content").innerText(), /18 survivors/);
		await frame.locator("#round").fill("1");
		assert.match(await frame.locator("#content").innerText(), /Both sides fire simultaneously/);
		await page.screenshot({ path: `wireframes/empire-views/replay-${width}.png` });
		const overflow = await frame
			.locator("body")
			.evaluate(() => document.documentElement.scrollWidth > innerWidth);
		assert.equal(overflow, false, "Mini App must fit Telegram's viewport");
		await page.goto(`${server.url.origin}${studyPath}#buildings`);
		await page.getByRole("heading", { name: "Levels and paid queues" }).waitFor();
		await page.getByRole("button", { name: "First attack", exact: true }).click();
		assert.match(await page.locator("#journey-progress").innerText(), /1 \/ 9/);
		await page.getByRole("link", { name: "Next →", exact: true }).click();
		assert.equal(new URL(page.url()).hash, "#nickname");
		await page.getByRole("searchbox").fill("Quiet hours");
		assert.ok((await page.locator("#scene-list a").count()) > 0);
		const download = page.waitForEvent("download");
		await page.getByRole("button", { name: "Export coverage" }).click();
		assert.equal((await download).suggestedFilename(), "space-emperors-wireframes.md");
		assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
		await page.goto(`${server.url.origin}${studyPath}#command-center`);
		await page.screenshot({ path: `wireframes/empire-views/catalogue-${width}.png`, fullPage: true });
		await page.goto(
			`${server.url.origin}/__wireframes__/fixtures/command-center/files/app.html?view=dispatched`,
		);
		await page.locator("[data-ready='true']").waitFor();
		assert.match(await page.locator("#content").innerText(), /10 400/);
		assert.match(await page.locator("#content").innerText(), /5 420/);
		await context.close();
	}
	console.log(
		`All ${views.length} views covered across ${scenes.length} states; dispatch, ownership, intelligence, replay and catalogue flows passed.`,
	);
} finally {
	await browser.close();
	server.stop(true);
}
