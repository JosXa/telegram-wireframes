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
		q: 1,
		r: -1,
		owner: "own",
		count: 8,
		settled: 8,
		variant: "developed",
		type: "F5 · White-gold star",
	},
	{ id: 13, name: "Antares", q: -1, r: 0, owner: "rival", count: 6, settled: 3, type: "K4 · Orange dwarf" },
	{ id: 18, name: "Merope", q: 0, r: -1, owner: "open", count: 5, settled: 0, type: "B6 · Blue star" },
	{ id: 19, name: "Altair", q: 1, r: 0, owner: "open", count: 7, settled: 0, type: "A7 · White star" },
	{ id: 12, name: "Lacaille", q: -1, r: 1, owner: "open", count: 4, settled: 0, type: "M2 · Red dwarf" },
	{ id: 17, name: "Nivalis", q: 0, r: 1, owner: "rival", count: 8, settled: 5, type: "K1 · Orange dwarf" },
];
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
let deliveryCount = 0;

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
	const size = 112;
	for (let q = -3; q <= 3; q++)
		for (let r = -3; r <= 3; r++) {
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
		system.x = size * 1.5 * system.q;
		system.y = size * Math.sqrt(3) * (system.r + system.q / 2);
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
		markers.push({ node: group, item: system });
		addStar(0, 0, system.id === 28 ? 10 : 7, group, system.id === 18);
		element("circle", { r: 23, class: "ownership-ring" }, group);
		element("circle", { r: 28, class: "selected-ring" }, group);
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
	addFleet(systems[0], systems[1], 0, "💠 240", 120000);
	addFleet(systems[1], systems[0], 1, "🔥 80", 160000);
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
		markers.push({ node: group, item: planet });
		element("circle", { r: 29, class: "ownership-ring" }, group);
		element("circle", { r: 34, class: "selected-ring" }, group);
		planetArt(group, planet, index);
		element("text", { x: 0, y: 50, "text-anchor": "middle", class: "planet-label" }, group, planet.name);
		element(
			"text",
			{ x: 0, y: 64, "text-anchor": "middle", class: "coordinate" },
			group,
			`${index + 1} · ${biomes[planet.biome].label}${planet.home ? " · HOME" : ""}`,
		);
		element("circle", { r: 32, fill: "transparent", class: "planet-hitbox" }, group);
		bindSelect(group, () => selectPlanet(planet, true));
		if (planet.owner === "own") {
			const count = advanced ? 8 + (index % 5) : index ? 2 : 3;
			for (let n = 0; n < count; n++) {
				const ship = element(
					"use",
					{ href: "#ship-sprite", x: -6, y: -4, width: 12, height: 8, "pointer-events": "none" },
					group,
				);
				patrols.push({
					ship,
					phase: (n / count) * Math.PI * 2,
					radius: 38 + (n % 3) * 5,
					duration: 15 + n * 3 + index,
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
			advanced ? 25000 + i * 1300 : 65000 + i * 20000,
		);
	}
	selectPlanet(planets[0]);
}
function addFleet(from, to, index, cargo, duration) {
	const path = element(
		"path",
		{
			d: `M${from.x},${from.y} Q${(from.x + to.x) / 2 + (index % 2 ? 35 : -35)},${(from.y + to.y) / 2 - 38} ${to.x},${to.y}`,
			class: `trajectory${cargo.includes("🔥") ? " gas" : ""}`,
		},
		$("#routes"),
	);
	const ship = element(
		"g",
		{ "data-fleet": index === 0 ? "transport" : `freight-${index}`, "pointer-events": "none" },
		$("#ships"),
	);
	element("use", { href: "#freighter-sprite", x: -9, y: -6, width: 18, height: 12 }, ship);
	const label =
		index % 8 === 0
			? element("text", { x: 0, y: -13, "text-anchor": "middle", class: "coordinate" }, ship, cargo)
			: null;
	const title = element("title", {}, ship, `${from.name} → ${to.name} · ${cargo}`);
	fleets.push({
		path,
		ship,
		title,
		cargo,
		label,
		length: path.getTotalLength(),
		duration,
		departure: Date.now() - duration * (0.15 + ((index * 0.173) % 0.7)),
	});
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
			? Math.min(width / 540, height / 640)
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
	for (const { node, item } of markers)
		node.setAttribute("transform", `translate(${item.x} ${item.y}) scale(${1 / camera.scale})`);
	svg.dataset.camera = JSON.stringify(camera);
	if (view !== "galaxy")
		$("#planet-action").textContent = camera.scale >= 0.75 ? "System overview ↗" : "Orbit detail ↗";
	$("#map-mode").textContent =
		view === "galaxy"
			? "HEX SECTORS · SYSTEMS"
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
	view = next;
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
	deliveryCount = 0;
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
	width = box.width;
	height = box.height;
	svg.setAttribute("viewBox", `0 0 ${width} ${height}`);
	sky();
	home();
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
		let progress = (now - fleet.departure) / fleet.duration;
		if (progress >= 1) {
			fleet.departure += Math.floor(progress) * fleet.duration;
			deliveryCount++;
			progress %= 1;
		}
		const point = fleet.path.getPointAtLength(fleet.length * progress);
		const next = fleet.path.getPointAtLength(Math.min(fleet.length, fleet.length * progress + 1));
		const angle = (Math.atan2(next.y - point.y, next.x - point.x) * 180) / Math.PI;
		fleet.ship.setAttribute(
			"transform",
			`translate(${point.x} ${point.y}) rotate(${angle}) scale(${1 / camera.scale})`,
		);
		fleet.ship.dataset.progress = progress.toFixed(5);
		if (fleet.label) {
			fleet.label.setAttribute("transform", `rotate(${-angle})`);
			fleet.label.style.display = camera.scale >= 0.75 ? "" : "none";
		}
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
			view === "galaxy"
				? "2 transports crossing the sector"
				: `${fleets.length} transport routes · ${patrols.length} orbital craft${deliveryCount ? ` · ${deliveryCount} delivered` : ""}`;
	}
	if (reducedMotion.matches) setTimeout(tick, 1000);
	else requestAnimationFrame(tick);
}
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
