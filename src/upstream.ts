// Prepares the pinned Telegram Web A checkout: fetch, patch, inject our loader, install, build.

import { createHash } from "node:crypto";
import { cp, mkdir, readdir, rm } from "node:fs/promises";
import { join, resolve } from "node:path";
import { $ } from "bun";

const ROOT = resolve(import.meta.dir, "..");
const CACHE = join(ROOT, ".cache");
const WEB_A = join(CACHE, "web-a");
// Web A's mock client imports the loader from this directory (see patches/web-a.patch).
const INJECT_TARGET = join(WEB_A, "src/lib/gramjs/client/wireframes");

export const paths = {
	root: ROOT,
	upstreamFile: join(ROOT, "upstream.json"),
	patchFile: join(ROOT, "patches/web-a.patch"),
	injectDir: join(ROOT, "inject"),
	fixtureTypes: join(ROOT, "src/fixture.ts"),
	webA: WEB_A,
	dist: join(WEB_A, "dist"),
	buildStamp: join(CACHE, "build.stamp"),
	installStamp: join(CACHE, "install.stamp"),
};

export type Upstream = {
	repository: string;
	branch: string;
	commit: string;
};

export async function readUpstream(): Promise<Upstream> {
	return (await Bun.file(paths.upstreamFile).json()) as Upstream;
}

export async function writeUpstream(upstream: Upstream) {
	await Bun.write(paths.upstreamFile, `${JSON.stringify(upstream, null, "\t")}\n`);
}

export async function resolveBranchHead(upstream: Upstream) {
	const output = await $`git ls-remote ${upstream.repository} refs/heads/${upstream.branch}`.text();
	const commit = output.split(/\s/)[0];
	if (!commit) throw new Error(`Branch ${upstream.branch} not found in ${upstream.repository}`);
	return commit;
}

async function readText(path: string) {
	const file = Bun.file(path);
	return (await file.exists()) ? await file.text() : "";
}

async function injectFiles() {
	const files = (await readdir(paths.injectDir)).filter((name) => name.endsWith(".ts")).sort();
	return [...files.map((name) => join(paths.injectDir, name)), paths.fixtureTypes];
}

async function buildKey(upstream: Upstream) {
	const hash = createHash("sha256");
	hash.update(`${upstream.repository}@${upstream.commit}\n`);
	hash.update(await readText(paths.patchFile));
	for (const file of await injectFiles()) hash.update(`${file}\n${await readText(file)}`);
	return hash.digest("hex");
}

async function checkout(upstream: Upstream) {
	if (!(await Bun.file(join(WEB_A, ".git/HEAD")).exists())) {
		await mkdir(WEB_A, { recursive: true });
		await $`git -C ${WEB_A} init -q`;
		await $`git -C ${WEB_A} remote add origin ${upstream.repository}`;
	}
	await $`git -C ${WEB_A} remote set-url origin ${upstream.repository}`;
	console.log(`Fetching Web A ${upstream.commit.slice(0, 10)}…`);
	await $`git -C ${WEB_A} fetch -q --depth 1 origin ${upstream.commit}`;
	await $`git -C ${WEB_A} checkout -q --force --detach FETCH_HEAD`;
	await $`git -C ${WEB_A} clean -fdq -e node_modules -e dist`;
}

async function applyPatch() {
	const patch = await readText(paths.patchFile);
	if (!patch.trim()) return;

	const result = await $`git -C ${WEB_A} apply --3way --whitespace=nowarn ${paths.patchFile}`.nothrow();
	if (result.exitCode !== 0) {
		throw new Error(
			"patches/web-a.patch does not apply to the pinned Web A commit. Resolve the conflicts in " +
				".cache/web-a, run `bun run build`, then `bun run save-patch` (see /update-web-a).",
		);
	}
}

async function inject() {
	await rm(INJECT_TARGET, { recursive: true, force: true });
	await mkdir(INJECT_TARGET, { recursive: true });
	for (const file of await injectFiles()) {
		await cp(file, join(INJECT_TARGET, file.split("/").at(-1) as string));
	}
}

async function install() {
	const lock = createHash("sha256")
		.update(await readText(join(WEB_A, "package-lock.json")))
		.digest("hex");
	const hasModules = await Bun.file(join(WEB_A, "node_modules/.package-lock.json")).exists();
	if (hasModules && (await readText(paths.installStamp)) === lock) return;

	console.log("Installing Web A dependencies…");
	await $`npm ci --no-audit --no-fund --loglevel=error`.cwd(WEB_A);
	await Bun.write(paths.installStamp, lock);
}

async function build() {
	console.log("Building Web A with the mocked client…");
	await rm(paths.dist, { recursive: true, force: true });
	await $`npm run build:mocked`.cwd(WEB_A).quiet();
}

/** Brings .cache/web-a to the pinned commit with the patch applied, and builds it. */
export async function setup({ force = false } = {}) {
	const upstream = await readUpstream();
	const key = await buildKey(upstream);
	const isBuilt = await Bun.file(join(paths.dist, "index.html")).exists();
	if (!force && isBuilt && (await readText(paths.buildStamp)) === key) {
		console.log(`Web A ${upstream.commit.slice(0, 10)} is up to date.`);
		return;
	}

	await rm(paths.buildStamp, { force: true });
	await checkout(upstream);
	await applyPatch();
	await inject();
	await install();
	await build();
	await Bun.write(paths.buildStamp, key);
	console.log(`Web A ${upstream.commit.slice(0, 10)} is ready.`);
}

/** Rebuilds the current .cache/web-a tree as is. Use it while editing Web A to update the patch. */
export async function rebuild() {
	await rm(paths.buildStamp, { force: true });
	await inject();
	await install();
	await build();
}

/** Type-checks the injected files and the patch against Web A's own TypeScript setup. */
export async function typecheck() {
	await inject();
	await install();
	console.log("Type-checking Web A with the injected files…");
	await $`npx tsc --noEmit -p .`.cwd(WEB_A);
}

/** Writes the changes made to tracked Web A files back to patches/web-a.patch. */
export async function savePatch() {
	// Web A commits its build output, so dist/ is excluded.
	const diff = await $`git -C ${WEB_A} diff -- . ${":(exclude)dist"}`.text();
	await Bun.write(paths.patchFile, diff);
	await Bun.write(paths.buildStamp, await buildKey(await readUpstream()));
	const files = diff.match(/^diff --git a\/(\S+)/gm)?.map((line) => line.split(" ")[2].slice(2)) ?? [];
	console.log(`Saved patches/web-a.patch (${files.join(", ") || "empty"}).`);
}
