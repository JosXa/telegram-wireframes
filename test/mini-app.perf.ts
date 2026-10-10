// Repeatable pan workload in the real Telegram iframe; run without other browser jobs.
import assert from "node:assert/strict";
import { chromium } from "playwright";
import { chatUrl, registerFixtures, startServer } from "../src/server";
import { paths } from "../src/upstream";

const output = process.argv[2] || "wireframes/performance/pan.json";
const cpuRate = Number(process.env.CPU_RATE || 1);
const panDistance = Number(process.env.PAN_DISTANCE || 120);
const fixtures = await registerFixtures(["examples/galaxy/fixture.json"]);
const server = startServer({ dist: paths.dist, fixtures });
const browser = await chromium.launch({
	executablePath: process.env.TELEGRAM_WIREFRAMES_CHROMIUM || undefined,
});
const results = [];
try {
	for (const mobile of [false, true]) {
		const context = await browser.newContext({
			viewport: { width: mobile ? 420 : 1280, height: 900 },
			deviceScaleFactor: mobile ? 2 : 1,
			colorScheme: "dark",
		});
		const page = await context.newPage();
		const errors: string[] = [];
		page.on("pageerror", (error) => errors.push(error.message));
		await page.goto(chatUrl(server.url.origin, "galaxy"));
		await page.getByRole("button", { name: "🗺 Open galaxy map", exact: true }).click();
		await page.locator(".Modal.confirm .confirm-dialog-button").first().click();
		const app = page.frameLocator("iframe");
		await app.locator("[data-ready='true']").waitFor();
		await page.waitForTimeout(800);
		const frame = page.frames().find((frame) => frame.url().includes("/app/index.html"));
		assert.ok(frame);
		const cdp = await context.newCDPSession(page);
		await cdp.send("Performance.enable");
		await cdp.send("Emulation.setCPUThrottlingRate", { rate: cpuRate });
		const metrics = async () => {
			const { metrics } = await cdp.send("Performance.getMetrics");
			return Object.fromEntries(metrics.map(({ name, value }) => [name, value]));
		};
		for (const [name, zooms] of [
			["neighbourhood", 0],
			["regional", 4],
			["sector", 14],
		] as const) {
			await app.locator("#recenter").click();
			if (zooms) await app.locator("#zoom-out").click({ clickCount: zooms, delay: 30 });
			await page.waitForTimeout(300);
			const box = await app.locator("#galaxy").boundingBox();
			assert.ok(box);
			await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
			await page.mouse.down();
			const before = await metrics();
			const sample = await frame.evaluate(async (distance) => {
				const svg = document.querySelector("#galaxy");
				if (!svg) throw new Error("Space map missing");
				const box = svg.getBoundingClientRect();
				const initialCamera = svg.getAttribute("data-camera");
				const frames: number[] = [],
					handlers: number[] = [];
				let previous = await new Promise<number>(requestAnimationFrame);
				// Real mouse-down supplies capture; moves run at browser cadence without protocol latency.
				for (let step = 1; step <= 180; step++) {
					const now = await new Promise<number>(requestAnimationFrame);
					frames.push(now - previous);
					previous = now;
					const start = performance.now();
					svg.dispatchEvent(
						new PointerEvent("pointermove", {
							pointerId: 1,
							pointerType: "mouse",
							buttons: 1,
							bubbles: true,
							clientX: box.x + box.width / 2 + Math.sin((step * Math.PI) / 60) * distance,
							clientY: box.y + box.height / 2 + (Math.sin((step * Math.PI) / 90) * distance * 5) / 6,
						}),
					);
					handlers.push(performance.now() - start);
					if (step === 90 && svg.getAttribute("data-camera") === initialCamera)
						throw new Error("Drag workload did not move the camera");
				}
				const percentile = (values: number[], p: number) =>
					[...values].sort((a, b) => a - b)[Math.floor((values.length - 1) * p)];
				return {
					frameMedian: percentile(frames, 0.5),
					frameP95: percentile(frames, 0.95),
					frameP99: percentile(frames, 0.99),
					frameMax: Math.max(...frames),
					slowFrames: frames.filter((ms) => ms > 25).length,
					handlerP95: percentile(handlers, 0.95),
					duration: frames.reduce((a, b) => a + b, 0),
					nodes: document.querySelectorAll("*").length,
				};
			}, panDistance);
			const after = await metrics();
			await page.mouse.up();
			const result = {
				viewport: mobile ? "phone-2x" : "desktop",
				zoom: name,
				cpuRate,
				panDistance,
				...sample,
				mainThreadMs: (after.TaskDuration - before.TaskDuration) * 1000,
				scriptMs: (after.ScriptDuration - before.ScriptDuration) * 1000,
				layoutMs: (after.LayoutDuration - before.LayoutDuration) * 1000,
			};
			results.push(result);
			console.log(JSON.stringify(result));
		}
		assert.deepEqual(errors, []);
		await context.close();
	}
	await Bun.write(output, `${JSON.stringify({ browser: browser.version(), results }, null, 2)}\n`);
} finally {
	await browser.close();
	server.stop(true);
}
