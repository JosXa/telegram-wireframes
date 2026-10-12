import { Database } from "bun:sqlite";
import { expect, test } from "bun:test";
import { mkdir, mkdtemp, rm } from "node:fs/promises";
import { join } from "node:path";
import { type ReviewComment, type ReviewSnapshot, reviewHandler } from "../src/review";
import type { RegisteredFixture } from "../src/server";

test("feedback retains original pixels and copy across handlers and screenshot changes", async () => {
	const root = await mkdtemp("/tmp/opencode/wireframe-review-");
	try {
		await mkdir(join(root, "screenshots"));
		const png = Buffer.from(
			"iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRZkAAAAASUVORK5CYII=",
			"base64",
		);
		const image = join(root, "screenshots", "screen-dark.png");
		await Bun.write(image, png);
		const fixtures = new Map<string, RegisteredFixture>([
			[
				"screen",
				{
					name: "screen",
					path: join(root, "screen.json"),
					fixture: { bot: { first_name: "Test" }, messages: [] },
				},
			],
		]);
		let handler = reviewHandler(fixtures, join(root, "reviews.sqlite"));
		const call = async (path: string, body?: unknown, method = "POST", origin = "http://localhost:4243") => {
			const response = await handler(
				new Request(
					`http://localhost:4243/__wireframes__/review/${path}`,
					body
						? { method, headers: { origin, "Content-Type": "application/json" }, body: JSON.stringify(body) }
						: undefined,
				),
			);
			if (!response) throw new Error("Missing response");
			return response;
		};
		const snapshot = (await (
			await call("screen?scene=screen&image=screen-dark.png")
		).json()) as ReviewSnapshot;
		expect([snapshot.width, snapshot.height]).toEqual([1, 1]);
		const body = {
			scene: "screen",
			title: "Screen",
			theme: "dark",
			snapshotId: snapshot.id,
			x: 0,
			y: 0,
			width: 1,
			height: 1,
			text: "Make this clearer",
			quote: "Old copy",
			replacement: "New copy",
		};
		expect((await call("comments", { ...body, x: 1 })).status).toBe(400);
		expect((await call("comments", { ...body, width: -1 })).status).toBe(400);
		expect((await call("comments", { ...body, x: 0.5 })).status).toBe(400);
		expect((await call("comments", body, "POST", "https://other.example")).status).toBe(403);
		expect((await call("screen?scene=screen&image=..%2Fscreen-dark.png")).status).toBe(404);
		const saved = (await (await call("comments", body)).json()) as ReviewComment;
		expect(saved.id).toBe(1);
		// A separate server/port must see the same record, without a browser-local store.
		handler = reviewHandler(fixtures, join(root, "reviews.sqlite"));
		await Bun.write(image, Buffer.concat([png, Buffer.from("new-render")]));
		const current = (await (
			await call("screen?scene=screen&image=screen-dark.png")
		).json()) as ReviewSnapshot;
		expect(current.id).not.toBe(snapshot.id);
		const comments = (await (await call("comments")).json()) as ReviewComment[];
		expect(comments[0]).toEqual(saved);
		const original = await call(`snapshots/${snapshot.id}.png`);
		expect(Buffer.from(await original.arrayBuffer())).toEqual(png);
		const updated = (await (
			await call(
				`comments/${saved.id}`,
				{ text: "Edited feedback", quote: "Old copy", replacement: "Better copy", resolved: true },
				"PATCH",
			)
		).json()) as ReviewComment;
		expect(updated.resolved).toBe(true);
		expect(updated.snapshot?.id).toBe(snapshot.id);
		expect(updated.replacement).toBe("Better copy");
		expect((await call(`comments/${saved.id}`, { ...updated, resolved: false }, "PATCH")).status).toBe(200);
	} finally {
		await rm(root, { recursive: true, force: true });
	}
});

test("live DOM feedback needs no screenshot and preserves records from the previous schema", async () => {
	const root = await mkdtemp("/tmp/opencode/wireframe-dom-review-");
	try {
		const path = join(root, "reviews.sqlite");
		const old = new Database(path);
		old.exec(
			"CREATE TABLE snapshots (id TEXT PRIMARY KEY, width INTEGER, height INTEGER, png BLOB); CREATE TABLE comments (id INTEGER PRIMARY KEY AUTOINCREMENT, snapshot TEXT NOT NULL REFERENCES snapshots(id), body TEXT NOT NULL);",
		);
		old.query("INSERT INTO snapshots VALUES (?, ?, ?, ?)").run("original", 420, 900, new Uint8Array());
		const previous = { text: "Existing screenshot note", snapshot: { id: "original" } };
		old.query("INSERT INTO comments VALUES (?, ?, ?)").run(7, "original", JSON.stringify(previous));
		old.close();
		const fixtures = new Map<string, RegisteredFixture>([
			[
				"screen",
				{
					name: "screen",
					path: join(root, "screen.json"),
					fixture: { bot: { first_name: "Test" }, messages: [] },
				},
			],
		]);
		let handler = reviewHandler(fixtures, path);
		const call = async (body?: unknown) => {
			const response = await handler(
				new Request(
					"http://localhost:4243/__wireframes__/review/comments",
					body
						? {
								method: "POST",
								headers: { origin: "http://localhost:4243", "Content-Type": "application/json" },
								body: JSON.stringify(body),
							}
						: undefined,
				),
			);
			if (!response) throw new Error("Missing response");
			return response;
		};
		const target = {
			selector: "#message-1 strong",
			frames: [],
			urls: ["/#100?mockScenario=wireframe%3Ascreen"],
			tag: "strong",
			text: "Victory at Ash",
			html: "<strong>Victory at Ash</strong>",
			viewport: { width: 420, height: 900 },
			selection: { start: 0, end: 7 },
		};
		const body = {
			scene: "screen",
			title: "Screen",
			theme: "dark",
			x: 10,
			y: 20,
			width: 80,
			height: 20,
			target,
			text: "Change this heading",
			quote: "Victory",
			replacement: "Success",
		};
		expect((await call({ ...body, target: { ...target, selection: { start: 0, end: 500 } } })).status).toBe(
			400,
		);
		expect((await call({ ...body, target: { ...target, urls: ["https://elsewhere.example"] } })).status).toBe(
			400,
		);
		expect((await call({ ...body, x: 420 })).status).toBe(400);
		const response = await call(body);
		expect(response.status).toBe(201);
		const saved = (await response.json()) as ReviewComment;
		expect(saved.id).toBe(8);
		expect(saved.target).toEqual(target);
		expect(saved.snapshot).toBeUndefined();
		handler = reviewHandler(fixtures, path);
		expect(await (await call()).json()).toEqual([{ ...previous, id: 7 }, saved]);
	} finally {
		await rm(root, { recursive: true, force: true });
	}
});
