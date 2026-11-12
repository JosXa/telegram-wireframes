// Turns each layout into the one HTML document the bot sends: inline style, markup and script.
import { deflateSync } from "node:zlib";

export const layouts = ["rows", "tabs", "timeline", "mixes"] as const;
export type Layout = (typeof layouts)[number];

const folder = new URL(".", import.meta.url).pathname;

export async function widgetHtml(layout: Layout) {
	const build = await Bun.build({
		entrypoints: [`${folder}${layout}.ts`],
		target: "browser",
		format: "iife",
		minify: true,
	});
	if (!build.success) throw new Error(build.logs.join("\n"));
	// The minifier escapes emoji as surrogate pairs; real characters take 4 bytes instead of 12.
	const script = (await build.outputs[0].text())
		.trim()
		.replace(/\\u(d[89ab][0-9a-f]{2})\\u(d[c-f][0-9a-f]{2})/gi, (_, high: string, low: string) =>
			String.fromCharCode(Number.parseInt(high, 16), Number.parseInt(low, 16)),
		);
	const sheets = await Promise.all(["widget", layout].map((name) => Bun.file(`${folder}${name}.css`).text()));
	const style = sheets
		.join("\n")
		.replace(/\s*\n\s*/g, "")
		.replace(/\s*([{};:,>+])\s*/g, "$1")
		.replace(/;}/g, "}");
	return `<style>${style}</style><div id="app"></div><script>${script}</script>`;
}

/** Bytes as Telegram counts them: the document, and after zlib at level 9. */
export const widgetSize = (html: string) => ({
	bytes: Buffer.byteLength(html),
	zlib: deflateSync(Buffer.from(html), { level: 9 }).length,
});
