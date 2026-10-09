// Throwaway map study: galaxy, four-planet frontier and eight-planet empire on one route.
// ?variant=galaxy|young|developed selects the scene. All traffic and settlements are sample state.
const NS = "http://www.w3.org/2000/svg";
const $ = (selector) => document.querySelector(selector);
const svg = $("#galaxy");
const world = $("#world");
const reducedMotion = matchMedia("(prefers-reduced-motion: reduce)");
const biomes = {
	tropical: { label: "Tropical", icon: "🏝", sea: "#245c82", land: "#70ad83", light: "#afd6ac" },
	snowy: { label: "Snowy", icon: "🏔", sea: "#759bb4", land: "#c8e3e5", light: "#e2edf0" },
	volcanic: { label: "Volcanic", icon: "🌋", sea: "#442a33", land: "#bb553c", light: "#faad61" },
	wasteland: { label: "Wasteland", icon: "🏜", sea: "#9a7556", land: "#c9a878", light: "#edcd92" },
	mountainous: { label: "Mountainous", icon: "⛰", sea: "#5d626d", land: "#a2a298", light: "#d6c9ac" },
};
const systems = [
	{
		id: 14,
		name: "Solara",
		q: 0,
		r: 0,
		owner: "own",
		count: 4,
		settled: 2,
		variant: "young",
		type: "G2 · Yellow dwarf",
	},
	{
		id: 28,
		name: "Aurelia",
		q: 6,
		r: -5,
		owner: "own",
		count: 8,
		settled: 8,
		variant: "developed",
		type: "F5 · White-gold star",
	},
	{ id: 13, name: "Antares", q: -7, r: 1, owner: "rival", count: 6, settled: 3, type: "K4 · Orange dwarf" },
	{ id: 18, name: "Merope", q: 0, r: 1, owner: "open", count: 5, settled: 0, type: "B6 · Blue star" },
	{ id: 19, name: "Altair", q: 1, r: 0, owner: "open", count: 7, settled: 0, type: "A7 · White star" },
	{ id: 12, name: "Lacaille", q: -2, r: -1, owner: "open", count: 4, settled: 0, type: "M2 · Red dwarf" },
	{ id: 17, name: "Nivalis", q: 7, r: 0, owner: "rival", count: 8, settled: 5, type: "K1 · Orange dwarf" },
	{ id: 62, name: "Aster", q: -5, r: -3, owner: "other", count: 6, settled: 1, type: "K7 · Orange dwarf" },
];
const galaxyRandom = random(9102);
for (let q = -10; q <= 10; q++)
	for (let r = -10; r <= 10; r++) {
		if (
			Math.max(Math.abs(q), Math.abs(r), Math.abs(q + r)) > 10 ||
			Math.max(Math.abs(q), Math.abs(r)) < 2 ||
			systems.some((s) => s.q === q && s.r === r) ||
			galaxyRandom() > 0.13
		)
			continue;
		const id = 100 + systems.length;
		systems.push({
			id,
			name: `${["Eridani", "Carina", "Lyra", "Cygni", "Velorum"][id % 5]} ${id}`,
			q,
			r,
			owner: "open",
			count: 4 + (id % 5),
			settled: 0,
			type: "Unclaimed system",
		});
	}
const scenes = {
	young: {
		name: "Solara",
		id: 14,
		subtitle: "FIRST COLONIES · SYSTEM 14",
		ships: [12, 4, 0, 0],
		names: ["Vega", "Kepler", "Cinder", "Dune"],
		biomes: ["tropical", "snowy", "volcanic", "wasteland"],
		angles: [-80, 20, 155, 265],
		minerals: 1240,
		gas: 610,
	},
	developed: {
		name: "Aurelia",
		id: 28,
		subtitle: "HIGH EMPIRE · SYSTEM 28",
		ships: [384, 216, 192, 408, 156, 288, 320, 144],
		names: ["Crown", "Pelagos", "Borealis", "Forge", "Bastion", "Saffron", "Rime", "Haven"],
		biomes: ["tropical", "tropical", "snowy", "volcanic", "mountainous", "wasteland", "snowy", "tropical"],
		angles: [-95, 25, 150, 265, 45, 185, 300, 90],
		minerals: 842600,
		gas: 216480,
	},
};
let view = "galaxy";
let selected;
let planets = [];
let fleets = [];
let patrols = [];
let markers = [];
let camera = { x: 0, y: 0, scale: 1 };
let width = 420;
let height = 520;
let lastSecond = -1;
const scenarioTime = Date.now();
const movementState = new Map();
let activeFleet;
let cameraReady = false;
const shipTypes = {
	heavy: { name: "Heavy warship", symbol: "heavy-sprite", width: 38, height: 22 },
	freighter: { name: "Small freighter", symbol: "freighter-sprite", width: 28, height: 18 },
	fighter: { name: "Light Fighter", symbol: "ship-sprite", width: 20, height: 14 },
};

function element(tag, attrs, parent, text) {
	const node = document.createElementNS(NS, tag);
	for (const [key, value] of Object.entries(attrs)) node.setAttribute(key, String(value));
	if (text !== undefined) node.textContent = text;
	parent.append(node);
	return node;
}
function random(seed) {
	let value = seed;
	return () => {
		value = (value * 1664525 + 1013904223) >>> 0;
		return value / 4294967296;
	};
}
function bindSelect(node, action) {
	node.addEventListener("click", action);
	node.addEventListener("keydown", (event) => {
		if (event.key === "Enter" || event.key === " ") {
			event.preventDefault();
			action();
		}
	});
}
function sky() {
	const root = $("#backdrop");
	root.replaceChildren();
	const rand = random(581);
	const nebula = element("g", { opacity: view === "galaxy" ? 1 : 0.42 }, root);
	for (let i = 0; i < 14; i++) {
		element(
			"ellipse",
			{
				cx: width * (0.1 + rand() * 0.9),
				cy: height * rand(),
				rx: width * (0.35 + rand() * 0.5),
				ry: height * (0.08 + rand() * 0.25),
				transform: `rotate(-32 ${width / 2} ${height / 2})`,
				fill: `url(#nebula-${i % 3 ? "blue" : "rose"})`,
				filter: i % 2 ? "url(#dust)" : "none",
			},
			nebula,
		);
	}
	for (let i = 0; i < 330; i++) {
		const x = rand() * width,
			y = rand() * height,
			size = rand();
		element(
			"circle",
			{
				cx: x,
				cy: y,
				r: size > 0.96 ? 1.25 : 0.25 + size * 0.5,
				fill: i % 4 ? "#bfccd9" : "#e5c39a",
				opacity: 0.12 + rand() * 0.6,
			},
			root,
		);
		if (size > 0.988)
			element(
				"path",
				{ d: `M${x - 4},${y}h8 M${x},${y - 4}v8`, stroke: "#b7d4e8", "stroke-width": 0.45, opacity: 0.6 },
				root,
			);
	}
}
function addStar(x, y, radius, parent, blue = false) {
	const g = element("g", { transform: `translate(${x} ${y})` }, parent);
	element("circle", { r: radius * 4.5, fill: "url(#sun-halo)", opacity: blue ? 0.5 : 1 }, g);
	element(
		"circle",
		{ r: radius * 1.16, fill: blue ? "#a2d8fa" : "#f4ad50", opacity: 0.35, filter: "url(#glow)" },
		g,
	);
	element("circle", { r: radius, fill: blue ? "#d0eafa" : "url(#sun)" }, g);
	const rand = random(34);
	for (let i = 0; i < 24; i++) {
		const a = rand() * Math.PI * 2,
			r = rand() * radius * 0.8;
		element(
			"circle",
			{
				cx: Math.cos(a) * r,
				cy: Math.sin(a) * r,
				r: radius * (0.01 + rand() * 0.07),
				fill: "#d68432",
				opacity: 0.22,
			},
			g,
		);
	}
	return g;
}
function galaxy() {
	const size = 146;
	for (let q = -10; q <= 10; q++)
		for (let r = -10; r <= 10; r++) {
			if (Math.max(Math.abs(q), Math.abs(r), Math.abs(q + r)) > 10) continue;
			const x = size * 1.5 * q,
				y = size * Math.sqrt(3) * (r + q / 2);
			const points = Array.from(
				{ length: 6 },
				(_, i) => `${x + Math.cos((i * Math.PI) / 3) * size},${y + Math.sin((i * Math.PI) / 3) * size}`,
			).join(" ");
			const system = systems.find((s) => s.q === q && s.r === r);
			element("polygon", { points, class: `cell${system?.owner === "own" ? " owned" : ""}` }, $("#cells"));
		}
	for (const system of systems) {
		const jitter = random(system.id * 1987);
		system.x = size * 1.5 * system.q + (system.id === 14 ? 0 : (jitter() - 0.5) * 48);
		system.y =
			size * Math.sqrt(3) * (system.r + system.q / 2) + (system.id === 14 ? 0 : (jitter() - 0.5) * 48);
		const group = element(
			"g",
			{
				class: `system ${system.owner}`,
				role: "button",
				tabindex: 0,
				"aria-label": `${system.name}, system ${system.id}, ${system.count} planets`,
				"data-system": system.id,
			},
			$("#planets"),
		);
		const art = element("g", { class: "map-art" }, group);
		markers.push({ node: group, item: system, art });
		addStar(0, 0, system.id === 28 ? 10 : 7, art, system.id === 18);
		element("circle", { r: 23, class: "ownership-ring" }, art);
		element("circle", { r: 28, class: "selected-ring" }, art);
		element("text", { x: 0, y: 43, "text-anchor": "middle", class: "planet-label" }, group, system.name);
		element(
			"text",
			{ x: 0, y: 57, "text-anchor": "middle", class: "coordinate" },
			group,
			`${system.id} · ${system.count} worlds${system.owner === "own" ? " · YOURS" : ""}`,
		);
		element("circle", { r: 32, fill: "transparent", class: "planet-hitbox" }, group);
		bindSelect(group, () => selectSystem(system));
	}
	addFleet(systems[0], systems[1], 0, "💠 240", 10 * 3600000);
	addFleet(systems[1], systems[0], 1, "🔥 80", 70 * 60000);
	addIncoming(systems[0]);
	selectSystem(systems[0]);
}
function station(parent, advanced) {
	const g = element("g", { transform: "translate(27 -26) rotate(-25)", class: "station" }, parent);
	element("path", { d: "M-14,0H14 M0,-12V12", stroke: "#aebbc3", "stroke-width": 2 }, g);
	element("rect", { x: -18, y: -7, width: 10, height: 14, rx: 1, class: "station-panel" }, g);
	element("rect", { x: 8, y: -7, width: 10, height: 14, rx: 1, class: "station-panel" }, g);
	for (const x of [-15, -12, 11, 14])
		element("path", { d: `M${x},-6V6`, stroke: "#8db1c4", "stroke-width": 0.4 }, g);
	element("circle", { r: advanced ? 9 : 5, fill: "#b8c7ca" }, g);
	element("circle", { r: advanced ? 6 : 2, fill: "#324454" }, g);
	if (advanced) {
		element("path", { d: "M-4,-11H4V-6H-4Z M-4,6H4V13H-4Z", fill: "#d3dbd8" }, g);
		element("path", { d: "M-22,11H-8 M8,11H22", stroke: "#99b4bd", "stroke-width": 2 }, g);
	}
	element("circle", { cx: 0, cy: -2, r: 1.3, fill: "#8df0c5", stroke: "none" }, g);
}
function planetArt(parent, planet, index) {
	const biome = biomes[planet.biome],
		radius = 20 + (index % 3) * 2;
	const clipId = `planet-clip-${index}`;
	const clip = element("clipPath", { id: clipId, "data-scene-def": "" }, svg.querySelector("defs"));
	element("circle", { r: radius }, clip);
	element("circle", { r: radius + 2, fill: biome.sea, opacity: 0.25, filter: "url(#glow)" }, parent);
	element("circle", { r: radius, fill: biome.sea }, parent);
	const surface = element("g", { "clip-path": `url(#${clipId})`, "pointer-events": "none" }, parent);
	const land = element("g", { class: "surface-stripes" }, surface);
	const rand = random(92 + index * 48);
	for (let j = 0; j < 13; j++) {
		const x = rand() * 64 - 32,
			y = rand() * 52 - 26;
		const points = Array.from({ length: 9 }, (_, k) => {
			const a = (k / 9) * Math.PI * 2,
				r = 3 + rand() * 10;
			return `${x + Math.cos(a) * r},${y + Math.sin(a) * r * 0.7}`;
		}).join(" ");
		element(
			"polygon",
			{ points, fill: j % 4 ? biome.land : biome.light, opacity: 0.35 + rand() * 0.5 },
			land,
		);
	}
	if (planet.biome === "tropical" || planet.biome === "snowy") {
		element(
			"path",
			{ d: "M-30,-19Q-5,-9 30,-21V-30H-30Z M-30,22Q-7,13 30,23V30H-30Z", fill: "#d6e5e5", opacity: 0.8 },
			land,
		);
		element(
			"path",
			{
				d: "M-23,-6Q-7,-16 10,-6T29,-2 M-25,12Q-5,1 9,8",
				fill: "none",
				stroke: "#dfedf1",
				"stroke-width": 2,
				opacity: 0.4,
			},
			surface,
		);
	}
	if (planet.biome === "volcanic")
		element(
			"path",
			{
				d: "M-9,-24 -5,-13 -11,-5 -1,3 -4,14 7,24 M-1,3 10,0 17,9",
				fill: "none",
				stroke: "#ffa15a",
				"stroke-width": 1.2,
				opacity: 0.85,
			},
			land,
		);
	element("circle", { r: radius, fill: "url(#terminator)" }, parent);
	if (planet.owner === "own") {
		for (let j = 0; j < (view === "developed" ? 15 : 4); j++)
			element(
				"circle",
				{ cx: 3 + rand() * 13, cy: -10 + rand() * 22, r: 0.5, fill: "#ffe3a1", opacity: 0.7 },
				surface,
			);
		station(parent, view === "developed");
	}
}
function systemScene() {
	const scene = scenes[view];
	const advanced = view === "developed";
	// Orbits stay 112 world pixels apart. Detail zoom keeps at least 84 CSS pixels between lanes.
	// Overview retains 64px planet targets; tapping a target approaches its orbit instead of shrinking controls.
	planets = scene.names.map((name, i) => {
		const radius = 112 * (i + 1),
			angle = (scene.angles[i] * Math.PI) / 180;
		return {
			id: `${scene.id}:${i + 1}`,
			name,
			radius,
			x: Math.cos(angle) * radius,
			y: Math.sin(angle) * radius,
			biome: scene.biomes[i],
			owner: advanced || i < 2 ? "own" : "open",
			home: i === 0,
			ships: scene.ships[i],
		};
	});
	addStar(0, 0, 34, $("#stars"));
	for (const [index, planet] of planets.entries()) {
		element("circle", { r: planet.radius, class: "orbit-halo", "data-orbit": planet.id }, $("#orbits"));
		element("circle", { r: planet.radius, class: "orbit", "data-orbit": planet.id }, $("#orbits"));
		const group = element(
			"g",
			{
				class: `planet ${planet.owner}`,
				role: "button",
				tabindex: 0,
				"aria-label": `${planet.name}, ${planet.id}, ${biomes[planet.biome].label}, ${planet.owner === "own" ? "your colony" : "unclaimed"}`,
				"data-planet": planet.id,
			},
			$("#planets"),
		);
		const art = element("g", { class: "map-art" }, group);
		markers.push({ node: group, item: planet, art });
		element("circle", { r: 29, class: "ownership-ring" }, art);
		element("circle", { r: 34, class: "selected-ring" }, art);
		planetArt(art, planet, index);
		element("text", { x: 0, y: 50, "text-anchor": "middle", class: "planet-label" }, group, planet.name);
		element(
			"text",
			{ x: 0, y: 64, "text-anchor": "middle", class: "coordinate" },
			group,
			`${index + 1} · ${biomes[planet.biome].label}${planet.home ? " · HOME" : ""}`,
		);
		element("circle", { r: 32, fill: "transparent", class: "planet-hitbox" }, group);
		bindSelect(group, () => selectPlanet(planet));
		if (planet.owner === "own") {
			const count = advanced ? 8 + (index % 5) : index ? 2 : 3;
			for (let n = 0; n < count; n++) {
				const ship = element(
					"use",
					{ href: "#ship-sprite", x: -6, y: -4, width: 12, height: 8, "pointer-events": "none" },
					art,
				);
				patrols.push({
					ship,
					phase: (n / count) * Math.PI * 2,
					radius: 38 + (n % 3) * 5,
					duration: 3600 + n * 600 + index * 120,
				});
			}
		}
		const button = document.createElement("button");
		button.type = "button";
		button.innerHTML = `${biomes[planet.biome].icon} ${index + 1}<small>${planet.home ? "HOME" : planet.owner === "own" ? "COLONY" : "OPEN"}</small>`;
		button.setAttribute("aria-label", `Orbit ${index + 1}: ${planet.name}`);
		button.dataset.orbitSelect = planet.id;
		button.addEventListener("click", () => selectPlanet(planet, true));
		$("#orbit-picker").append(button);
	}
	const count = advanced ? 24 : 2;
	for (let i = 0; i < count; i++) {
		const from = planets[advanced ? i % planets.length : i % 2];
		const to =
			planets[
				advanced
					? ((i % planets.length) + 1 + Math.floor(i / planets.length) * 2) % planets.length
					: (i + 1) % 2
			];
		addFleet(
			from,
			to,
			i,
			i % 3 ? `💠 ${advanced ? "2 400" : "120"}` : `🔥 ${advanced ? "800" : "40"}`,
			i % 4 === 0 ? (8 + (i % 5)) * 3600000 : (45 + i * 2) * 60000,
		);
	}
	addIncoming(planets[0]);
	selectPlanet(planets[0]);
}
function addFleet(from, to, index, cargo, duration, incoming) {
	if (typeof from.id === "number") from = { ...from, id: `${from.id}:1` };
	if (typeof to.id === "number") to = { ...to, id: `${to.id}:1` };
	const id = incoming?.id || (index === 0 ? "transport" : `freight-${index}`);
	const key = incoming ? `${to.id}:${id}` : `${view}:${id}`;
	if (!movementState.has(key))
		movementState.set(
			key,
			incoming || {
				id,
				legId: `${id}-outbound`,
				sender: "You",
				own: true,
				mission: "Transport",
				cargo,
				composition: { heavy: index % 4 === 0 ? 2 : 0, freighter: 3 + (index % 4), fighter: 8 + (index % 5) },
				departure: scenarioTime - duration * (0.15 + ((index * 0.173) % 0.7)),
				arrival: scenarioTime + duration * (0.85 - ((index * 0.173) % 0.7)),
			},
		);
	const state = movementState.get(key);
	const route = element("g", { class: "fleet-route", "data-route": id }, $("#routes"));
	const path = element(
		"path",
		{
			d: `M${from.x},${from.y} Q${(from.x + to.x) / 2 + (index % 2 ? 35 : -35)},${(from.y + to.y) / 2 - 38} ${to.x},${to.y}`,
			class: "trajectory",
		},
		route,
	);
	const flow = element(
		"path",
		{
			d: path.getAttribute("d"),
			class: "route-flow",
			pathLength: 100,
			style: `animation-delay: -${index % 8}s`,
		},
		route,
	);
	const ship = element(
		"g",
		{ "data-fleet": id, role: "button", tabindex: 0, class: "fleet-marker" },
		$("#ships"),
	);
	const fleet = { path, flow, route, ship, state, from, to, length: path.getTotalLength() };
	fleets.push(fleet);
	paintFleet(fleet);
	bindSelect(ship, () => openMovement(fleet));
}

function addIncoming(target) {
	// Observer fixtures deliberately omit unverified mission, composition and cargo.
	const samples = [
		{
			id: "incoming-ally",
			sender: "Mira · your alliance",
			origin: "62:3",
			inScanRange: true,
			hours: 10,
			remaining: 2,
		},
		{
			id: "incoming-attack",
			sender: "Kael",
			origin: "13:2",
			inScanRange: true,
			hours: 9,
			remaining: 2.4,
			report: {
				legId: "incoming-attack-outbound",
				mission: "Attack",
				composition: { heavy: 6, freighter: 4, fighter: 24 },
				verifiedAt: scenarioTime - 5 * 60000,
			},
		},
		{ id: "incoming-distant", sender: "Orin", origin: "17:4", inScanRange: false, hours: 12, remaining: 7 },
	];
	for (const [i, sample] of samples.entries()) {
		const source =
			view === "galaxy" ? systems.find((system) => system.id === Number(sample.origin.split(":")[0])) : null;
		const from = {
			x: source ? source.x : target.x + [-480, 400, -320][i],
			y: source ? source.y : target.y + [-400, -500, 500][i],
			name: sample.origin,
			id: sample.origin,
		};
		addFleet(from, target, 30 + i, undefined, sample.hours * 3600000, {
			...sample,
			legId: `${sample.id}-outbound`,
			own: false,
			departure: scenarioTime - (sample.hours - sample.remaining) * 3600000,
			arrival: scenarioTime + sample.remaining * 3600000,
		});
	}
}
function intelligence(state) {
	return state.report?.legId === state.legId && !state.ended ? state.report : undefined;
}
function fleetLabel(state) {
	if (state.ended) return `Movement ${state.ended}`;
	if (state.own) return state.mission;
	const report = intelligence(state);
	return report?.mission === "Attack"
		? "Attack incoming"
		: report?.mission === "Reinforcement"
			? "Reinforcements incoming"
			: "Incoming fleet";
}
function fleetTone(state) {
	return state.ended
		? "ended"
		: state.own
			? "own"
			: intelligence(state)?.mission === "Attack"
				? "attack"
				: intelligence(state)
					? "verified"
					: "unknown";
}
function paintFleet(fleet) {
	const { ship, state, route } = fleet;
	ship.replaceChildren();
	route.setAttribute("class", `fleet-route ${fleetTone(state)}`);
	ship.setAttribute("aria-label", `${fleetLabel(state)} · ${state.sender}`);
	ship.dataset.leg = state.legId;
	ship.dataset.duration = state.arrival - state.departure;
	const composition = state.own ? state.composition : intelligence(state)?.composition;
	const formation = element("g", { class: "formation" }, ship);
	if (composition) {
		for (const [type, count] of Object.entries(composition)) {
			if (!count) continue;
			const shape = shipTypes[type];
			const positions =
				type === "heavy"
					? [[12, 0]]
					: type === "freighter"
						? [
								[-22, -12],
								[-22, 12],
							]
						: [
								[6, -25],
								[6, 25],
							];
			for (const [x, y] of positions.slice(0, count))
				element(
					"use",
					{
						href: `#${shape.symbol}`,
						x: x - shape.width / 2,
						y: y - shape.height / 2,
						width: shape.width,
						height: shape.height,
						"data-ship-type": type,
					},
					formation,
				);
		}
	} else {
		element("path", { d: "M0,-12 12,0 0,12 -12,0Z", class: "unknown-contact" }, formation);
		element("text", { x: 0, y: 4, "text-anchor": "middle", class: "contact-question" }, formation, "?");
	}
	element("circle", { r: 27, fill: "transparent", class: "fleet-hitbox" }, ship);
	element(
		"title",
		{},
		ship,
		`${state.sender} · ${fleetLabel(state)} · ${fleet.from.id || fleet.from.name} → ${fleet.to.id || fleet.to.name}`,
	);
	ship.style.display = state.ended ? "none" : "";
}
function selectSystem(system) {
	selected = system;
	for (const node of document.querySelectorAll(".system")) {
		const active = node.dataset.system === String(system.id);
		node.classList.toggle("selected", active);
		node.setAttribute("aria-pressed", String(active));
	}
	$("#planet-name").textContent = system.name;
	$("#planet-meta").textContent = `SYSTEM ${system.id} · ${system.type}`;
	$("#planet-biome").textContent = "✦";
	$("#planet-detail").textContent = `${system.count} planets · ${system.settled} settled`;
	$("#planet-action").textContent = system.variant ? "Enter system ↗" : "Survey system ↗";
}
function selectPlanet(planet, approach = false) {
	selected = planet;
	for (const node of document.querySelectorAll(".planet, [data-orbit], [data-orbit-select]")) {
		const active = (node.dataset.planet || node.dataset.orbit || node.dataset.orbitSelect) === planet.id;
		node.classList.toggle("selected", active);
		if (!node.dataset.orbit) node.setAttribute("aria-pressed", String(active));
	}
	$("#planet-name").textContent = planet.name;
	$("#planet-meta").textContent =
		`${planet.home ? "YOUR HOME PLANET" : planet.owner === "own" ? "YOUR COLONY" : "UNCLAIMED WORLD"} · ${planet.id}`;
	$("#planet-biome").textContent = biomes[planet.biome].icon;
	$("#planet-detail").textContent =
		`${biomes[planet.biome].label} · ${planet.ships ? `${planet.ships} ships · ${view === "developed" ? "Orbital citadel" : "Outpost"}` : "No settlement"}`;
	$("#planet-action").textContent = "Orbit detail ↗";
	if (approach) {
		camera = { scale: 1, x: width / 2 - planet.x, y: height / 2 - planet.y };
		updateCamera();
		$("#planet-action").textContent = "System overview ↗";
	}
}
function fit() {
	const outer = view === "galaxy" ? 290 : planets.at(-1).radius;
	const scale =
		view === "galaxy"
			? Math.min(width / 820, height / 780)
			: Math.min((width - 90) / (outer * 2), (height - 140) / (outer * 2));
	camera = { x: width / 2, y: height / 2 - 10, scale: Math.max(minimumScale(), scale) };
	updateCamera();
	if (view !== "galaxy") $("#planet-action").textContent = "Orbit detail ↗";
}
function home() {
	if (view === "galaxy") {
		fit();
		selectSystem(systems[0]);
		return;
	}
	// A phone explores a large system rather than compressing eight orbit lanes into its width.
	camera = { x: width / 2, y: height * 0.65, scale: 0.8 };
	selectPlanet(planets[0]);
	updateCamera();
}
function updateCamera() {
	world.setAttribute("transform", `translate(${camera.x} ${camera.y}) scale(${camera.scale})`);
	// Markers and hit areas use screen pixels even when the astronomical distances are zoomed out.
	for (const { node, item, art } of markers) {
		node.setAttribute("transform", `translate(${item.x} ${item.y}) scale(${1 / camera.scale})`);
		// Artwork shrinks gently in overview, while the 64px hit circle remains outside this transform.
		const size = view === "galaxy" ? 1 : Math.min(1, 0.72 + camera.scale * 0.35);
		art.setAttribute("transform", `scale(${size})`);
	}
	svg.dataset.camera = JSON.stringify(camera);
	if (view !== "galaxy")
		$("#planet-action").textContent = camera.scale >= 0.75 ? "System overview ↗" : "Orbit detail ↗";
	$("#map-mode").textContent =
		view === "galaxy"
			? "OPEN SPACE · DRAG TO EXPLORE"
			: camera.scale >= 0.75
				? "ORBIT DETAIL · DRAG TO EXPLORE"
				: "SYSTEM OVERVIEW · TAP TO APPROACH";
	$("#drag-hint").textContent =
		view === "galaxy"
			? "Drag to explore · tap a star"
			: camera.scale >= 0.75
				? "Drag between orbits · ⌖ returns home"
				: "Tap a world or choose its orbit below";
}
function showView(next) {
	closeMovements();
	view = next;
	cameraReady = false;
	const url = new URL(location.href);
	url.searchParams.set("variant", view);
	history.replaceState(null, "", url);
	document.body.dataset.view = view;
	for (const button of document.querySelectorAll("[data-view]")) {
		if (button.dataset.view === view) button.setAttribute("aria-current", "page");
		else button.removeAttribute("aria-current");
	}
	for (const id of ["cells", "orbits", "routes", "stars", "planets", "ships", "orbit-picker"])
		$(`#${id}`).replaceChildren();
	for (const def of document.querySelectorAll("[data-scene-def]")) def.remove();
	planets = [];
	fleets = [];
	patrols = [];
	markers = [];
	lastSecond = -1;
	$("#orbit-picker").hidden = view === "galaxy";
	$("#overview").hidden = view === "galaxy";
	$("#view-meta").textContent = view === "galaxy" ? "PERSEUS ARM · SECTOR 07" : scenes[view].subtitle;
	$("#view-title").textContent = view === "galaxy" ? "The frontier" : scenes[view].name;
	$("#minerals").textContent =
		`💠 ${(scenes[view]?.minerals || 1240).toLocaleString("en-US").replaceAll(",", " ")}`;
	$("#gas").textContent = `🔥 ${(scenes[view]?.gas || 610).toLocaleString("en-US").replaceAll(",", " ")}`;
	$("#scene-note").textContent =
		view === "galaxy" ? "MAP STUDY · SAMPLE STATE" : "SIMULATION · LOCAL TRAFFIC";
	if (view === "galaxy") galaxy();
	else systemScene();
	resize();
}
function resize() {
	const box = svg.getBoundingClientRect();
	const dx = (box.width - width) / 2,
		dy = (box.height - height) / 2;
	width = box.width;
	height = box.height;
	svg.setAttribute("viewBox", `0 0 ${width} ${height}`);
	sky();
	if (!cameraReady) {
		home();
		cameraReady = true;
	} else {
		camera.x += dx;
		camera.y += dy;
		updateCamera();
	}
}
function zoom(factor, point = { x: width / 2, y: height / 2 }) {
	const scale = Math.max(minimumScale(), Math.min(2.4, camera.scale * factor)),
		ratio = scale / camera.scale;
	camera = { x: point.x - (point.x - camera.x) * ratio, y: point.y - (point.y - camera.y) * ratio, scale };
	updateCamera();
}
function minimumScale() {
	if (view === "galaxy") return 0.42;
	let distance = Infinity;
	for (let i = 0; i < planets.length; i++)
		for (let j = i + 1; j < planets.length; j++) {
			distance = Math.min(distance, Math.hypot(planets[i].x - planets[j].x, planets[i].y - planets[j].y));
		}
	// Keep 64px hit circles separated by 16px even in overview; the outer system can be panned into view.
	return 80 / distance;
}
function svgPoint(x, y) {
	return new DOMPoint(x, y).matrixTransform(svg.getScreenCTM().inverse());
}
const pointers = new Map();
let moved = false;
svg.addEventListener("pointerdown", (event) => {
	pointers.set(event.pointerId, svgPoint(event.clientX, event.clientY));
	if (pointers.size === 1) moved = false;
});
svg.addEventListener("pointermove", (event) => {
	if (!pointers.has(event.pointerId)) return;
	const before = pointers.get(event.pointerId),
		current = svgPoint(event.clientX, event.clientY);
	const dx = current.x - before.x,
		dy = current.y - before.y;
	if (!moved && Math.hypot(dx, dy) < 3) return;
	moved = true;
	svg.setPointerCapture(event.pointerId);
	svg.classList.add("dragging");
	if (pointers.size === 2) {
		const other = [...pointers.entries()].find(([id]) => id !== event.pointerId)[1];
		const beforeDistance = Math.hypot(before.x - other.x, before.y - other.y);
		const distance = Math.hypot(current.x - other.x, current.y - other.y);
		if (beforeDistance > 0)
			zoom(distance / beforeDistance, { x: (current.x + other.x) / 2, y: (current.y + other.y) / 2 });
	} else {
		camera.x += dx;
		camera.y += dy;
		updateCamera();
	}
	pointers.set(event.pointerId, current);
});
function endPointer(event) {
	pointers.delete(event.pointerId);
	if (!pointers.size) svg.classList.remove("dragging");
}
svg.addEventListener("pointerup", endPointer);
svg.addEventListener("pointercancel", endPointer);
svg.addEventListener(
	"click",
	(event) => {
		if (moved) {
			event.stopPropagation();
			moved = false;
		}
	},
	true,
);
svg.addEventListener(
	"wheel",
	(event) => {
		event.preventDefault();
		zoom(Math.exp(-event.deltaY * 0.002), svgPoint(event.clientX, event.clientY));
	},
	{ passive: false },
);
svg.addEventListener("click", (event) => {
	if (view === "galaxy" || event.target.closest('[role="button"]')) return;
	const point = svgPoint(event.clientX, event.clientY);
	const radius = Math.hypot(point.x - camera.x, point.y - camera.y) / camera.scale;
	const nearest = planets.reduce((best, planet) =>
		Math.abs(planet.radius - radius) < Math.abs(best.radius - radius) ? planet : best,
	);
	if (Math.abs(nearest.radius - radius) * camera.scale <= 24) selectPlanet(nearest);
});
$("#zoom-in").addEventListener("click", () => zoom(1.3));
$("#zoom-out").addEventListener("click", () => zoom(1 / 1.3));
$("#recenter").addEventListener("click", home);
$("#overview").addEventListener("click", fit);
for (const button of document.querySelectorAll("[data-view]"))
	button.addEventListener("click", () => showView(button.dataset.view));
let statusTimeout;
$("#planet-action").addEventListener("click", () => {
	if (view !== "galaxy") {
		if (camera.scale >= 0.75) fit();
		else selectPlanet(selected, true);
	} else if (selected.variant) showView(selected.variant);
	else {
		$("#status").textContent =
			`${selected.name}: this study includes Solara and Aurelia. Choose First colonies or High empire.`;
		clearTimeout(statusTimeout);
		statusTimeout = setTimeout(() => {
			$("#status").textContent = "";
		}, 4000);
	}
});
function tick() {
	const now = Date.now();
	for (const fleet of fleets) {
		const { state } = fleet;
		if (!state.ended && now >= state.arrival) expireMovement(fleet, "arrived");
		const progress = Math.min(1, Math.max(0, (now - state.departure) / (state.arrival - state.departure)));
		const point = fleet.path.getPointAtLength(fleet.length * progress);
		const next = fleet.path.getPointAtLength(Math.min(fleet.length, fleet.length * progress + 1));
		const angle = (Math.atan2(next.y - point.y, next.x - point.x) * 180) / Math.PI;
		fleet.ship.setAttribute(
			"transform",
			`translate(${point.x} ${point.y}) rotate(${angle}) scale(${1 / camera.scale})`,
		);
		fleet.ship.dataset.progress = progress.toFixed(8);
		fleet.ship.querySelector(".contact-question")?.setAttribute("transform", `rotate(${-angle})`);
		fleet.ship
			.querySelector(".formation")
			.setAttribute("transform", `scale(${Math.min(1, 0.48 + camera.scale * 0.35)})`);
	}
	for (const patrol of patrols) {
		const a = patrol.phase + (reducedMotion.matches ? 0 : (now / (patrol.duration * 1000)) * Math.PI * 2);
		patrol.ship.setAttribute(
			"transform",
			`translate(${Math.cos(a) * patrol.radius} ${Math.sin(a) * patrol.radius * 0.65}) rotate(${(a * 180) / Math.PI + 90})`,
		);
	}
	if (Math.floor(now / 1000) !== lastSecond) {
		lastSecond = Math.floor(now / 1000);
		$("#flight-summary").textContent =
			`${fleets.filter((f) => !f.state.ended).length} movements · journeys in hours`;
		$("#incoming-count").textContent =
			`${fleets.filter((f) => !f.state.own && !f.state.ended).length} incoming`;
		for (const node of document.querySelectorAll("[data-arrival]"))
			node.textContent = timeLeft(Number(node.dataset.arrival));
	}
	if (reducedMotion.matches) setTimeout(tick, 1000);
	else requestAnimationFrame(tick);
}

function timeLeft(arrival) {
	const minutes = Math.max(0, Math.ceil((arrival - Date.now()) / 60000));
	return minutes ? `${Math.floor(minutes / 60)}h ${String(minutes % 60).padStart(2, "0")}m` : "Arrived";
}
function clock(time) {
	return new Date(time).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}
function closeMovements() {
	$("#movement-panel").hidden = true;
	document.body.classList.remove("movements-open");
	$("#open-movements").setAttribute("aria-expanded", "false");
	activeFleet = undefined;
	for (const fleet of fleets) fleet.route.classList.remove("focused");
}
function showMovements() {
	activeFleet = undefined;
	for (const fleet of fleets) fleet.route.classList.remove("focused");
	$("#movement-panel").hidden = false;
	document.body.classList.add("movements-open");
	$("#open-movements").setAttribute("aria-expanded", "true");
	$("#movement-heading").textContent = "Fleet movements";
	$("#movement-back").hidden = true;
	$("#movement-detail").hidden = true;
	$("#movement-list").hidden = false;
	const list = $("#movement-list");
	list.replaceChildren();
	for (const own of [false, true]) {
		const heading = document.createElement("h3");
		heading.textContent = own ? "Your fleets" : "Incoming fleets";
		list.append(heading);
		for (const fleet of fleets.filter((f) => f.state.own === own)) {
			const { state } = fleet;
			const button = document.createElement("button");
			button.type = "button";
			button.className = `movement-row ${fleetTone(state)}`;
			button.dataset.movement = state.id;
			button.innerHTML = `<span class="movement-symbol">${state.own ? "↗" : intelligence(state) ? "👁" : "◇"}</span><span><strong>${fleetLabel(state)}</strong><small>${state.sender} · ${fleet.from.id || fleet.from.name} → ${fleet.to.id || fleet.to.name}</small></span><span class="arrival-time" ${state.ended ? "" : `data-arrival="${state.arrival}"`}>${state.ended || timeLeft(state.arrival)}</span>`;
			button.addEventListener("click", () => openMovement(fleet));
			list.append(button);
		}
	}
}
function openMovement(fleet) {
	const previous = activeFleet;
	showMovements();
	activeFleet = fleet;
	if (previous !== fleet)
		requestAnimationFrame(() => {
			const progress = Math.min(
				1,
				Math.max(0, (Date.now() - fleet.state.departure) / (fleet.state.arrival - fleet.state.departure)),
			);
			const point = fleet.path.getPointAtLength(fleet.length * progress);
			camera.x = width / 2 - point.x * camera.scale;
			camera.y = height * 0.55 - point.y * camera.scale;
			updateCamera();
		});
	for (const item of fleets) item.route.classList.toggle("focused", item === fleet);
	$("#movement-list").hidden = true;
	$("#movement-back").hidden = false;
	$("#movement-heading").textContent = "";
	const detail = $("#movement-detail");
	detail.hidden = false;
	const { state } = fleet,
		report = intelligence(state);
	const composition = state.own ? state.composition : report?.composition;
	detail.innerHTML = `<div class="fleet-title ${fleetTone(state)}"><p class="eyebrow">${state.own ? "YOUR FLEET" : `SENDER · ${state.sender}`}</p><h2>${fleetLabel(state)}</h2><p>${fleet.from.id || fleet.from.name} → ${fleet.to.id || fleet.to.name} · ${state.ended ? state.ended : `<span data-arrival="${state.arrival}">${timeLeft(state.arrival)}</span> · arrival ${clock(state.arrival)}`}</p></div>
		<p class="verification ${fleetTone(state)}" id="verification">${state.ended ? `Verification expired: movement ${state.ended}.` : report ? `👁 Mission verified at ${clock(report.verifiedAt)} · this leg only` : state.own ? `Travel time fixed at dispatch · ${Math.round((state.arrival - state.departure) / 60000)} min` : "◇ Mission unverified · ship composition unknown"}</p>
		${
			composition
				? `<div class="composition">${Object.entries(composition)
						.filter(([, count]) => count)
						.map(
							([type, count]) =>
								`<div><svg viewBox="-42 -24 84 48" aria-hidden="true"><use href="#${shipTypes[type].symbol}" x="${-shipTypes[type].width}" y="${-shipTypes[type].height}" width="${shipTypes[type].width * 2}" height="${shipTypes[type].height * 2}"/></svg><strong>${count} × ${shipTypes[type].name}</strong></div>`,
						)
						.join(
							"",
						)}</div><p class="fleet-note">${state.own ? `${state.cargo} · all ships travel together at the slowest ship's speed.` : "Cargo unknown. The scan reveals mission and ship composition."}</p>`
				: `<p class="fleet-note">${state.id === "incoming-ally" && !state.ended ? "An alliance member is approaching. Alliance membership does not verify their mission." : state.ended ? "An old report cannot verify a different movement leg." : "Only sender, origin, target and arrival are visible."}</p>`
		}
		${!state.own ? `<button type="button" class="scan-button" id="scan-fleet" ${state.ended || report || !state.inScanRange ? "disabled" : ""}>${state.ended ? "Movement ended" : report ? "👁 Verified for this leg" : state.inScanRange ? "👁 Scan fleet with Observatory" : "Outside Observatory range"}</button><p class="fleet-note">${report ? "Recall, arrival or a replacement leg expires this verification." : "Scan availability is sample state; range geometry is still undecided."}</p><details class="demo-controls"><summary>Preview movement changes</summary><p>Prototype controls for report expiry.</p><button type="button" data-expire="recalled">Recall</button><button type="button" data-expire="arrived">Arrival</button><button type="button" data-expire="replaced">Replacement leg</button></details>` : ""}`;
	if (!state.own) {
		$("#scan-fleet").addEventListener("click", () => scanFleet(fleet));
		for (const button of detail.querySelectorAll("[data-expire]"))
			button.addEventListener("click", () => expireMovement(fleet, button.dataset.expire));
	}
}
async function scanFleet(fleet) {
	const legId = fleet.state.legId;
	const button = $("#scan-fleet");
	button.disabled = true;
	button.textContent = "Observatory scanning…";
	try {
		// Static scan response for the wireframe. Production visibility and authorization belong on the server.
		const response = await fetch(`intel/${fleet.state.id}.json`);
		if (!response.ok) throw new Error("Scan sample unavailable");
		const report = await response.json();
		if (fleet.state.ended || fleet.state.legId !== legId || report.legId !== legId)
			throw new Error("Movement changed. This report no longer verifies it.");
		fleet.state.report = { ...report, verifiedAt: Date.now() };
		paintFleet(fleet);
		if (activeFleet === fleet) openMovement(fleet);
	} catch (error) {
		if (activeFleet === fleet) {
			button.textContent = error.message;
			button.disabled = false;
		}
	}
}
function expireMovement(fleet, reason) {
	fleet.state.ended = reason;
	delete fleet.state.report;
	if (reason === "replaced") fleet.state.legId += "-replacement";
	paintFleet(fleet);
	if (activeFleet === fleet) openMovement(fleet);
}
$("#open-movements").addEventListener("click", showMovements);
$("#close-movements").addEventListener("click", closeMovements);
$("#movement-back").addEventListener("click", showMovements);
// Telegram owns the window and event bridge. No account or SDK download is needed for this study.
function send(eventType, eventData = {}) {
	if (parent !== window) parent.postMessage(JSON.stringify({ eventType, eventData }), location.origin);
}
window.addEventListener("message", (event) => {
	if (event.source !== parent) return;
	let data = event.data;
	if (typeof data === "string") {
		try {
			data = JSON.parse(data);
		} catch {
			return;
		}
	}
	if (data?.eventType === "theme_changed")
		document.body.dataset.telegramTheme = data.eventData?.theme_params?.bg_color;
});
const initial = new URLSearchParams(location.search).get("variant");
showView(initial === "young" || initial === "developed" ? initial : "galaxy");
new ResizeObserver(resize).observe(svg);
send("web_app_ready");
send("web_app_expand");
send("web_app_set_header_color", { color: "#141b28" });
send("web_app_setup_swipe_behavior", { allow_vertical_swipe: false });
send("web_app_request_theme");
tick();
document.body.dataset.ready = "true";
