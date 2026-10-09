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
			assert.equal(await app.locator("#planet-name").textContent(), "Solara");
			const systems = await app.locator(".system").count();
			assert.equal(await app.locator(".cell").count(), systems, "every hex must contain a system");
			assert.equal(
				await app
					.locator("[data-cell]")
					.evaluateAll((nodes) => new Set(nodes.map((node) => node.getAttribute("data-cell"))).size),
				systems,
				"each hex must have its own system",
			);
			for (const kind of ["star", "white-dwarf", "neutron-star", "black-hole"])
				assert.ok(await app.locator(`.stellar-object[data-kind='${kind}']`).count());
			for (const count of [1, 2, 3])
				assert.ok(await app.locator(`.system[data-components='${count}']`).count());
			assert.ok(
				await app
					.locator(".stellar-core")
					.evaluateAll((nodes) => nodes.every((node) => Number(node.getAttribute("r")) <= 2.8)),
			);
			assert.ok(
				(await app.locator(".system.open").count()) > systems * 0.8,
				"most systems must be unclaimed",
			);
			const frame = page.frames().find((frame) => frame.url().includes("/app/index.html"));
			assert.ok(frame);
			// The Mini App must request the exact same artwork as the surrounding Telegram message.
			for (const glyph of ["💠", "🔥"]) {
				const chatEmoji = page.locator(`.Message img.emoji[alt='${glyph}']`).first();
				const appEmoji = app.locator(`.resources img[alt='${glyph}']`);
				assert.equal(
					await appEmoji.evaluate((node: HTMLImageElement) => node.src),
					await chatEmoji.evaluate((node: HTMLImageElement) => node.src),
				);
			}
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
				(scale) =>
					JSON.parse(document.querySelector("#galaxy")?.getAttribute("data-camera") ?? "{}").scale > scale,
				JSON.parse(before ?? "{}").scale,
			);
			await app.getByRole("button", { name: "Return to home planet" }).click();
			await app.getByRole("button", { name: "Zoom in", exact: true }).click();
			assert.ok(
				JSON.parse((await map.getAttribute("data-camera")) ?? "{}").scale > JSON.parse(before ?? "{}").scale,
			);
			await app.getByRole("button", { name: "Return to home planet" }).click();
			// Tap empty space within Merope's hex, away from the tiny binary-star symbol.
			const merope = await app.locator("[data-cell='18']").boundingBox();
			assert.ok(merope);
			const hexX = merope.x + merope.width / 2 + 38;
			const hexY = merope.y + merope.height / 2;
			const cameraBeforeSelection = await map.getAttribute("data-camera");
			if (touch) await page.touchscreen.tap(hexX, hexY);
			else await page.mouse.click(hexX, hexY);
			assert.equal(await app.locator("#planet-name").textContent(), "Merope");
			assert.match((await app.locator("#planet-meta").textContent()) ?? "", /BINARY SYSTEM/);
			assert.match((await app.locator("#stellar-classification").textContent()) ?? "", /B6 V.*K4 V/);
			assert.equal(await map.getAttribute("data-camera"), cameraBeforeSelection);
			await app.getByRole("button", { name: "Return to home planet" }).click();
			await app.locator("#stellar-key summary").click();
			assert.equal(await app.locator("#stellar-key").getAttribute("open"), "");
			await page.screenshot({ path: `wireframes/interaction/${touch ? "touch" : "desktop"}-catalogue.png` });
			await app.locator("#stellar-key summary").click();
			await page.screenshot({ path: `wireframes/interaction/${touch ? "touch" : "desktop"}.png` });
			await app.getByRole("button", { name: "Enter system ↗" }).click();
			assert.equal(await app.locator(".planet").count(), 4);
			assert.equal(await app.locator(".planet.own").count(), 2);
			assert.equal(await app.locator(".station").count(), 2);
			assert.equal(await app.locator(".cell").count(), 0);
			assert.equal(await app.locator(".orbit").count(), 4);
			assert.ok(
				JSON.parse((await map.getAttribute("data-camera")) ?? "{}").scale * 112 >= 84,
				"orbit lanes must leave room for fingers",
			);
			await page.screenshot({ path: `wireframes/interaction/${touch ? "touch" : "desktop"}-young.png` });
			const systemCamera = JSON.parse((await map.getAttribute("data-camera")) ?? "{}");
			const systemBox = await map.boundingBox();
			assert.ok(systemBox);
			// Select Kepler by touching the opposite side of its orbit, without approaching it.
			const orbitX = systemBox.x + systemCamera.x + Math.cos((Math.PI * 7) / 6) * 224 * systemCamera.scale;
			const orbitY = systemBox.y + systemCamera.y + Math.sin((Math.PI * 7) / 6) * 224 * systemCamera.scale;
			if (touch) await page.touchscreen.tap(orbitX, orbitY);
			else await page.mouse.click(orbitX, orbitY);
			assert.equal(await app.locator("#planet-name").textContent(), "Kepler");
			assert.deepEqual(JSON.parse((await map.getAttribute("data-camera")) ?? "{}"), systemCamera);
			await app.getByRole("button", { name: "Orbit 2: Kepler", exact: true }).click();
			// Animated SVGs confuse Playwright's locator stability check; send real pointer input at the hit target.
			const target = await app.locator("[data-planet='14:2'] .planet-hitbox").boundingBox();
			assert.ok(target);
			assert.ok(target.width >= 63 && target.height >= 63, "planet targets must remain finger-sized");
			if (touch) await page.touchscreen.tap(target.x + target.width / 2, target.y + target.height / 2);
			else await page.mouse.click(target.x + target.width / 2, target.y + target.height / 2);
			assert.equal(await app.locator("#planet-name").textContent(), "Kepler");
			assert.match((await app.locator("#planet-meta").textContent()) ?? "", /YOUR COLONY/);
			assert.equal(await app.locator("[data-fleet]").count(), 5);
			const ship = app.locator("[data-fleet='transport']");
			const progress = Number(await ship.getAttribute("data-progress"));
			assert.ok(Number(await ship.getAttribute("data-duration")) >= 8 * 3600000);
			await page.waitForTimeout(1200);
			const delta = Number(await ship.getAttribute("data-progress")) - progress;
			assert.ok(delta > 0 && delta < 0.0001, "ship positions must advance over hours, not seconds");
			await app.locator("#open-movements").click();
			await app.locator("[data-movement='incoming-distant']").click();
			assert.equal(await app.locator("#scan-fleet").isDisabled(), true);
			await app.locator("#movement-back").click();
			await app.locator("[data-movement='incoming-ally']").click();
			assert.equal(await app.locator(".fleet-title h2").textContent(), "Incoming fleet");
			assert.equal(await app.locator(".composition").count(), 0);
			assert.equal(await app.locator("[data-fleet='incoming-ally'] [data-ship-type]").count(), 0);
			await page.screenshot({ path: `wireframes/interaction/${touch ? "touch" : "desktop"}-incoming.png` });
			await app.locator("#scan-fleet").click();
			await app.getByRole("heading", { name: "Reinforcements incoming", exact: true }).waitFor();
			assert.match(
				(await app.locator("#verification").textContent()) ?? "",
				/Mission verified at.*this leg only/,
			);
			assert.equal(await app.locator(".composition > div").count(), 3);
			await app.locator("#verification img[alt='👁']").waitFor();
			await frame.waitForFunction(() =>
				[...document.querySelectorAll<HTMLImageElement>("img.telegram-emoji")].every(
					(image) => image.complete && image.naturalWidth === 64,
				),
			);
			await page.screenshot({ path: `wireframes/interaction/${touch ? "touch" : "desktop"}-espionage.png` });
			await app.locator(".demo-controls summary").click();
			await app.getByRole("button", { name: "Recall", exact: true }).click();
			assert.match((await app.locator("#verification").textContent()) ?? "", /expired.*recalled/);
			assert.equal(await app.locator(".composition").count(), 0);
			await app.locator("#movement-back").click();
			await app.locator("[data-movement='incoming-attack']").click();
			assert.equal(await app.locator(".fleet-title h2").textContent(), "Attack incoming");
			await app.locator(".demo-controls summary").click();
			await app.getByRole("button", { name: "Arrival", exact: true }).click();
			assert.match((await app.locator("#verification").textContent()) ?? "", /expired.*arrived/);
			await app.getByRole("button", { name: "Close fleet movements" }).click();
			await app.getByRole("button", { name: "High empire 8 planets" }).click();
			assert.equal(await app.locator(".planet").count(), 8);
			assert.equal(await app.locator(".planet.own").count(), 8);
			assert.equal(await app.locator(".station").count(), 8);
			assert.equal(await app.locator("[data-fleet]").count(), 27);
			assert.equal(await app.locator("#orbit-picker img.telegram-emoji").count(), 8);
			await frame.waitForFunction(() =>
				[...document.querySelectorAll<HTMLImageElement>("img.telegram-emoji")].every(
					(image) => image.complete && image.naturalWidth === 64,
				),
			);
			await page.screenshot({ path: `wireframes/interaction/${touch ? "touch" : "desktop"}-developed.png` });
			for (let orbit = 1; orbit <= 8; orbit++) {
				const button = app.locator(`[data-orbit-select='28:${orbit}']`);
				await button.click();
				assert.match((await app.locator("#planet-meta").textContent()) ?? "", new RegExp(`28:${orbit}$`));
				const hit = await app.locator(`[data-planet='28:${orbit}'] .planet-hitbox`).boundingBox();
				assert.ok(hit && hit.width >= 63 && hit.height >= 63);
			}
			await app.getByRole("button", { name: "Overview ↗", exact: true }).click();
			assert.ok(JSON.parse((await map.getAttribute("data-camera")) ?? "{}").scale < 0.75);
			const artScale = await app.locator(".planet .map-art").first().getAttribute("transform");
			assert.ok(
				artScale && Number(artScale.match(/[\d.]+/)?.[0]) < 0.9,
				"planet art shrinks gently in overview",
			);
			const hitAreas = await app.locator(".planet-hitbox").evaluateAll((nodes) =>
				nodes.map((node) => {
					const box = node.getBoundingClientRect();
					return { x: box.x + box.width / 2, y: box.y + box.height / 2, width: box.width };
				}),
			);
			for (const [i, a] of hitAreas.entries())
				for (const b of hitAreas.slice(i + 1)) {
					assert.ok(
						Math.hypot(a.x - b.x, a.y - b.y) >= (a.width + b.width) / 2 + 15,
						"overview targets must not overlap",
					);
				}
			await app.getByRole("button", { name: "Return to home planet" }).click();
			await app.locator("#open-movements").click();
			await app.locator("[data-movement='incoming-ally']").click();
			await app.locator("#scan-fleet").click();
			await app.getByRole("heading", { name: "Reinforcements incoming", exact: true }).waitFor();
			await app.locator(".demo-controls summary").click();
			await app.getByRole("button", { name: "Replacement leg", exact: true }).click();
			assert.match((await app.locator("#verification").textContent()) ?? "", /expired.*replaced/);
			assert.equal(await app.locator(".composition").count(), 0);
			await app.getByRole("button", { name: "Close fleet movements" }).click();
			// Reduced motion stops the texture animation but retains readable fleet progress.
			await page.emulateMedia({ reducedMotion: "reduce" });
			assert.equal(
				await app
					.locator(".surface-stripes")
					.first()
					.evaluate((node) => getComputedStyle(node).animationName),
				"none",
			);
			assert.equal(
				await app
					.locator(".route-flow")
					.first()
					.evaluate((node) => getComputedStyle(node).animationName),
				"none",
			);
			assert.deepEqual(appErrors, []);
			console.log(
				`${touch ? "Touch" : "Mouse"}: Telegram frame, galaxy, both systems, orbit spacing, pan, zoom, selection, live fleets, reduced motion passed.`,
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
