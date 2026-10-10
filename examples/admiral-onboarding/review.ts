import { admirals, beats, type Presence, styles, variantName } from "./journey";

type Choice = { vote?: string; note?: string };
const storageKey = "space-emperors-admiral-review-v1";
const element = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;
const select = (id: string) => element<HTMLSelectElement>(id).value;
const choices: Record<string, Choice> = JSON.parse(localStorage.getItem(storageKey) || "{}");
function activeBeat() {
	return beats.find((beat) => beat.id === location.hash.slice(1)) || beats[0];
}
function key() {
	return [activeBeat().id, select("guide"), select("style"), select("presence")].join(":");
}
function persist() {
	localStorage.setItem(storageKey, JSON.stringify(choices));
	element("saved").textContent = "Saved in this browser. Export to share your choices.";
}
function render() {
	const beat = activeBeat(),
		index = beats.indexOf(beat);
	element("phase").textContent = `${beat.phase} · ${index + 1} / ${beats.length}`;
	element("title").textContent = beat.title;
	element("note").textContent = beat.note;
	element<HTMLButtonElement>("previous").disabled = index === 0;
	element<HTMLButtonElement>("next").disabled = index === beats.length - 1;
	for (const link of document.querySelectorAll<HTMLAnchorElement>("#beats a"))
		link.setAttribute("aria-current", link.hash === `#${beat.id}` ? "step" : "false");
	const presence = select("presence") as Presence;
	const people = admirals.filter((admiral) => select("guide") === "both" || admiral.id === select("guide"));
	const directions = styles.filter((style) => select("style") === "all" || style.id === select("style"));
	const seen = new Set<string>();
	const cards: HTMLElement[] = [];
	for (const person of people)
		for (const style of directions) {
			const name = variantName(style.id, person.id, beat, presence);
			if (seen.has(name)) continue;
			seen.add(name);
			const card = document.createElement("article");
			card.className = "preview";
			const title = document.createElement("h3");
			title.textContent =
				presence === "none"
					? "Factual screen · no admiral"
					: presence === "milestones" && !beat.milestone
						? `${person.name} · text only`
						: `${person.name} · ${style.id}`;
			const sub = document.createElement("p");
			sub.className = "sub";
			sub.textContent =
				presence === "none"
					? "Same controls and game facts"
					: presence === "milestones" && !beat.milestone
						? "Brief guidance · portrait omitted"
						: style.name;
			const image = document.createElement("img");
			image.alt = `${beat.title}, ${title.textContent}`;
			image.src = `screenshots/${name}-${select("theme")}${beat.id === "review" ? "-mini-app" : ""}.png`;
			const pending = document.createElement("p");
			pending.className = "pending";
			pending.hidden = true;
			pending.textContent = "This screenshot is being rendered. Open the live Telegram view below.";
			image.addEventListener("error", () => {
				image.hidden = true;
				pending.hidden = false;
			});
			const live = document.createElement("a");
			live.href = `/?preview=${name}#100?mockScenario=${encodeURIComponent(`wireframe:${name}`)}`;
			live.target = "_blank";
			live.rel = "noreferrer";
			live.textContent = "Open Telegram ↗";
			card.append(title, sub, image, pending, live);
			cards.push(card);
		}
	element("previews").replaceChildren(...cards);
	const choice = choices[key()] || {};
	for (const button of document.querySelectorAll<HTMLButtonElement>("[data-vote]"))
		button.setAttribute("aria-pressed", String(button.dataset.vote === choice.vote));
	element<HTMLTextAreaElement>("reason").value = choice.note || "";
	element("saved").textContent = "";
	const url = new URL(location.href);
	for (const id of ["guide", "style", "presence", "theme"]) url.searchParams.set(id, select(id));
	history.replaceState(null, "", url);
}
for (const phase of new Set(beats.map((beat) => beat.phase))) {
	const heading = document.createElement("h2");
	heading.textContent = phase;
	element("beats").append(heading);
	for (const beat of beats.filter((item) => item.phase === phase)) {
		const link = document.createElement("a");
		link.href = `#${beat.id}`;
		link.textContent = beat.title;
		element("beats").append(link);
	}
}
const query = new URLSearchParams(location.search);
for (const id of ["guide", "style", "presence", "theme"]) {
	const control = element<HTMLSelectElement>(id),
		value = query.get(id);
	if (value && [...control.options].some((option) => option.value === value)) control.value = value;
	control.addEventListener("change", render);
}
for (const [id, delta] of [
	["previous", -1],
	["next", 1],
] as const)
	element(id).addEventListener("click", () => {
		location.hash = beats[beats.indexOf(activeBeat()) + delta].id;
	});
for (const button of document.querySelectorAll<HTMLButtonElement>("[data-vote]"))
	button.addEventListener("click", () => {
		choices[key()] = { ...choices[key()], vote: button.dataset.vote };
		render();
		persist();
	});
element<HTMLTextAreaElement>("reason").addEventListener("input", () => {
	choices[key()] = { ...choices[key()], note: element<HTMLTextAreaElement>("reason").value };
	persist();
});
element("export").addEventListener("click", () => {
	const rows = Object.entries(choices).map(
		([variant, choice]) => `## ${variant}\n\n${choice.vote || "Unrated"}\n\n${choice.note || ""}`,
	);
	const text = `# Space Emperors: admirals in action\n\nCurrent comparison: ${select("guide")} / ${select("style")} / ${select("presence")}\n\n${rows.join("\n\n")}`;
	const url = URL.createObjectURL(new Blob([text], { type: "text/markdown" }));
	const link = document.createElement("a");
	link.href = url;
	link.download = "admiral-choices.md";
	link.click();
	URL.revokeObjectURL(url);
});
window.addEventListener("hashchange", render);
render();
