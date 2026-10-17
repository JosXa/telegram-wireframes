import { admirals, beats, format, styles, words } from "./journey";

const copy = words.miniApp;
document.title = words.appTitle;
(document.querySelector("#brand") as HTMLElement).textContent = words.game;
(document.querySelector("#badge") as HTMLElement).textContent = words.appBadge;

const query = new URLSearchParams(location.search);
const person = admirals.find((item) => item.id === query.get("admiral")) || admirals[0];
const style = styles.find((item) => item.id === query.get("style")) || styles[0];
const mode = query.get("mode") || "art";
let stage =
	query.get("view") === "review" ? "review" : query.get("view") === "incoming" ? "incoming" : "prepare";
let count = 6,
	speed = 100;
const coordinateNames = ["sector", "system", "orbit"] as const;
let coordinates = ["1", "214", "8"];
const validCoordinates = () => coordinates.join(":") === "1:214:8";
const content = document.querySelector("#content") as HTMLElement;
const icon = (emoji: string, code: string) =>
	`<img class="resource" src="/img-apple-64/${code}.png" alt="${emoji}">`;
const gas = (amount: number) => `${icon("🔥", "1f525")} ${amount}`;
const quote = () => {
	const minutes = Math.round((45 * 100) / speed);
	return {
		minutes,
		gas: Math.round(80 * (count / 6) * (speed / 100) ** 2),
		arrival: `${18 + Math.floor((20 + minutes) / 60)}:${String((20 + minutes) % 60).padStart(2, "0")}`,
	};
};
function guide() {
	if (stage === "sent") return "";
	const beat = beats.find((item) => item.id === (stage === "incoming" ? "incoming" : "review"));
	if (!beat) throw new Error("Missing guidance");
	const name = format(words.admiral, { name: person.name });
	return `<section class="guide ${mode === "art" ? "" : "text-only"}">${mode === "art" ? `<img src="art/${style.id}-${person.id}-${beat.art}.jpg" alt="${name}">` : ""}<div><p>${beat.lines[person.id]}</p></div></section>`;
}
function render() {
	const q = quote();
	const title =
		stage === "incoming"
			? copy.incoming
			: stage === "sent"
				? copy.sent
				: stage === "review"
					? copy.review
					: copy.prepare;
	content.innerHTML = `<p class="eyebrow">${words.origin}</p><h1>${title}</h1>${guide()}${
		stage === "incoming"
			? `
		<div class="notice"><strong>${copy.unknown}</strong><p>${copy.incomingRoute}<br>${copy.incomingTime}</p><p>${copy.unknownCargo}</p></div><p class="note">${copy.investigationNote}</p>`
			: stage === "sent"
				? `
		<p class="receipt">${format(copy.outbound, { count })}</p><div class="route"><strong>${copy.route}</strong><span>${format(copy.attackArrival, { arrival: q.arrival })}</span></div><p>${copy.reservedGas}: ${gas(q.gas)}</p><p>${copy.sentNote}</p>`
				: `
		<div class="route"><span class="muted">${copy.attackMission}</span><strong>${copy.route}</strong><span class="note">${copy.abandoned}</span></div>
		${stage === "prepare" ? `<form id="fleet-form"><label>${copy.availableShips}<input name="count" type="number" min="1" max="6" step="1" value="${count}" required></label><label>${copy.speed} <output id="speed-value">${speed}%</output><input type="range" name="speed" min="50" max="100" step="10" value="${speed}"></label><p class="note">${copy.slowerNote}</p><div id="quote"></div><div class="actions"><button type="submit" class="primary">${copy.review}</button></div></form>` : `<dl><dt>${copy.ships}</dt><dd>${format(copy.shipCount, { count })}</dd><dt>${copy.travelTime}</dt><dd>${format(copy.minutes, { minutes: q.minutes })}</dd><dt>${copy.arrival}</dt><dd>${q.arrival}</dd><dt>${copy.bothLegs}</dt><dd>${gas(q.gas)}</dd></dl><p>${copy.departureNote}</p><div class="actions"><button type="button" data-action="edit">${copy.edit}</button><button type="button" class="primary" data-action="send">${copy.dispatch}</button></div>`}`
	}
		<p class="note">${copy.sampleNote}</p>`;
	const form = document.querySelector("#fleet-form");
	if (form) {
		form.insertAdjacentHTML(
			"afterbegin",
			`<fieldset><legend>${copy.targetCoordinates}</legend><div class="coordinates">${coordinateNames.map((name) => `<label>${copy[name]}<input type="text" inputmode="numeric" pattern="[1-9][0-9]*" name="${name}" required autocomplete="off"></label>`).join('<span class="coordinate-separator" aria-hidden="true">:</span>')}</div><p class="note">${copy.coordinateNote}</p><p id="coordinate-error" class="error" role="status"></p></fieldset>`,
		);
		form.querySelectorAll<HTMLInputElement>(".coordinates input").forEach((input, index) => {
			input.value = coordinates[index];
		});
	}
	updateQuote();
	document.body.dataset.ready = "true";
}
function updateQuote() {
	const error = document.querySelector("#coordinate-error");
	if (error) error.textContent = validCoordinates() ? "" : copy.coordinateError;
	const review = document.querySelector<HTMLButtonElement>('#fleet-form button[type="submit"]');
	if (review) review.disabled = !validCoordinates();
	const node = document.querySelector("#quote");
	if (node) {
		const q = quote();
		node.innerHTML = `<dl><dt>${copy.arrival}</dt><dd>${q.arrival} · ${format(copy.minutes, { minutes: q.minutes })}</dd><dt>${copy.reservedGas}</dt><dd>${gas(q.gas)}</dd></dl>`;
	}
}
document.addEventListener("input", () => {
	const form = document.querySelector<HTMLFormElement>("#fleet-form");
	if (!form) return;
	const data = new FormData(form);
	coordinates = coordinateNames.map((name) => String(data.get(name)));
	count = Number(data.get("count"));
	speed = Number(data.get("speed"));
	(document.querySelector("#speed-value") as HTMLElement).textContent = `${speed}%`;
	updateQuote();
});
document.addEventListener("submit", (event) => {
	event.preventDefault();
	if (!validCoordinates()) return;
	stage = "review";
	render();
});
document.addEventListener("click", (event) => {
	const button = (event.target as Element).closest<HTMLButtonElement>("[data-action]");
	if (!button) return;
	stage = button.dataset.action === "edit" ? "prepare" : "sent";
	render();
	window.scrollTo(0, 0);
});
render();
if (window.parent !== window)
	for (const eventType of ["web_app_ready", "web_app_expand"])
		window.parent.postMessage(JSON.stringify({ eventType, eventData: {} }), location.origin);
