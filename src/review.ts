// Live feedback carries DOM context; existing screenshot feedback keeps its original image.
import { Database } from "bun:sqlite";
import { mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import type { RegisteredFixture } from "./server";

export type ReviewSnapshot = { id: string; width: number; height: number; url: string };
export type ReviewTarget = {
	selector: string;
	frames: string[];
	urls: string[];
	tag: string;
	text: string;
	html: string;
	viewport: { width: number; height: number };
	selection?: { start: number; end: number };
};
export type ReviewComment = {
	id: number;
	scene: string;
	title: string;
	theme: "dark" | "light";
	snapshot?: ReviewSnapshot;
	target?: ReviewTarget;
	x: number;
	y: number;
	width: number;
	height: number;
	text: string;
	quote: string;
	replacement: string;
	resolved: boolean;
	createdAt: string;
};
const prefix = "/__wireframes__/review";
const json = (value: unknown, status = 200) =>
	Response.json(value, { status, headers: { "Cache-Control": "no-store" } });
const fail = (message: string, status = 400) => json({ error: message }, status);

export function reviewHandler(fixtures: Map<string, RegisteredFixture>, databasePath: string) {
	// Open lazily: ordinary fixture rendering must not create review data.
	let database: Database | undefined;
	function db() {
		if (database) return database;
		mkdirSync(dirname(databasePath), { recursive: true });
		database = new Database(databasePath, { create: true });
		database.exec(`PRAGMA journal_mode=WAL; PRAGMA foreign_keys=ON; PRAGMA busy_timeout=5000;
			CREATE TABLE IF NOT EXISTS snapshots (id TEXT PRIMARY KEY, width INTEGER, height INTEGER, png BLOB);
			CREATE TABLE IF NOT EXISTS comments (id INTEGER PRIMARY KEY AUTOINCREMENT, snapshot TEXT REFERENCES snapshots(id), body TEXT NOT NULL);`);
		// The first review UI required a PNG. Preserve those records while allowing DOM anchors.
		if (
			database
				.query<{ name: string; notnull: number }, []>("PRAGMA table_info(comments)")
				.all()
				.some((column) => column.name === "snapshot" && column.notnull)
		) {
			database.transaction(() => {
				database?.exec(`ALTER TABLE comments RENAME TO screenshot_comments;
					CREATE TABLE comments (id INTEGER PRIMARY KEY AUTOINCREMENT, snapshot TEXT REFERENCES snapshots(id), body TEXT NOT NULL);
					INSERT INTO comments SELECT * FROM screenshot_comments;
					DROP TABLE screenshot_comments;`);
			})();
		}
		return database;
	}
	return async (request: Request): Promise<Response | undefined> => {
		const url = new URL(request.url);
		if (!url.pathname.startsWith(`${prefix}/`)) return;
		if (!["GET", "POST", "PATCH"].includes(request.method)) return fail("Method not allowed", 405);
		if (request.method !== "GET") {
			if (request.headers.get("origin") !== url.origin) return fail("Same-origin request required", 403);
			if (!request.headers.get("content-type")?.startsWith("application/json"))
				return fail("JSON required", 415);
		}
		if (url.pathname === `${prefix}/screen` && request.method === "GET") {
			const scene = url.searchParams.get("scene") || "";
			const image = url.searchParams.get("image") || "";
			const fixture = fixtures.get(scene);
			if (!fixture || !/^[\w-]+\.png$/.test(image)) return fail("Unknown screen", 404);
			const file = Bun.file(join(dirname(fixture.path), "screenshots", image));
			if (!(await file.exists())) return fail("Render this screen before commenting", 404);
			const png = Buffer.from(await file.arrayBuffer());
			if (png.length < 24 || png.toString("hex", 0, 8) !== "89504e470d0a1a0a")
				return fail("Screenshot must be a PNG");
			const id = new Bun.CryptoHasher("sha256").update(png).digest("hex");
			const width = png.readUInt32BE(16);
			const height = png.readUInt32BE(20);
			db().query("INSERT OR IGNORE INTO snapshots VALUES (?, ?, ?, ?)").run(id, width, height, png);
			return json({ id, width, height, url: `${prefix}/snapshots/${id}.png` });
		}
		const snapshotMatch = url.pathname.match(new RegExp(`^${prefix}/snapshots/([a-f0-9]{64})\\.png$`));
		if (snapshotMatch && request.method === "GET") {
			const row = db()
				.query<{ png: Uint8Array }, [string]>("SELECT png FROM snapshots WHERE id = ?")
				.get(snapshotMatch[1]);
			return row
				? new Response(new Uint8Array(row.png), {
						headers: { "Content-Type": "image/png", "Cache-Control": "public, max-age=31536000, immutable" },
					})
				: fail("Snapshot not found", 404);
		}
		if (url.pathname === `${prefix}/comments` && request.method === "GET") {
			return json(
				db()
					.query<{ id: number; body: string }, []>("SELECT id, body FROM comments ORDER BY id")
					.all()
					.map((row) => ({ ...JSON.parse(row.body), id: row.id })),
			);
		}
		const commentMatch = url.pathname.match(new RegExp(`^${prefix}/comments/(\\d+)$`));
		if (
			(url.pathname === `${prefix}/comments` && request.method === "POST") ||
			(commentMatch && request.method === "PATCH")
		) {
			let body: Record<string, unknown>;
			try {
				const raw = await request.text();
				if (raw.length > 60000) return fail("Comment is too long", 413);
				body = JSON.parse(raw);
				if (!body || typeof body !== "object" || Array.isArray(body)) return fail("Invalid comment");
			} catch {
				return fail("Invalid JSON");
			}
			const textFields = ["text", "quote", "replacement"];
			if (
				textFields.some((key) => typeof body[key] !== "string" || (body[key] as string).length > 8000) ||
				!(body.text as string).trim()
			)
				return fail("Add a comment (up to 8,000 characters per field)");
			if (commentMatch) {
				const id = Number(commentMatch[1]);
				const row = db().query<{ body: string }, [number]>("SELECT body FROM comments WHERE id = ?").get(id);
				if (!row) return fail("Comment not found", 404);
				if (typeof body.resolved !== "boolean") return fail("Invalid comment status");
				const updated = {
					...JSON.parse(row.body),
					text: body.text,
					quote: body.quote,
					replacement: body.replacement,
					resolved: body.resolved,
				};
				db().query("UPDATE comments SET body = ? WHERE id = ?").run(JSON.stringify(updated), id);
				return json({ ...updated, id });
			}
			if (
				typeof body.scene !== "string" ||
				!fixtures.has(body.scene) ||
				!["dark", "light"].includes(String(body.theme)) ||
				typeof body.title !== "string" ||
				body.title.length > 200
			)
				return fail("Unknown screen or theme");
			const snapshot =
				typeof body.snapshotId === "string"
					? db()
							.query<{ id: string; width: number; height: number }, [string]>(
								"SELECT id, width, height FROM snapshots WHERE id = ?",
							)
							.get(body.snapshotId)
					: null;
			let target: ReviewTarget | undefined;
			if (body.target !== undefined) {
				const value = body.target as ReviewTarget;
				const short = (text: unknown, max: number) => typeof text === "string" && text.length <= max;
				if (
					!value ||
					typeof value !== "object" ||
					!short(value.selector, 4000) ||
					!value.selector ||
					!short(value.tag, 100) ||
					!short(value.text, 8000) ||
					!short(value.html, 12000) ||
					!Array.isArray(value.frames) ||
					value.frames.length > 5 ||
					!value.frames.every((frame) => short(frame, 4000)) ||
					!Array.isArray(value.urls) ||
					value.urls.length !== value.frames.length + 1 ||
					!value.urls.every((path) => short(path, 4000) && path.startsWith("/") && !path.startsWith("//")) ||
					!value.viewport ||
					![value.viewport.width, value.viewport.height].every(
						(size) => Number.isInteger(size) && size > 0 && size <= 10000,
					) ||
					(value.selection !== undefined &&
						(!value.selection ||
							!Number.isInteger(value.selection.start) ||
							!Number.isInteger(value.selection.end) ||
							value.selection.start < 0 ||
							value.selection.end <= value.selection.start ||
							value.selection.end > value.text.length))
				)
					return fail("Invalid element selection");
				target = {
					selector: value.selector,
					frames: value.frames,
					urls: value.urls,
					tag: value.tag,
					text: value.text,
					html: value.html,
					viewport: value.viewport,
					...(value.selection ? { selection: value.selection } : {}),
				};
			}
			const viewport = target?.viewport || snapshot;
			if (!viewport) return fail("Select an element before commenting");
			const { x, y, width, height } = body;
			if (
				![x, y, width, height].every(
					(value) => typeof value === "number" && Number.isInteger(value) && value >= 0,
				) ||
				(x as number) >= viewport.width ||
				(y as number) >= viewport.height ||
				(x as number) + (width as number) > viewport.width ||
				(y as number) + (height as number) > viewport.height
			)
				return fail("Selection is outside the preview");
			const comment = {
				scene: body.scene,
				title: body.title,
				theme: body.theme,
				...(target
					? { target }
					: { snapshot: { ...snapshot, url: `${prefix}/snapshots/${snapshot?.id}.png` } }),
				x,
				y,
				width,
				height,
				text: body.text,
				quote: body.quote,
				replacement: body.replacement,
				resolved: false,
				createdAt: new Date().toISOString(),
			};
			const result = db()
				.query("INSERT INTO comments (snapshot, body) VALUES (?, ?)")
				.run(target ? null : (snapshot?.id ?? null), JSON.stringify(comment));
			return json({ ...comment, id: Number(result.lastInsertRowid) }, 201);
		}
		return fail("Not found", 404);
	};
}
