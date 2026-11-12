import { describe, expect, test } from "bun:test";
import { layouts, widgetHtml, widgetSize } from "../examples/ship-batches/widgets/build";
import { answer, caption, finishedText, initialData, settle } from "../examples/ship-batches/widgets/data";

const t0 = Date.UTC(2026, 10, 12, 9, 0);
const bytes = (text: string) => new TextEncoder().encode(text).length;

// Parts of HTML and CSS that Telegram's widget runtime removes or does not support.
const outsideProfile = [
	/<(input|select|textarea|label|form|img|iframe|link)\b/i,
	/\b\d+vh\b/,
	/position:\s*sticky/,
	/overflow:\s*(auto|scroll)/,
	/:has\(|:focus|:checked/,
	/text-shadow|color-mix|oklch|clip-path|line-clamp|@container/,
	/font-family/,
	/\bfetch\(|XMLHttpRequest|WebSocket/,
];

describe("Shipyard widgets", () => {
	for (const layout of layouts)
		test(`${layout} fits Telegram's widget limits and profile`, async () => {
			const html = await widgetHtml(layout);
			const size = widgetSize(html);
			expect(size.bytes).toBeLessThanOrEqual(32_768);
			expect(size.zlib).toBeLessThanOrEqual(4_096);
			for (const pattern of outsideProfile) expect(html).not.toMatch(pattern);
		});

	test("state stays within 1024 bytes with every type in the batch and the mixes", () => {
		const data = initialData(t0, true);
		const { data: running } = answer(data, "b:0*20,1*10,2*5,3*2", t0);
		expect(running.b?.l).toHaveLength(4);
		expect(bytes(JSON.stringify(running))).toBeLessThanOrEqual(1024);
	});

	test("the bot builds an affordable order, grows its lines and refuses what the yard cannot do", () => {
		const data = initialData(t0, false);
		const placed = answer(data, "b:0*12,1*4", t0);
		expect(JSON.parse(placed.result)).toEqual({ ok: 1 });
		expect(placed.data.b?.l).toEqual([
			[0, 12],
			[1, 4],
		]);
		expect(placed.data.m).toBe(data.m - 12 * 40 - 4 * 120);
		expect(caption(placed.data)).toContain("in production");

		// A second batch is refused, while adding grows the unfinished line of the same type.
		expect(JSON.parse(answer(placed.data, "b:2*1", t0).result).e).toContain("already in production");
		const grown = answer(placed.data, "a:1*2,2*1", t0 + 1000);
		expect(grown.data.b?.l).toEqual([
			[0, 12],
			[1, 6],
			[2, 1],
		]);

		for (const refused of ["b:4*1", "b:0*1,0*2", "b:0*999999", "x:0*1", "b:"]) {
			const reply = answer(data, refused, t0);
			expect(reply.data).toBe(data);
			expect(JSON.parse(reply.result).e).toBeString();
		}
	});

	test("a finished batch stations its ships, becomes the last batch and announces itself", () => {
		const { data } = answer(initialData(t0, false), "b:0*2,3*1", t0);
		expect(settle(data, t0 + 60_000)).toBeNull();
		const done = settle(data, t0 + (2 * 45 + 480) * 1000);
		expect(done?.data.b).toBeNull();
		expect(done?.data.n[0]).toBe(data.n[0] + 2);
		expect(done?.data.d).toEqual([
			[0, 2],
			[3, 1],
		]);
		expect(finishedText(data, done?.finished ?? [])).toContain(
			"Starter ship × 2 and Line ship × 1 are stationed.",
		);
	});
});
