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
		expect(updated.snapshot.id).toBe(snapshot.id);
		expect(updated.replacement).toBe("Better copy");
		expect((await call(`comments/${saved.id}`, { ...updated, resolved: false }, "PATCH")).status).toBe(200);
	} finally {
		await rm(root, { recursive: true, force: true });
	}
});
