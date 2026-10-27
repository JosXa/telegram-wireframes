import { describe, expect, test } from "bun:test";
import { resolve } from "node:path";
import {
	act,
	initial,
	maxFor,
	merge,
	parseOrder,
	progress,
	reply,
	type State,
	takesReply,
	variantIds,
} from "../examples/ship-batches/model";
import { aliases, duration, fixtureFor, screenFor } from "../examples/ship-batches/screens";
import { shared, variants } from "../examples/ship-batches/variants";
import type { Fixture } from "../src/fixture";
import { validateFixture } from "../src/validate";

const sample: State = {
	...initial("B"),
	draft: [
		[0, 12],
		[1, 4],
		[3, 2],
	],
};

describe("ship batch model", () => {
	test("max counts leave room for the rest of the draft", () => {
		expect(maxFor(sample, 1)).toBe(56);
		expect(act({ ...sample, s: { k: "compose", sel: 1, step: 1 } }, "max:1").draft).toContainEqual([1, 56]);
	});

	test("ships finish line by line in the composed order", () => {
		const run = progress({ lines: sample.draft, elapsed: 680 });
		expect(run.done).toBe(13);
		expect(run.lines.map((line) => [line.done, line.nextIn])).toEqual([
			[12, undefined],
			[1, 100],
			[0, undefined],
		]);
		expect(duration(run.remaining)).toBe("21m 40s");
	});

	test("added ships grow an unfinished line or start a new one", () => {
		const batch = { lines: sample.draft, elapsed: 680 };
		expect(
			merge(batch, [
				[0, 3],
				[1, 2],
				[2, 1],
			]),
		).toEqual([
			[0, 12],
			[1, 6],
			[3, 2],
			[0, 3],
			[2, 1],
		]);
	});

	test("refresh finishes a batch and stations its ships", () => {
		let state = act({ ...sample, s: { k: "compose", sel: 0, step: 1 } }, "build");
		expect(state.stock).toEqual({ minerals: 8434 - 2160, gas: 4806 - 680 });
		for (let tap = 0; tap < 10 && state.batch; tap++) state = act(state, "refresh");
		expect(state.s.k).toBe("finished");
		expect(state.stationed).toEqual([18, 5, 0, 2, 0]);
	});

	test("written orders read ship words and reject locked types", () => {
		expect(parseOrder("12 starter, 4 raid and line 2")).toEqual({
			lines: [
				[0, 12],
				[1, 4],
				[3, 2],
			],
		});
		expect(parseOrder("1 heavy")).toEqual({
			problem: "Heavy line ships need the Orbital Shipyard at level 8 first.",
		});
		expect("problem" in parseOrder("lots of ships")).toBe(true);
	});

	test("typed amounts clamp to the stock", () => {
		const prompt: State = { ...sample, s: { k: "amount", sel: 1, back: "compose" } };
		expect(reply(prompt, "999").draft).toContainEqual([1, 56]);
		expect(reply(prompt, "999").note).toContain("56");
		expect(reply(prompt, "seven").s.k).toBe("amount");
	});
});

const replies = ["7", "999", "seven", "12 starter, 4 raid, 2 line", "1 heavy", "Raid wing"];

function check(fixture: Fixture, where: string) {
	for (const message of fixture.messages) {
		if (message.from !== "bot") continue;
		const text = message.text ?? message.caption ?? "";
		expect(text, where).not.toMatch(/undefined|NaN|\[object/);
		if (message.caption !== undefined) expect(message.caption.length, where).toBeLessThanOrEqual(1024);
		const markup = message.reply_markup;
		if (!markup || !("inline_keyboard" in markup)) continue;
		for (const button of markup.inline_keyboard.flat())
			if (button.callback_data)
				expect(new TextEncoder().encode(button.callback_data).length, where).toBeLessThanOrEqual(64);
	}
	const main = fixture.messages.filter((message) => message.from === "bot")[0]?.reply_markup;
	if (main && "inline_keyboard" in main) {
		const last = main.inline_keyboard.at(-1);
		expect(last?.length, where).toBe(1);
		expect(last?.[0]?.text, where).toStartWith("⬅️ ");
	}
}

describe("ship batch screens", () => {
	test("every gallery shot has an alias", () => {
		for (const shot of [...variants.flatMap((variant) => variant.shots), ...shared])
			expect(aliases[shot.alias], shot.alias).toBeDefined();
	});

	for (const v of variantIds)
		test(`variant ${v}: every reachable screen is valid`, async () => {
			const path = resolve("examples/ship-batches/fixture.json");
			const seen = new Set<string>();
			const queue = [`batches-${v}`];
			while (queue.length && seen.size < 600) {
				const name = queue.shift() as string;
				if (seen.has(name)) continue;
				seen.add(name);
				const fixture = fixtureFor(name);
				if (!fixture) throw new Error(`${name} does not resolve`);
				await validateFixture(fixture, path);
				check(fixture, name);
				for (const [action, target] of Object.entries(fixture.navigation ?? {})) {
					if (action === "*")
						for (const text of replies) queue.push(target.replace("{text}", encodeURIComponent(text)));
					else queue.push(target);
				}
			}
			expect(seen.size).toBeGreaterThan(20);
		});

	test("reply screens route typed text", () => {
		const prompt: State = { ...sample, s: { k: "amount", sel: 1, back: "compose" } };
		expect(takesReply(prompt)).toBe(true);
		expect(screenFor(prompt).navigation?.["*"]).toEndWith("!{text}");
		expect(screenFor(sample).navigation?.["*"]).toBeUndefined();
	});
});
