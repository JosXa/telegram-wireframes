// Local interaction study, not game rules. All quotes and losses below are illustrative sample state.
type Mission = "Transport" | "Attack" | "Reinforce" | "Colonize" | "Collect salvage";
const root = document.querySelector<HTMLElement>("#content");
if (!root) throw new Error("Missing app content");
const content = root;
const element = <T extends HTMLElement>(selector: string) => document.querySelector(selector) as T;
const targets = [
	{ name: "Rime", coordinates: ["1", "218", "2"], detail: "yours" },
	{ name: "Ash", coordinates: ["1", "214", "8"], detail: "abandoned" },
	{ name: "Beacon", coordinates: ["1", "219", "3"], detail: "Mira, allied" },
	{ name: "Free planet", coordinates: ["1", "222", "4"], detail: "unclaimed" },
	{ name: "Salvage", coordinates: ["1", "214", "8"], detail: "collection" },
];
const targetLabel = (index: number) => {
	const item = targets[index];
	return `${item.name} · ${item.coordinates.join(":")} · ${item.detail}`;
};
let route = new URLSearchParams(location.search).get("view") || "fleets";
let mission: Mission =
	route === "attack" || route === "ally-attack"
		? "Attack"
		: route === "reinforce"
			? "Reinforce"
			: route === "salvage"
				? "Collect salvage"
				: "Transport";
let target =
	route === "ally-attack" || route === "reinforce" ? 2 : route === "attack" ? 1 : route === "salvage" ? 4 : 0;
let coordinates = [...targets[target].coordinates];
let freighters = 2;
let fighters = mission === "Attack" || mission === "Reinforce" ? 12 : 0;
let colonyShips = 0;
let cargoMinerals = mission === "Transport" ? 2000 : 0;
let cargoGas = mission === "Transport" ? 500 : 0;
let speed = 60;
let alliedConsent = false;
let availableFighters = 24,
	availableFreighters = 6,
	availableColonyShips = 1;
let minerals = 12400,
	gas = 6100;
let sent = false,
	returning = false,
	withdrawn = false;
let sentQuote: ReturnType<typeof quote> | undefined;
let sentMission: Mission = "Transport";
let sentTarget = 0;
let verification: "unknown" | "verified" | "failed" | "expired" =
	route === "verified" ? "verified" : route === "scan-failed" ? "failed" : "unknown";
type Verification = { movement: string; mission: string; ships: Record<string, number>; verifiedAt: string };
let report: Verification | undefined;
let round = 0;
let timer: ReturnType<typeof setInterval> | undefined;
const rounds = [
	{ own: 24, enemy: 8, event: "Initial forces at Ash. All defenders are stationed at the planet." },
	{ own: 22, enemy: 5, event: "Both sides fire simultaneously. Joscha loses 2 ships; defenders lose 3." },
	{ own: 20, enemy: 2, event: "Joscha loses 2 ships; defenders lose 3. Damage carries between rounds." },
	{ own: 18, enemy: 0, event: "Defenders eliminated. Joscha's 18 survivors return with cargo." },
];
const number = (value: number) => value.toLocaleString("en-GB").replaceAll(",", " ");
const resources = (m: number, g: number) => `💠 ${number(m)} · 🔥 ${number(g)}`;
const button = (text: string, to: string, primary = false) =>
	`<button type="button" data-route="${to}" ${primary ? 'class="primary"' : ""}>${text}</button>`;
function heading(title: string, subtitle: string) {
	return `<p class="eyebrow">${subtitle}</p><h1>${title}</h1>`;
}
function quote() {
	const minutes = Math.round((45 * 100) / speed);
	const travelGas = Math.round(
		(freighters * 70 + fighters * 8 + colonyShips * 140 + 110) * (speed / 100) ** 2 * 2,
	);
	const clock = (after: number) =>
		`${String(18 + Math.floor((20 + after) / 60)).padStart(2, "0")}:${String((20 + after) % 60).padStart(2, "0")}`;
	return {
		minutes,
		travelGas,
		arrival: clock(minutes),
		returnAt: clock(minutes * 2),
		capacity: freighters * 1500 + fighters * 20,
	};
}
function invalid(): string {
	if (!coordinates.every((value) => /^[1-9]\d*$/.test(value)))
		return "Enter a positive whole number for Sector, System and Orbit.";
	if (target < 0) return "No charted target at these coordinates in this preview.";
	if (freighters + fighters + colonyShips === 0) return "Select at least one ship.";
	if (fighters > availableFighters || freighters > availableFreighters || colonyShips > availableColonyShips)
		return "Only your available stationed ships can be dispatched.";
	if (mission === "Attack" && target !== 1 && target !== 2)
		return "Choose an abandoned world or another player's colony for an attack.";
	if (mission === "Reinforce" && target !== 2)
		return "Choose an allied colony for these sample reinforcements.";
	if (mission === "Transport" && target !== 0 && target !== 2)
		return "Choose a colony to receive this transport.";
	if (mission === "Colonize" && (target !== 3 || colonyShips < 1))
		return "Colonization needs a free planet and a Colony Ship.";
	if (mission === "Collect salvage" && target !== 4) return "Choose the salvage at 1:214:8.";
	if (cargoMinerals + cargoGas > quote().capacity) return "Cargo exceeds the selected ships' capacity.";
	if (cargoMinerals > minerals) return "Not enough 💠 minerals at Nacre.";
	if (cargoGas + quote().travelGas > gas) return "Not enough 🔥 gas for cargo and both travel legs.";
	return "";
}
function steps(review: boolean) {
	return `<ol class="steps"><li class="${review ? "" : "active"}">1 · Prepare</li><li class="${review ? "active" : ""}">2 · Review</li><li>3 · Dispatched</li></ol>`;
}
function renderFleets() {
	return `${heading("Fleet Command", "Nacre · 1:214:6")}
	<p class="muted">Movements you own and fleets approaching your colonies.</p>
	<h2>Incoming</h2><div class="row"><div><strong>${verification === "verified" ? "Reinforcements incoming" : "Mission unverified"}</strong><small>Mira · Beacon → Nacre</small></div>${button("20:40 ↗", "incoming")}</div>
	<h2>Your fleets</h2><div class="row"><div><strong>${returning ? "Returning transport" : "Transport"}</strong><small>${returning ? "Returning to Nacre" : "Nacre → Rime"} · 2 Resource Transports</small></div><div class="arrival">${returning ? "19:05" : "19:35"}<small>${returning ? "returning" : "outbound"}</small></div></div>
	<div class="actions">${returning ? '<button type="button" disabled>Already returning</button>' : '<button type="button" data-action="recall-review">Recall transport</button>'}</div>
	<div id="recall-review"></div>
	<div class="row"><div><strong>Returning from Ash</strong><small>18 Scout Fighters · ${resources(3200, 800)}</small></div><div class="arrival">19:10<small>returning</small></div></div>
	${sent ? `<div class="row"><div><strong>${sentMission} dispatched in this preview</strong><small>Nacre → ${targetLabel(sentTarget)}</small></div><span>${sentQuote?.arrival}</span></div>` : ""}
	${withdrawn ? '<div class="row"><div><strong>Reinforcements returning</strong><small>Your 8 Scout Fighters · Beacon → Nacre</small></div><span>19:50</span></div>' : ""}
	<div class="actions">${button("Prepare dispatch", "dispatch", true)}</div><p class="note">Times use a fixed 18:20 sample clock. Returning fleets cannot be recalled.</p>`;
}
function renderStationed() {
	return `${heading("Stationed ships", "Ownership stays with the sender")}
	<h2>Nacre · 1:214:6 · your colony</h2>
	<div class="row"><div><strong>Your ships</strong><small>${availableFighters} Scout Fighters · ${availableFreighters} Resource Transports<br>${availableColonyShips} Colony Ship</small></div></div>
	<div class="actions">${button("Dispatch your ships", "dispatch", true)}</div>
	<div class="row"><div><strong>Mira's reinforcements</strong><small>12 Scout Fighters · stationed at Nacre</small></div><span class="muted">Mira owns them</span></div>
	<p class="note">These ships defend Nacre. Only Mira can withdraw or command them.</p>
	<h2>Beacon · 1:219:3 · Mira's colony</h2><div class="row"><div><strong>Your reinforcements</strong><small>${withdrawn ? "8 Scout Fighters returning to Nacre" : "8 Scout Fighters · stationed at Beacon"}</small></div></div>
	<div class="actions"><button type="button" data-action="withdraw-review" ${withdrawn ? "disabled" : ""}>${withdrawn ? "Withdrawal started" : "Withdraw your 8 ships"}</button></div><div id="withdraw-review"></div>`;
}
function renderDispatch() {
	return `${heading("Prepare dispatch", "Your ships leave when you confirm")}${steps(false)}
	<p>Nacre · 1:214:6<br><span class="muted">${resources(minerals, gas)}</span></p>
	<form id="dispatch-form"><fieldset><legend>Target and mission</legend>
	<label>Find target<select name="target"><option value="" ${target < 0 ? "selected" : ""}>Enter coordinates below</option>${targets.map((_, i) => `<option value="${i}" ${i === target ? "selected" : ""}>${targetLabel(i)}</option>`).join("")}</select></label>
	<div class="coordinates" role="group" aria-label="Target coordinates">${["Sector", "System", "Orbit"].map((label, index) => `<label>${label}<input type="text" inputmode="numeric" pattern="[1-9][0-9]*" name="${label.toLowerCase()}" value="${coordinates[index].replaceAll("&", "&amp;").replaceAll('"', "&quot;")}" required autocomplete="off"></label>`).join('<span class="coordinate-separator" aria-hidden="true">:</span>')}</div>
	<p class="note">Sector : System : Orbit · Choose a target to fill all three coordinates, or enter them directly.</p>
	<label>Mission<select name="mission">${(["Transport", "Attack", "Reinforce", "Colonize", "Collect salvage"] as Mission[]).map((name) => `<option ${mission === name ? "selected" : ""}>${name}</option>`).join("")}</select></label></fieldset>
	<fieldset><legend>Owned ships at Nacre</legend>
	<label class="row"><span>Resource Transport<small>${availableFreighters} available · cargo 1 500 each</small></span><input name="freighters" aria-label="Resource Transports" type="number" min="0" max="${availableFreighters}" step="1" value="${freighters}" required></label>
	<label class="row"><span>Scout Fighter<small>${availableFighters} available · fast, fragile</small></span><input name="fighters" aria-label="Scout Fighters" type="number" min="0" max="${availableFighters}" step="1" value="${fighters}" required></label>
	<label class="row"><span>Colony Ship<small>${availableColonyShips} completed · expansion sample</small></span><input name="colonies" aria-label="Colony Ships" type="number" min="0" max="${availableColonyShips}" step="1" value="${colonyShips}" required></label>
	<p class="note">Mira's 12 stationed ships belong to Mira and are not selectable.</p></fieldset>
	<fieldset><legend>Cargo</legend><div class="pair"><label>💠 Minerals<input name="minerals" type="number" min="0" max="${minerals}" step="1" value="${cargoMinerals}" required></label><label>🔥 Gas<input name="gas" type="number" min="0" max="${gas}" step="1" value="${cargoGas}" required></label></div></fieldset>
	<fieldset><legend>Arrival time</legend><label>Travel speed <output id="speed-label">${speed}%</output><input name="speed" type="range" min="30" max="100" step="5" value="${speed}"></label><p class="note">Slower uses less gas. Departure is immediate; there is no scheduled departure. Bounds and prices are illustrative.</p></fieldset>
	<div id="quote" class="quote" aria-live="polite"></div>
	<p id="dispatch-error" class="error" role="status"></p><div class="actions"><button class="primary" type="submit" id="review-dispatch">Review dispatch</button></div></form>`;
}
function updateQuote() {
	const q = quote();
	const node = document.querySelector("#quote");
	if (node)
		node.innerHTML = `<dl><dt>Arrival</dt><dd>${q.arrival} · ${q.minutes} min</dd><dt>Return estimate</dt><dd>${mission === "Reinforce" ? "When you withdraw" : mission === "Colonize" ? "Colony founded on arrival" : q.returnAt}</dd><dt>Travel gas · both legs reserved</dt><dd>🔥 ${number(q.travelGas)}</dd><dt>Cargo used / available</dt><dd>${number(cargoMinerals + cargoGas)} / ${number(q.capacity)}</dd></dl>`;
	const error = document.querySelector("#dispatch-error");
	if (error) error.textContent = invalid();
	const review = document.querySelector<HTMLButtonElement>("#review-dispatch");
	if (review) review.disabled = Boolean(invalid());
	renderEmoji();
}
function renderConfirm() {
	const q = quote();
	const alliedAttack = mission === "Attack" && target === 2;
	return `${heading("Review dispatch", "Nacre · 1:214:6")}${steps(true)}
	<dl><dt>Mission</dt><dd>${mission}</dd><dt>Target</dt><dd>${targetLabel(target)}</dd><dt>Scout Fighters</dt><dd>${fighters}</dd><dt>Resource Transports</dt><dd>${freighters}</dd><dt>Colony Ships</dt><dd>${colonyShips}</dd><dt>Cargo</dt><dd>${resources(cargoMinerals, cargoGas)}</dd><dt>Arrival</dt><dd>${q.arrival} · ${q.minutes} min</dd><dt>Travel gas reserved</dt><dd>🔥 ${number(q.travelGas)}</dd><dt>Remaining at Nacre</dt><dd>${resources(minerals - cargoMinerals, gas - cargoGas - q.travelGas)}</dd></dl>
	${alliedAttack ? `<section class="notice"><h2>Attack your ally?</h2><p>Beacon belongs to Mira, a member of your alliance. This fleet will attack.</p><label><input type="checkbox" id="allied-consent" ${alliedConsent ? "checked" : ""}>I intend to attack Mira</label></section>` : ""}
	<p class="note">Sample quote. A real dispatch is quoted and validated by the server. The fleet leaves immediately and its arrival time is fixed.</p>
	<p class="error">${invalid()}</p><div class="actions">${button("Edit", "dispatch")}<button type="button" id="confirm-dispatch" class="primary" data-action="dispatch" ${invalid() || (alliedAttack && !alliedConsent) ? "disabled" : ""}>Dispatch now</button></div>`;
}
function renderDispatched() {
	const q = sentQuote || quote();
	return `${heading("Fleet dispatched", "Local preview complete")}
	<div class="notice"><strong>${sent ? sentMission : "Transport"} · outbound</strong><p>Nacre 1:214:6 → ${targetLabel(sent ? sentTarget : 0)}<br>Arrival ${q.arrival}</p></div>
	<p>Ships and cargo have left Nacre. Travel gas is reserved for both legs.</p><p>${resources(minerals, gas)} remaining at Nacre</p>
	<div class="actions">${button("Fleet movements", "fleets", true)}${button("Stationed ships", "stationed")}</div>`;
}
function renderIncoming() {
	return `${heading(verification === "verified" ? "Reinforcements incoming" : "Incoming fleet", "Mira · member of Meridian")}
	<dl><dt>Origin</dt><dd>Beacon · 1:219:3</dd><dt>Target</dt><dd>Nacre · 1:214:6</dd><dt>Arrival</dt><dd>20:40 · 2h 20m</dd></dl>
	${
		verification === "verified" && report
			? `<div class="notice"><strong>👁 Mission verified at ${report.verifiedAt}</strong><p>${report.mission} · ${Object.entries(
					report.ships,
				)
					.map(([name, count]) => `${count} ${name}`)
					.join(", ")}<br>Cargo unknown</p><p class="note">Valid only for this movement leg.</p></div>`
			: verification === "expired"
				? '<div class="notice"><strong>Historical report</strong><p>The original movement was recalled. Its reinforcement verification cannot verify the new leg.</p><p>Current mission and ship composition unknown.</p></div>'
				: `<div class="notice"><strong>Mission unverified</strong><p>Ship composition and cargo unknown.</p><p class="note">${verification === "failed" ? "The investigation revealed no new information." : "Alliance membership does not verify a friendly mission."}</p></div>`
	}
	${verification === "unknown" || verification === "failed" ? '<div class="actions"><button type="button" class="primary" data-action="scan-success">Investigate · sample success</button><button type="button" data-action="scan-failure">Sample failure</button></div>' : ""}
	${verification === "verified" ? '<button type="button" data-action="expire">Preview recall / verification expiry</button>' : ""}
	<p class="note">Investigation availability and outcomes are sample states. Drone operation, range and success rates remain under design.</p>
	<div class="actions">${button("Stationed defenders", "stationed")}${button("All movements", "fleets")}</div>`;
}
function renderReplay() {
	const step = rounds[round];
	const ships = (count: number) =>
		`<div class="ships" aria-hidden="true">${Array.from({ length: count }, () => '<svg viewBox="0 0 16 20"><path d="M8 1 14 17 8 13 2 17Z" fill="currentColor"/></svg>').join("")}</div>`;
	return `${heading("Battle Replay", "Ash · 1:214:8 · 10 Oct · 18:04")}
	<p class="muted">Recorded outcome · ${round ? `Round ${round} of 3` : "Initial forces"}</p>
	<div class="battle"><div><small>JOSCHA · ATTACKER</small><strong>${step.own}</strong>${ships(step.own)}<small>Scout Fighters</small></div><span>⚔</span><div class="opponent"><small>DEFENDERS</small><strong>${step.enemy}</strong>${ships(step.enemy)}<small>Scout Fighters</small></div></div>
	<label>Round <output>${round}</output><input type="range" id="round" min="0" max="3" step="1" value="${round}"></label>
	<div class="actions"><button type="button" data-action="replay-start">↤ Start</button><button type="button" data-action="replay-toggle" class="primary">${timer ? "Pause" : round === 3 ? "Play again" : "Play"}</button><button type="button" data-action="replay-next" ${round === 3 ? "disabled" : ""}>Next round →</button></div>
	<p class="notice" aria-live="polite">${step.event}</p>
	${round === 3 ? `<dl><dt>Your losses</dt><dd>6 Scout Fighters</dd><dt>Cargo taken</dt><dd>${resources(3200, 800)}</dd><dt>Salvage at 1:214:8</dt><dd>${resources(840, 210)}</dd></dl><p>Salvage requires a separate collection mission.</p>${button("Prepare salvage collection", "salvage")}` : ""}
	<p class="note">Sample losses illustrate the replay. Playback speed does not set the proposed live battle window.</p>`;
}
function renderEmoji() {
	// Match Telegram's resource glyph artwork, rather than the operating system's emoji font.
	const walker = document.createTreeWalker(content, NodeFilter.SHOW_TEXT);
	const nodes: Text[] = [];
	while (walker.nextNode())
		if (/[💠🔥]/u.test(walker.currentNode.textContent || "")) nodes.push(walker.currentNode as Text);
	for (const node of nodes) {
		const fragment = document.createDocumentFragment();
		for (const part of node.data.split(/(💠|🔥)/u)) {
			if (part === "💠" || part === "🔥") {
				const img = document.createElement("img");
				img.className = "telegram-emoji";
				img.alt = part;
				img.src = `/img-apple-64/${part.codePointAt(0)?.toString(16)}.png`;
				fragment.append(img);
			} else fragment.append(part);
		}
		node.replaceWith(fragment);
	}
}
function render() {
	content.innerHTML =
		route === "stationed"
			? renderStationed()
			: route === "dispatch"
				? renderDispatch()
				: route === "confirm"
					? renderConfirm()
					: route === "dispatched"
						? renderDispatched()
						: route === "incoming"
							? renderIncoming()
							: route === "replay"
								? renderReplay()
								: renderFleets();
	for (const node of document.querySelectorAll<HTMLButtonElement>("nav [data-route]"))
		node.setAttribute("aria-current", node.dataset.route === route ? "page" : "false");
	element(".warning").innerHTML =
		`${verification === "verified" ? "🛡 Reinforcements incoming" : "⚠ Incoming fleet"} · Nacre 1:214:6 <span>20:40 →</span>`;
	updateQuote();
	document.body.dataset.ready = "true";
}
function go(next: string) {
	if (timer) {
		clearInterval(timer);
		timer = undefined;
	}
	if (next === "salvage") {
		mission = "Collect salvage";
		target = 4;
		coordinates = [...targets[target].coordinates];
		cargoMinerals = cargoGas = 0;
		next = "dispatch";
	}
	route = next;
	const url = new URL(location.href);
	url.searchParams.set("view", route);
	history.replaceState(null, "", url);
	render();
	window.scrollTo(0, 0);
}
function dispatch() {
	sentQuote = quote();
	sentMission = mission;
	sentTarget = target;
	minerals -= cargoMinerals;
	gas -= cargoGas + sentQuote.travelGas;
	availableFighters -= fighters;
	availableFreighters -= freighters;
	availableColonyShips -= colonyShips;
	sent = true;
}
document.addEventListener("click", async (event) => {
	const node = (event.target as Element).closest<HTMLButtonElement>("button");
	if (!node || node.disabled) return;
	if (node.dataset.route) return go(node.dataset.route);
	switch (node.dataset.action) {
		case "recall-review":
			element("#recall-review").innerHTML =
				'<section class="notice"><strong>Recall this outbound transport?</strong><p>It returns to Nacre. No travel gas is returned in this sample default.</p><button type="button" data-action="recall">Confirm recall</button></section>';
			break;
		case "recall":
			returning = true;
			render();
			break;
		case "withdraw-review":
			element("#withdraw-review").innerHTML =
				'<section class="notice"><strong>Withdraw your 8 ships from Beacon?</strong><p>They return to Nacre and stop defending Beacon.</p><button type="button" data-action="withdraw">Confirm withdrawal</button></section>';
			break;
		case "withdraw":
			withdrawn = true;
			render();
			break;
		case "dispatch":
			if (invalid() || (mission === "Attack" && target === 2 && !alliedConsent)) return;
			dispatch();
			go("dispatched");
			break;
		case "scan-success": {
			node.disabled = true;
			node.textContent = "Investigating…";
			try {
				const response = await fetch("verification.json");
				if (!response.ok) throw new Error("Investigation unavailable");
				report = (await response.json()) as Verification;
				verification = "verified";
			} catch {
				verification = "failed";
			}
			render();
			break;
		}
		case "scan-failure":
			verification = "failed";
			render();
			break;
		case "expire":
			verification = "expired";
			render();
			break;
		case "replay-start":
			if (timer) clearInterval(timer);
			timer = undefined;
			round = 0;
			render();
			break;
		case "replay-next":
			round = Math.min(3, round + 1);
			render();
			break;
		case "replay-toggle":
			if (timer) {
				clearInterval(timer);
				timer = undefined;
			} else {
				if (round === 3) round = 0;
				timer = setInterval(() => {
					round = Math.min(3, round + 1);
					if (round === 3) {
						clearInterval(timer);
						timer = undefined;
					}
					render();
				}, 1100);
			}
			render();
			break;
	}
});
document.addEventListener("input", (event) => {
	const input = event.target as HTMLInputElement;
	if (input.id === "round") {
		if (timer) clearInterval(timer);
		timer = undefined;
		round = Number(input.value);
		render();
		return;
	}
	if (input.id === "allied-consent") {
		alliedConsent = input.checked;
		element<HTMLButtonElement>("#confirm-dispatch").disabled = !alliedConsent || Boolean(invalid());
		return;
	}
	const form = document.querySelector<HTMLFormElement>("#dispatch-form");
	if (!form) return;
	const data = new FormData(form);
	mission = String(data.get("mission")) as Mission;
	if (input.name === "target" && input.value !== "") {
		const selected = Number(input.value);
		coordinates = [...targets[selected].coordinates];
		form.querySelectorAll<HTMLInputElement>(".coordinates input").forEach((input, index) => {
			input.value = coordinates[index];
		});
		if (selected === 4) {
			mission = "Collect salvage";
			(form.querySelector('[name="mission"]') as HTMLSelectElement).value = mission;
		}
	} else coordinates = ["sector", "system", "orbit"].map((name) => String(data.get(name)));
	// Typed coordinates are authoritative; the suggestion must not retain a different target.
	target = targets.findIndex(
		(item, index) =>
			item.coordinates.every((value, part) => value === coordinates[part]) &&
			(mission === "Collect salvage" ? index !== 1 : index !== 4),
	);
	(form.querySelector('[name="target"]') as HTMLSelectElement).value = target < 0 ? "" : String(target);
	freighters = Number(data.get("freighters"));
	fighters = Number(data.get("fighters"));
	colonyShips = Number(data.get("colonies"));
	cargoMinerals = Number(data.get("minerals"));
	cargoGas = Number(data.get("gas"));
	speed = Number(data.get("speed"));
	alliedConsent = false;
	element("#speed-label").textContent = `${speed}%`;
	updateQuote();
});
document.addEventListener("submit", (event) => {
	event.preventDefault();
	if (!invalid()) go("confirm");
});
if (route === "ally-attack") route = "confirm";
if (["verified", "scan-failed"].includes(route)) route = "incoming";
if (["attack", "reinforce", "salvage"].includes(route)) route = "dispatch";
if (route === "dispatched") dispatch();
if (verification === "verified") {
	try {
		const response = await fetch("verification.json");
		if (!response.ok) throw new Error("Sample report unavailable");
		report = (await response.json()) as Verification;
	} catch {
		verification = "failed";
	}
}
render();
if (window.parent !== window) {
	for (const eventType of ["web_app_ready", "web_app_expand"])
		window.parent.postMessage(JSON.stringify({ eventType, eventData: {} }), location.origin);
}

export {};
