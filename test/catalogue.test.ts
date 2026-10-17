import { expect, test } from "bun:test";
import assert from "node:assert/strict";
import { scenes } from "../examples/empire-views/connected";

const keyboards = new Map(
	scenes.map((scene) => [
		scene.id,
		scene.fixture.messages.flatMap((message) =>
			message.reply_markup && "inline_keyboard" in message.reply_markup
				? message.reply_markup.inline_keyboard
				: [],
		),
	]),
);

test("every screen ends with one neutral full-width back button to a registered parent", () => {
	for (const scene of scenes) {
		const rows = keyboards.get(scene.id);
		assert.ok(rows);
		const back = rows.flat().filter((button) => button.text.startsWith("⬅️ "));
		expect(back).toHaveLength(1);
		expect(rows.at(-1)).toEqual(back);
		expect(back[0].style).toBeUndefined();
		expect(back[0].disabled).toBeUndefined();
		expect(back[0].text).not.toContain("undefined");
		expect(back[0].callback_data).not.toBe(scene.id);
		const parent = back[0].callback_data;
		assert.ok(parent);
		expect(keyboards.has(parent)).toBe(true);
		expect(scene.fixture.navigation?.[parent]).toBe(parent);
		expect(rows.flat().some((button) => button.text.startsWith("Back to "))).toBe(false);
	}
});

test("back links follow the relevant parent and preserve actions sharing that destination", () => {
	for (const [id, parent, label] of [
		["building-detail", "buildings", "Buildings"],
		["queue-blocked", "building-queue", "Building queue"],
		["battle-defense-ships-2", "battle-defense", "Battle report"],
		["battle-raid-resources", "battle-raid", "Battle report"],
		["battle-replay", "battle-report", "Battle report"],
		["dispatch-confirm", "dispatch", "Dispatch"],
		["journey-voss-mine", "journey-voss-welcome", "Advisor"],
	])
		expect(keyboards.get(id)?.at(-1)).toEqual([{ text: `⬅️ ${label}`, callback_data: parent }]);
	for (const [id, action] of [
		["research-detail", "Queue research · Level 2"],
		["ship-batch", "Build 10 ships"],
		["alliance-remove", "Ban Elian"],
		["preferences-muted", "Turn completion notifications on"],
	])
		expect(
			keyboards
				.get(id)
				?.flat()
				.some((button) => button.text === action),
		).toBe(true);
	for (const scene of scenes) {
		const visited = new Set<string>();
		let id = scene.id;
		while (id !== "menu" && id !== "command-center") {
			expect(visited.has(id)).toBe(false);
			visited.add(id);
			const parent = keyboards.get(id)?.at(-1)?.[0].callback_data;
			assert.ok(parent);
			id = parent;
		}
	}
});

test("displayed coordinates use the glossary marker in messages, captions and buttons", () => {
	for (const scene of scenes) {
		const rows = keyboards.get(scene.id);
		assert.ok(rows);
		const fields = [
			...scene.fixture.messages.flatMap((message) => [message.text || "", message.caption || ""]),
			...rows.flat().map((button) => button.text),
		];
		for (const text of fields)
			for (const match of text.matchAll(/\b\d+:\d+:\d+\b/g))
				expect(text.slice(0, match.index).endsWith("🌐 ")).toBe(true);
	}
});
