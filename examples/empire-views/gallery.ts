import type { Scene } from "./catalogue";
import { journeys, scenes, views } from "./connected";
import { createReview } from "./review";

let theme = new URL(location.href).searchParams.get("theme") === "light" ? "light" : "dark";
let journey: (typeof journeys)[number] | undefined;
const element = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;
const review = createReview((scene, nextTheme, comment) => {
	theme = nextTheme;
	const url = new URL(location.href);
	url.search = new URLSearchParams({ theme, ...(comment ? { comment: String(comment) } : {}) }).toString();
	url.hash = scene;
	history.replaceState(null, "", url);
	show();
});
function show() {
	const id = location.hash.slice(1) || "command-center";
	const scene = scenes.find((item) => item.id === id) || scenes[0];
	element("scene-title").textContent = scene.title;
	element("scene-meta").textContent = `${scene.group} / ${scene.surface}`;
	element("view-name").textContent = scene.view;
	element("scope").textContent = scene.status === "V1" ? "V1 scope · illustrative values" : scene.status;
	element("note").textContent = scene.note;
	element<HTMLAnchorElement>("source").href =
		`https://github.com/JosXa/space-emperors/blob/main/docs/${scene.source}`;
	element<HTMLAnchorElement>("open-chat").href =
		`/#100?mockScenario=${encodeURIComponent(`wireframe:${scene.id}`)}`;
	const launch = scene.fixture.mini_app;
	const buttons = scene.fixture.messages.flatMap((message) =>
		message.reply_markup && "inline_keyboard" in message.reply_markup
			? message.reply_markup.inline_keyboard.flat()
			: [],
	);
	const miniApp = launch
		? buttons.find((button) => button.text === launch.button_text)?.web_app?.url
		: undefined;
	const appLink = element<HTMLAnchorElement>("open-app");
	appLink.hidden = !miniApp;
	if (miniApp)
		appLink.href = new URL(miniApp, `${location.origin}/__wireframes__/fixtures/${scene.id}/files/`).href;
	for (const node of document.querySelectorAll<HTMLButtonElement>("[data-theme]"))
		node.setAttribute("aria-pressed", String(node.dataset.theme === theme));
	void review.show(scene, theme);
	element("related").replaceChildren(
		...scene.related.map((related) => {
			const target = scenes.find((item) => item.id === related) as Scene;
			const link = document.createElement("a");
			link.href = `#${related}`;
			link.textContent = `${target.title} →`;
			return link;
		}),
	);
	for (const link of document.querySelectorAll<HTMLAnchorElement>("#scene-list a")) {
		link.setAttribute("aria-current", link.hash === `#${scene.id}` ? "page" : "false");
		if (link.hash === `#${scene.id}`) (link.closest("details") as HTMLDetailsElement).open = true;
	}
	const progress = element("journey-progress");
	const index = journey?.ids.indexOf(scene.id) ?? -1;
	progress.replaceChildren();
	if (journey && index >= 0) {
		const label = document.createElement("span");
		label.textContent = `${journey.title} · ${index + 1} / ${journey.ids.length}`;
		progress.append(label);
		for (const [text, next] of [
			["← Previous", index - 1],
			["Next →", index + 1],
		] as const) {
			if (next < 0 || next >= journey.ids.length) continue;
			const link = document.createElement("a");
			link.textContent = text;
			link.href = `#${journey.ids[next]}`;
			progress.append(link);
		}
	}
}
function navigation(query = "") {
	const list = element("scene-list");
	list.replaceChildren();
	const matches = scenes.filter((scene) =>
		`${scene.view} ${scene.title} ${scene.status}`.toLowerCase().includes(query.toLowerCase()),
	);
	for (const group of new Set(matches.map((scene) => scene.group))) {
		const heading = document.createElement("h2");
		heading.textContent = group;
		list.append(heading);
		for (const view of new Set(matches.filter((scene) => scene.group === group).map((scene) => scene.view))) {
			const members = matches.filter((scene) => scene.group === group && scene.view === view);
			const details = document.createElement("details");
			details.open = Boolean(query);
			const summary = document.createElement("summary");
			summary.textContent = view;
			const count = document.createElement("small");
			count.textContent = String(members.length);
			summary.append(count);
			details.append(summary);
			for (const scene of members) {
				const link = document.createElement("a");
				link.href = `#${scene.id}`;
				link.textContent = scene.title;
				details.append(link);
			}
			list.append(details);
		}
	}
	if (!matches.length) list.textContent = "No matching states. Try a view name.";
	show();
}
element("coverage").textContent = `${views.length} views · ${scenes.length} states`;
for (const item of journeys) {
	const button = document.createElement("button");
	button.type = "button";
	button.textContent = item.title;
	button.setAttribute("aria-pressed", "false");
	button.addEventListener("click", () => {
		journey = item;
		for (const node of document.querySelectorAll("#journeys button"))
			node.setAttribute("aria-pressed", String(node === button));
		location.hash = item.ids[0];
		show();
	});
	element("journeys").append(button);
}
element<HTMLInputElement>("search").addEventListener("input", (event) =>
	navigation((event.target as HTMLInputElement).value),
);
for (const button of document.querySelectorAll<HTMLButtonElement>("[data-theme]"))
	button.addEventListener("click", () => {
		theme = button.dataset.theme as string;
		const url = new URL(location.href);
		url.searchParams.set("theme", theme);
		url.searchParams.delete("comment");
		history.replaceState(null, "", url);
		for (const node of document.querySelectorAll<HTMLButtonElement>("[data-theme]"))
			node.setAttribute("aria-pressed", String(node === button));
		show();
	});
element("export").addEventListener("click", () => {
	const text = `# Space Emperors wireframe coverage\n\nDraft names are authorized for this design pass. Final glossary decisions remain open. Values are illustrative.\n\n${scenes.map((scene) => `## ${scene.view}: ${scene.title}\n\n${scene.surface} · ${scene.status}\n\n${scene.note}\n\n[Open wireframe](${location.origin}${location.pathname}#${scene.id}) · [Source](https://github.com/JosXa/space-emperors/blob/main/docs/${scene.source})\n`).join("\n")}`;
	const url = URL.createObjectURL(new Blob([text], { type: "text/markdown" }));
	const anchor = document.createElement("a");
	anchor.href = url;
	anchor.download = "space-emperors-wireframes.md";
	anchor.click();
	URL.revokeObjectURL(url);
});
window.addEventListener("hashchange", show);
let revision: string | undefined;
async function refreshAfterDeployment() {
	if (document.hidden || !review.canReload()) return;
	try {
		const response = await fetch("/__wireframes__/config.json", { cache: "no-store" });
		if (!response.ok) return;
		const current = (await response.json()).revision as string;
		if (revision && current !== revision) location.reload();
		else revision = current;
	} catch {
		// The preview server can be briefly unavailable while its fixtures rebuild.
	}
}
void refreshAfterDeployment();
setInterval(refreshAfterDeployment, 5000);
document.addEventListener("visibilitychange", refreshAfterDeployment);
window.addEventListener("focus", refreshAfterDeployment);
navigation();
