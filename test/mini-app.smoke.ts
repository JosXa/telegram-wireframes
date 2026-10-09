// Run after setup: exercise the real Telegram frame and the map in mouse and touch contexts.
import assert from "node:assert/strict";
import { rename } from "node:fs/promises";
import { chromium } from "playwright";
import { chatUrl, registerFixtures, startServer } from "../src/server";
import { paths } from "../src/upstream";

const fixtures = await registerFixtures(["examples/galaxy/fixture.json"]);
const server = startServer({ dist: paths.dist, fixtures });
const browser = await chromium.launch({
	executablePath: process.env.TELEGRAM_WIREFRAMES_CHROMIUM || undefined,
});
try {
	for (const touch of [false, true]) {
		const context = await browser.newContext({
			viewport: touch ? { width: 420, height: 900 } : { width: 1280, height: 900 },
			hasTouch: touch,
			colorScheme: "dark",
			recordVideo: {
				dir: "wireframes/interaction",
				size: touch ? { width: 420, height: 900 } : { width: 1280, height: 900 },
			},
		});
		const page = await context.newPage();
		try {
			const appErrors: string[] = [];
			page.on("pageerror", (error) => appErrors.push(error.message));
			await page.goto(chatUrl(server.url.origin, "galaxy"));
			await page.getByRole("button", { name: "🗺 Open galaxy map", exact: true }).click();
			await page.locator(".Modal.confirm .confirm-dialog-button").first().click();
			const app = page.frameLocator("iframe");
			await app.locator("[data-ready='true']").waitFor();
			await app.locator("[data-telegram-theme]").waitFor();
			// The Telegram permission dialog and browser frame animate before pointer input reaches the map.
			await page.waitForTimeout(800);
			assert.equal(await app.locator("#planet-name").textContent(), "Vega");
			const frame = page.frames().find((frame) => frame.url().includes("/app/index.html"));
			assert.ok(frame);
			assert.equal(new URLSearchParams(new URL(frame.url()).hash.slice(1)).get("tgWebAppData"), "");
			assert.ok(new URLSearchParams(new URL(frame.url()).hash.slice(1)).get("tgWebAppThemeParams"));
			const map = app.locator("#galaxy");
			const box = await map.boundingBox();
			assert.ok(box);
			const x = box.x + box.width * 0.2;
			const y = box.y + box.height * 0.2;
			const before = await map.getAttribute("data-camera");
			if (touch) {
				const cdp = await context.newCDPSession(page);
				await cdp.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [{ x, y }] });
				for (let step = 1; step <= 8; step++) {
					await cdp.send("Input.dispatchTouchEvent", {
						type: "touchMove",
						touchPoints: [{ x: x + step * 7, y: y + step * 4 }],
					});
				}
				await cdp.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
			} else {
				await page.mouse.move(x, y);
				await page.mouse.down();
				await page.mouse.move(x + 60, y + 40, { steps: 8 });
				await page.mouse.up();
			}
			assert.notEqual(await map.getAttribute("data-camera"), before, "drag must change camera");
			await app.getByRole("button", { name: "Return to home planet" }).click();
			if (touch) {
				const cdp = await context.newCDPSession(page);
				const y = box.y + box.height / 2;
				await cdp.send("Input.dispatchTouchEvent", {
					type: "touchStart",
					touchPoints: [
						{ id: 0, x: box.x + 140, y },
						{ id: 1, x: box.x + 240, y },
					],
				});
				for (let step = 1; step <= 8; step++) {
					await cdp.send("Input.dispatchTouchEvent", {
						type: "touchMove",
						touchPoints: [
							{ id: 0, x: box.x + 140 - step * 4, y },
							{ id: 1, x: box.x + 240 + step * 4, y },
						],
					});
				}
				await cdp.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
			} else {
				await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
				await page.mouse.wheel(0, -100);
			}
			await frame.waitForFunction(
				() => JSON.parse(document.querySelector("#galaxy")?.getAttribute("data-camera") ?? "{}").scale > 1,
			);
			await app.getByRole("button", { name: "Return to home planet" }).click();
			await app.getByRole("button", { name: "Zoom in", exact: true }).click();
			assert.ok(JSON.parse((await map.getAttribute("data-camera")) ?? "{}").scale > 1);
			await app.getByRole("button", { name: "Return to home planet" }).click();
			// Animated SVGs confuse Playwright's locator stability check; send real pointer input at the hit target.
			const target = await app.locator("[data-planet='15:3'] .planet-hitbox").boundingBox();
			assert.ok(target);
			if (touch) await page.touchscreen.tap(target.x + target.width / 2, target.y + target.height / 2);
			else await page.mouse.click(target.x + target.width / 2, target.y + target.height / 2);
			assert.equal(await app.locator("#planet-name").textContent(), "Kepler");
			assert.match((await app.locator("#planet-meta").textContent()) ?? "", /YOUR COLONY/);
			await app.getByRole("button", { name: "Fleets 2" }).click();
			assert.equal(await app.locator(".fleet-row").count(), 2);
			const ship = app.locator("[data-fleet='transport']");
			const progress = Number(await ship.getAttribute("data-progress"));
			await frame.waitForFunction((previous) => {
				return (
					Number(document.querySelector("[data-fleet='transport']")?.getAttribute("data-progress")) >
					previous + 0.015
				);
			}, progress);
			await app.getByRole("button", { name: "Galaxy", exact: true }).click();
			await app.getByRole("button", { name: "Return to home planet" }).click();
			await page.screenshot({ path: `wireframes/interaction/${touch ? "touch" : "desktop"}.png` });
			// Reduced motion stops the texture animation but retains readable fleet progress.
			await page.emulateMedia({ reducedMotion: "reduce" });
			assert.equal(
				await app
					.locator(".surface-stripes")
					.first()
					.evaluate((node) => getComputedStyle(node).animationName),
				"none",
			);
			assert.deepEqual(appErrors, []);
			console.log(
				`${touch ? "Touch" : "Mouse"}: Telegram frame, theme bridge, pan, zoom, selection, live fleets, reduced motion passed.`,
			);
		} finally {
			await context.close();
			const video = page.video();
			if (video)
				await rename(await video.path(), `wireframes/interaction/${touch ? "touch" : "desktop"}.webm`);
		}
	}
} finally {
	await browser.close();
	server.stop(true);
}
