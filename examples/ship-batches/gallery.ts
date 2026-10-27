import { shared, type VariantInfo, variants } from "./variants";

const theme = document.getElementById("theme") as HTMLSelectElement;
const live = (alias: string) =>
	`/?preview=${alias}#100?mockScenario=${encodeURIComponent(`wireframe:${alias}`)}`;

function element<K extends keyof HTMLElementTagNameMap>(tag: K, className?: string, text?: string) {
	const node = document.createElement(tag);
	if (className) node.className = className;
	if (text) node.textContent = text;
	return node;
}

function shots(list: VariantInfo["shots"]) {
	const strip = element("div", "shots");
	for (const shot of list) {
		const figure = element("figure");
		const image = element("img");
		image.alt = shot.label;
		image.loading = "lazy";
		image.src = `screenshots/${shot.alias}-${theme.value}.png`;
		const link = element("a");
		link.href = live(shot.alias);
		link.target = "_blank";
		link.rel = "noreferrer";
		link.append(image);
		figure.append(link, element("figcaption", undefined, shot.label));
		strip.append(figure);
	}
	return strip;
}

function list(title: string, items: string[], className: string) {
	const section = element("div", className);
	section.append(element("h3", undefined, title));
	const ul = element("ul");
	for (const item of items) ul.append(element("li", undefined, item));
	section.append(ul);
	return section;
}

function render() {
	const cards = variants.map((variant) => {
		const card = element("article", "variant");
		const heading = element("div", "heading");
		const title = element("h2");
		title.append(element("span", "letter", variant.id), ` ${variant.name}`);
		heading.append(title);
		if (variant.between) heading.append(element("span", "badge", variant.between));
		const open = element("a", "open", "Open Telegram ↗");
		open.href = live(`batches-${variant.id}`);
		open.target = "_blank";
		open.rel = "noreferrer";
		heading.append(open);
		const notes = element("div", "notes");
		notes.append(list("Works", variant.strengths, "plus"), list("Costs", variant.costs, "minus"));
		card.append(heading, element("p", "idea", variant.idea), notes, shots(variant.shots));
		return card;
	});
	const common = element("article", "variant");
	common.append(
		element("h2", undefined, "Shared by every variant"),
		element(
			"p",
			"idea",
			"The Shipyard shows the running batch line by line. ➕ Add ships opens the variant's composer, and the batch notification offers the same batch again.",
		),
		shots(shared),
	);
	document.getElementById("variants")?.replaceChildren(...cards, common);
	const url = new URL(location.href);
	url.searchParams.set("theme", theme.value);
	history.replaceState(null, "", url);
}

const requested = new URLSearchParams(location.search).get("theme");
if (requested === "light" || requested === "dark") theme.value = requested;
theme.addEventListener("change", render);
render();
