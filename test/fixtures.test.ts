import { describe, expect, test } from "bun:test";
import { mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import type { Fixture } from "../src/fixture";
import { registerFixtures, startServer } from "../src/server";
import { validateFixture } from "../src/validate";

const minimal: Fixture = {
	bot: { first_name: "Test Bot" },
	messages: [{ from: "bot", text: "Hello" }],
};

async function writeFixture(name: string, fixture: unknown) {
	const dir = await mkdtemp(join(tmpdir(), "telegram-wireframes-"));
	const path = join(dir, name);
	await writeFile(path, JSON.stringify(fixture));
	return path;
}

describe("validateFixture", () => {
	test("accepts the examples", async () => {
		const fixtures = await registerFixtures(["examples/space-emperors/fixture.json"]);
		expect([...fixtures.keys()]).toEqual(["space-emperors"]);
	});

	test("rejects entities outside the text", async () => {
		const fixture: Fixture = {
			...minimal,
			messages: [{ from: "bot", text: "🪐 Hi", entities: [{ type: "bold", offset: 3, length: 3 }] }],
		};
		await expect(validateFixture(fixture, "/tmp/x.json")).rejects.toThrow("outside the text");
	});

	test("rejects missing photos", async () => {
		const fixture: Fixture = { ...minimal, messages: [{ from: "bot", photo: "missing.jpg" }] };
		await expect(validateFixture(fixture, "/tmp/x.json")).rejects.toThrow("photo not found");
	});

	test("rejects text mixed with a caption", async () => {
		const fixture: Fixture = { ...minimal, messages: [{ from: "bot", text: "a", caption: "b" }] };
		await expect(validateFixture(fixture, "/tmp/x.json")).rejects.toThrow("mixes text");
	});
});

describe("registerFixtures", () => {
	test("names fixture.json after its directory", async () => {
		const path = await writeFixture("fixture.json", minimal);
		const [name] = (await registerFixtures([path])).keys();
		expect(path).toContain(`/${name}/fixture.json`);
	});

	test("deduplicates names", async () => {
		const first = await writeFixture("same.json", minimal);
		const second = await writeFixture("same.json", minimal);
		expect([...(await registerFixtures([first, second])).keys()]).toEqual(["same", "same-2"]);
	});
});

describe("server", () => {
	test("serves fixture files and refuses paths outside the fixture directory", async () => {
		const path = await writeFixture("chat.json", minimal);
		const fixtures = await registerFixtures([path]);
		const [name] = fixtures.keys();
		const server = startServer({ dist: "/nonexistent", fixtures });
		try {
			const base = `${server.url.origin}/__wireframes__/fixtures/${name}`;
			expect(await (await fetch(`${base}/fixture.json`)).json()).toEqual(minimal);
			expect((await fetch(`${base}/files/..%2F..%2Fetc%2Fpasswd`)).status).toBe(403);
			expect(await (await fetch(`${server.url.origin}/__wireframes__/config.json`)).json()).toEqual({
				debug: false,
			});
		} finally {
			server.stop(true);
		}
	});
});
