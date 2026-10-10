// Serves the Web A build and the fixtures. Web A's worker fetches fixtures and their images from
// /__wireframes__/fixtures/<name>/.
import { basename, dirname, extname, join, relative, resolve } from "node:path";

import type { Fixture } from "./fixture";
import { validateFixture } from "./validate";

export type RegisteredFixture = {
	name: string;
	path: string;
	fixture: Fixture;
};

export async function registerFixtures(files: string[]) {
	const fixtures = new Map<string, RegisteredFixture>();
	for (const file of files) {
		const path = resolve(file);
		const stem = basename(path, extname(path));
		const base = stem === "fixture" || stem === "chat" ? basename(dirname(path)) : stem;
		let name = base;
		for (let index = 2; fixtures.has(name); index++) name = `${base}-${index}`;
		const fixture = (await Bun.file(path).json()) as Fixture;
		await validateFixture(fixture, path);
		fixtures.set(name, { name, path, fixture });
	}
	for (const { name, fixture } of fixtures.values()) {
		for (const [action, target] of Object.entries(fixture.navigation || {})) {
			if (!fixtures.has(target))
				throw new Error(`${name}: navigation ${action} targets missing fixture ${target}`);
		}
	}
	return fixtures;
}

function isInside(root: string, path: string) {
	const rel = relative(root, path);
	return rel !== "" && !rel.startsWith("..") && !rel.startsWith("/");
}

export function startServer({
	dist,
	fixtures,
	port = 0,
	debug = false,
}: {
	dist: string;
	fixtures: Map<string, RegisteredFixture>;
	port?: number;
	debug?: boolean;
}) {
	return Bun.serve({
		port,
		async fetch(request) {
			const { pathname } = new URL(request.url);

			if (pathname === "/__wireframes__/config.json") return Response.json({ debug });

			const fixtureMatch = pathname.match(/^\/__wireframes__\/fixtures\/([^/]+)\/(.+)$/);
			if (fixtureMatch) {
				const entry = fixtures.get(decodeURIComponent(fixtureMatch[1]));
				if (!entry) return new Response("Unknown fixture", { status: 404 });
				// Re-read on every request so that `serve` picks up edits on reload.
				if (fixtureMatch[2] === "fixture.json") return new Response(Bun.file(entry.path));

				const root = dirname(entry.path);
				const file = resolve(root, decodeURIComponent(fixtureMatch[2].replace(/^files\//, "")));
				if (!isInside(root, file)) return new Response("Forbidden", { status: 403 });
				const asset = Bun.file(file);
				return (await asset.exists()) ? new Response(asset) : new Response("Not found", { status: 404 });
			}

			const file = resolve(dist, `.${decodeURIComponent(pathname)}`);
			if (isInside(dist, file)) {
				const asset = Bun.file(file);
				if (await asset.exists()) return new Response(asset);
			}
			return new Response(Bun.file(join(dist, "index.html")));
		},
	});
}

export function chatUrl(origin: string, name: string) {
	return `${origin}/#100?mockScenario=${encodeURIComponent(`wireframe:${name}`)}`;
}
