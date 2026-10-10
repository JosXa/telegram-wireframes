import { expect, test } from "bun:test";
import { battles, settlement } from "../examples/empire-views/battle-reports";
import { scenes } from "../examples/empire-views/catalogue";

test("report cargo fits surviving holds; raids stop at the stock or cargo limit", () => {
	const results = Object.fromEntries(battles.map((battle) => [battle.id, settlement(battle)]));
	expect(results["battle-report"].loot).toEqual([2688, 672]);
	expect(results["battle-report"].salvage).toEqual([840, 210]);
	expect(results["battle-raid"].loot).toEqual([28500, 9500]);
	expect(results["battle-unopposed"].loot).toEqual([4000, 1000]);
	expect(results["battle-unopposed"].salvage).toEqual([0, 0]);
	expect(results["battle-tutorial"].loot).toEqual([80, 20]);
	for (const battle of battles) {
		const result = results[battle.id];
		expect(result.loot[0] + result.loot[1]).toBeLessThanOrEqual(result.attacking.capacity);
		for (const index of [0, 1])
			expect(result.loot[index]).toBeLessThanOrEqual(Math.floor(battle.stock[index] / 2));
		if (!result.won) expect(result.loot).toEqual([0, 0]);
	}
});

test("reports stay in Telegram text and game copy names the action", () => {
	for (const scene of scenes) {
		expect(`${scene.title} ${scene.note} ${JSON.stringify(scene.fixture.messages)}`).not.toMatch(/\bpay\b/i);
		if (!scene.view.startsWith("Battle")) continue;
		expect(scene.surface).toBe("Chat");
		expect(scene.fixture.mini_app).toBeUndefined();
		for (const message of scene.fixture.messages) {
			expect(message.photo).toBeUndefined();
			expect(message.text?.length).toBeLessThanOrEqual(4096);
		}
	}
});
