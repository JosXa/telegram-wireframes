// Throwaway prototype: sample state, actual SVG geometry, pointer input, and time-based fleet motion.
// The game will supply authoritative state and times; this example needs no game server.
const NS = "http://www.w3.org/2000/svg";
const $ = (selector) => document.querySelector(selector);
const svg = $("#galaxy");
const world = $("#world");
const startedAt = Date.now();
const planets = [
	{ id: "14:6", name: "Vega", x: 220, y: 270, owner: "own", biome: "🏝", ships: 12, home: true },
	{ id: "15:3", name: "Kepler", x: 358, y: 345, owner: "own", biome: "🏔", ships: 4 },
	{ id: "13:2", name: "Cinder", x: 74, y: 348, owner: "rival", biome: "🌋", ships: null },
	{ id: "18:5", name: "Drift", x: 356, y: 100, owner: "open", biome: "🏜", ships: 0 },
	{ id: "12:7", name: "Aster", x: 80, y: 110, owner: "open", biome: "⛰", ships: 0 },
	{ id: "17:4", name: "Nivalis", x: 216, y: 496, owner: "rival", biome: "🏔", ships: null },
	{ id: "19:1", name: "Talos", x: 493, y: 263, owner: "open", biome: "⛰", ships: 0 },
	{ id: "11:3", name: "Solis", x: -72, y: 263, owner: "open", biome: "🏝", ships: 0 },
];
const fleets = [
	{
		id: "transport",
		from: "14:6",
		to: "15:3",
		label: "Light Transport",
		mission: "Transport",
		owner: "own",
		departure: startedAt - 35000,
		arrival: startedAt + 85000,
	},
	{
		id: "fighters",
		from: "13:2",
		to: "14:6",
		label: "8 Light Fighters",
		mission: "Incoming attack",
		owner: "rival",
		departure: startedAt - 60000,
		arrival: startedAt + 150000,
	},
];
let selected = planets[0];
let camera = { x: 0, y: 0, scale: 1 };

function element(tag, attrs, parent, text) {
	const node = document.createElementNS(NS, tag);
	for (const [key, value] of Object.entries(attrs)) node.setAttribute(key, String(value));
	if (text) node.textContent = text;
	parent.append(node);
	return node;
}

// One hex per star system. Planet coordinates stay system:orbit throughout the example.
for (let row = -2; row < 4; row++) {
	for (let col = -2; col < 4; col++) {
		const x = 220 + col * 140;
		const y = 270 + row * 162 + (Math.abs(col) % 2) * 81;
		const points = Array.from({ length: 6 }, (_, i) => {
			const angle = (i * Math.PI) / 3;
			return `${x + Math.cos(angle) * 93},${y + Math.sin(angle) * 93}`;
		}).join(" ");
		element(
			"polygon",
			{ points, class: `cell${(col === 0 && row === 0) || (col === 1 && row === 0) ? " owned" : ""}` },
			$("#cells"),
		);
		element("circle", { cx: x - 30, cy: y - 34, r: 12, fill: "url(#star)" }, $("#cells"));
	}
}

for (const planet of planets) {
	const group = element(
		"g",
		{
			class: `planet ${planet.owner}`,
			transform: `translate(${planet.x} ${planet.y})`,
			"data-planet": planet.id,
			role: "button",
			tabindex: "0",
			"aria-label": `${planet.name}, ${planet.id}, ${planet.owner === "own" ? "your colony" : planet.owner === "rival" ? "rival colony" : "unclaimed"}`,
		},
		$("#planets"),
	);
	element("circle", { r: 27, class: "selected-ring" }, group);
	element("circle", { r: 21, class: "ownership-ring" }, group);
	element("circle", { r: 16, fill: `url(#${planet.owner}-planet)` }, group);
	const clip = element("clipPath", { id: `clip-${planet.id}` }, svg.querySelector("defs"));
	element("circle", { r: 16 }, clip);
	const surface = element("g", { "clip-path": `url(#clip-${planet.id})`, "pointer-events": "none" }, group);
	const stripes = element("g", { class: "surface-stripes" }, surface);
	for (let i = -3; i < 4; i++) element("path", { d: `M ${i * 14} -22 q -14 22 0 44` }, stripes);
	element("text", { x: 0, y: 40, "text-anchor": "middle", class: "planet-label" }, group, planet.name);
	element(
		"text",
		{ x: 0, y: 53, "text-anchor": "middle", class: "coordinate" },
		group,
		`${planet.id}${planet.owner === "own" ? " · YOURS" : ""}`,
	);
	// Keep a fixed hit target above the clipped, animated surface.
	element("circle", { r: 28, fill: "transparent", class: "planet-hitbox" }, group);
	group.addEventListener("click", () => selectPlanet(planet));
	group.addEventListener("keydown", (event) => {
		if (event.key === "Enter" || event.key === " ") {
			event.preventDefault();
			selectPlanet(planet);
		}
	});
}

for (const fleet of fleets) {
	const from = planets.find((p) => p.id === fleet.from);
	const to = planets.find((p) => p.id === fleet.to);
	const cx = (from.x + to.x) / 2;
	const cy = (from.y + to.y) / 2 - 52;
	fleet.path = element(
		"path",
		{ d: `M${from.x},${from.y} Q${cx},${cy} ${to.x},${to.y}`, class: `trajectory ${fleet.owner}` },
		$("#routes"),
	);
	fleet.length = fleet.path.getTotalLength();
	fleet.ship = element(
		"path",
		{ d: "M8,0 L-5,-4 L-2,0 L-5,4 Z", class: `ship ${fleet.owner}`, "data-fleet": fleet.id },
		$("#ships"),
	);
	const row = document.createElement("div");
	row.className = "fleet-row";
	row.innerHTML = `<div><p>${fleet.label}</p><small>${fleet.mission} · ${fleet.from} → ${fleet.to}</small></div><time data-eta="${fleet.id}"></time>`;
	$("#fleet-panel").append(row);
}

function selectPlanet(planet) {
	selected = planet;
	for (const node of document.querySelectorAll(".planet")) {
		const active = node.getAttribute("data-planet") === planet.id;
		node.classList.toggle("selected", active);
		node.setAttribute("aria-pressed", String(active));
	}
	$("#planet-name").textContent = planet.name;
	$("#planet-meta").textContent =
		`${planet.home ? "YOUR HOME PLANET" : planet.owner === "own" ? "YOUR COLONY" : planet.owner === "rival" ? "RIVAL COLONY" : "UNCLAIMED WORLD"} · ${planet.id}`;
	$("#planet-biome").textContent = planet.biome;
	$("#planet-detail").textContent =
		planet.ships === null ? "Scan to reveal stationed ships" : `${planet.ships} stationed ships`;
	$("#planet-action").textContent = planet.owner === "own" ? "View colony ↗" : "Dispatch fleet ↗";
}

function updateCamera() {
	world.setAttribute("transform", `translate(${camera.x} ${camera.y}) scale(${camera.scale})`);
	svg.dataset.camera = JSON.stringify(camera);
}
function svgPoint(x, y) {
	return new DOMPoint(x, y).matrixTransform(svg.getScreenCTM().inverse());
}
function zoom(factor, point = { x: 210, y: 260 }) {
	const scale = Math.max(0.5, Math.min(2.8, camera.scale * factor));
	const ratio = scale / camera.scale;
	camera.x = point.x - (point.x - camera.x) * ratio;
	camera.y = point.y - (point.y - camera.y) * ratio;
	camera.scale = scale;
	updateCamera();
}
const pointers = new Map();
let moved = false;
let pinchDistance;
svg.addEventListener("pointerdown", (event) => {
	pointers.set(event.pointerId, svgPoint(event.clientX, event.clientY));
	moved = false;
	svg.classList.add("dragging");
});
svg.addEventListener("pointermove", (event) => {
	if (!pointers.has(event.pointerId)) return;
	const before = pointers.get(event.pointerId);
	const current = svgPoint(event.clientX, event.clientY);
	const dx = current.x - before.x;
	const dy = current.y - before.y;
	if (!moved && Math.hypot(dx, dy) < 3) return;
	moved = true;
	svg.setPointerCapture(event.pointerId);
	pointers.set(event.pointerId, current);
	if (pointers.size === 2) {
		const [a, b] = [...pointers.values()];
		const distance = Math.hypot(a.x - b.x, a.y - b.y);
		if (pinchDistance) zoom(distance / pinchDistance, { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 });
		pinchDistance = distance;
	} else {
		camera.x += dx;
		camera.y += dy;
		updateCamera();
	}
});
function endPointer(event) {
	pointers.delete(event.pointerId);
	pinchDistance = undefined;
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
$("#zoom-in").addEventListener("click", () => zoom(1.2));
$("#zoom-out").addEventListener("click", () => zoom(1 / 1.2));
$("#recenter").addEventListener("click", () => {
	camera = { x: 0, y: 0, scale: 1 };
	updateCamera();
	selectPlanet(planets[0]);
});
for (const button of document.querySelectorAll("[data-tab]")) {
	button.addEventListener("click", () => {
		for (const tab of document.querySelectorAll("[data-tab]")) {
			tab.classList.toggle("active", tab === button);
			tab.removeAttribute("aria-current");
		}
		button.setAttribute("aria-current", "page");
		$("#fleet-panel").hidden = button.dataset.tab !== "fleets";
		$(".selection").hidden = button.dataset.tab === "fleets";
		if (button.dataset.tab === "colonies") {
			selectPlanet(planets[0]);
			notify("Your colonies: Vega · 14:6, Kepler · 15:3");
		}
	});
}
let statusTimeout;
function notify(text) {
	$("#status").textContent = text;
	clearTimeout(statusTimeout);
	statusTimeout = setTimeout(() => {
		$("#status").textContent = "";
	}, 3500);
}
$("#planet-action").addEventListener("click", () =>
	notify(
		`${selected.name} · ${selected.id}: ${selected.owner === "own" ? "colony details" : "fleet dispatch"} is outside this map prototype.`,
	),
);

const reducedMotion = matchMedia("(prefers-reduced-motion: reduce)");
function tick() {
	const now = Date.now();
	let active = 0;
	for (const fleet of fleets) {
		const progress = Math.min(1, Math.max(0, (now - fleet.departure) / (fleet.arrival - fleet.departure)));
		const length = fleet.length;
		const point = fleet.path.getPointAtLength(length * progress);
		const next = fleet.path.getPointAtLength(Math.min(length, length * progress + 1));
		const angle = (Math.atan2(next.y - point.y, next.x - point.x) * 180) / Math.PI;
		fleet.ship.setAttribute("transform", `translate(${point.x} ${point.y}) rotate(${angle})`);
		fleet.ship.dataset.progress = progress.toFixed(5);
		fleet.ship.style.display = progress < 1 ? "" : "none";
		const seconds = Math.max(0, Math.ceil((fleet.arrival - now) / 1000));
		$(`[data-eta='${fleet.id}']`).textContent = seconds
			? `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`
			: "Arrived";
		if (seconds) active++;
	}
	$("#flight-summary").textContent = `${active} fleets in flight`;
	$(".badge").textContent = active;
	if (reducedMotion.matches) setTimeout(tick, 1000);
	else requestAnimationFrame(tick);
}

// Minimal Telegram bridge, no SDK download. The host already implements these events.
function send(eventType, eventData = {}) {
	if (parent !== window) parent.postMessage(JSON.stringify({ eventType, eventData }), location.origin);
}
const themeParams = JSON.parse(
	new URLSearchParams(location.hash.slice(1)).get("tgWebAppThemeParams") || "{}",
);
if (themeParams.bg_color) document.documentElement.style.setProperty("--tg-bg", themeParams.bg_color);
send("web_app_ready");
send("web_app_expand");
send("web_app_set_header_color", { color: "#222d31" });
send("web_app_setup_swipe_behavior", { allow_vertical_swipe: false });
send("web_app_request_theme");
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
selectPlanet(selected);
updateCamera();
tick();
document.body.dataset.ready = "true";
