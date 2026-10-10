import { admirals, beats, styles } from "./journey";

const query = new URLSearchParams(location.search);
const person = admirals.find((item) => item.id === query.get("admiral")) || admirals[0];
const style = styles.find((item) => item.id === query.get("style")) || styles[0];
const mode = query.get("mode") || "art";
let stage =
	query.get("view") === "review" ? "review" : query.get("view") === "incoming" ? "incoming" : "prepare";
let count = 6,
	speed = 100;
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
	if (mode === "plain") return "";
	const beat = beats.find(
		(item) => item.id === (stage === "incoming" ? "incoming" : stage === "sent" ? "departed" : "review"),
	);
	if (!beat) throw new Error("Missing guidance");
	return `<section class="guide ${mode === "art" ? "" : "text-only"}">${mode === "art" ? `<img src="art/${style.id}-${person.id}-${beat.art}.jpg" alt="Admiral ${person.name}">` : ""}<div><strong>Admiral ${person.name}</strong><p>${beat.lines[person.id]}</p></div></section>`;
}
function render() {
	const q = quote();
	const title =
		stage === "incoming"
			? "Incoming fleet"
			: stage === "sent"
				? "Fleet dispatched"
				: stage === "review"
					? "Review dispatch"
					: "Prepare your first fleet";
	content.innerHTML = `<p class="eyebrow">Nacre · 214:6</p><h1>${title}</h1>${guide()}${
		stage === "incoming"
			? `
		<div class="notice"><strong>⚠ Mission unverified</strong><p>Mira · Beacon 219:3 → Nacre 214:6<br>Arrival: 20:40</p><p>Ship composition and cargo unknown.</p></div><p class="note">Alliance membership does not establish a friendly mission. Investigation rules remain under design.</p>`
			: stage === "sent"
				? `
		<p class="receipt">✓ ${count} Scout Fighters are outbound</p><div class="route"><strong>Nacre 214:6 → Ash 214:8</strong><span>Attack · Arrival ${q.arrival}</span></div><p>Travel gas reserved: ${gas(q.gas)}</p><p>Your colony keeps producing. You can return to Telegram while the fleet travels.</p>`
				: `
		<div class="route"><span class="muted">Attack mission</span><strong>Nacre 214:6 → Ash 214:8</strong><span class="note">Abandoned world · home system</span></div>
		${stage === "prepare" ? `<form id="fleet-form"><label>Scout Fighters · 6 available<input name="count" type="number" min="1" max="6" step="1" value="${count}" required></label><label>Travel speed <output id="speed-value">${speed}%</output><input type="range" name="speed" min="50" max="100" step="10" value="${speed}"></label><p class="note">A slower arrival uses less gas. Departure is immediate when you confirm.</p><div id="quote"></div><div class="actions"><button type="submit" class="primary">Review dispatch</button></div></form>` : `<dl><dt>Ships</dt><dd>${count} Scout Fighters</dd><dt>Travel time</dt><dd>${q.minutes} min</dd><dt>Arrival</dt><dd>${q.arrival}</dd><dt>Travel gas · both legs</dt><dd>${gas(q.gas)}</dd></dl><p>Ships leave immediately. Their arrival time is fixed after dispatch.</p><div class="actions"><button type="button" data-action="edit">Edit</button><button type="button" class="primary" data-action="send">Dispatch now</button></div>`}`
	}
		<p class="note">Local wireframe · fixed 18:20 sample clock · illustrative balance.</p>`;
	updateQuote();
	document.body.dataset.ready = "true";
}
function updateQuote() {
	const node = document.querySelector("#quote");
	if (node) {
		const q = quote();
		node.innerHTML = `<dl><dt>Arrival</dt><dd>${q.arrival} · ${q.minutes} min</dd><dt>Travel gas reserved</dt><dd>${gas(q.gas)}</dd></dl>`;
	}
}
document.addEventListener("input", () => {
	const form = document.querySelector<HTMLFormElement>("#fleet-form");
	if (!form) return;
	const data = new FormData(form);
	count = Number(data.get("count"));
	speed = Number(data.get("speed"));
	(document.querySelector("#speed-value") as HTMLElement).textContent = `${speed}%`;
	updateQuote();
});
document.addEventListener("submit", (event) => {
	event.preventDefault();
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
