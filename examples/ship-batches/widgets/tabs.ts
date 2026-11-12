// Ship tabs: one tab per type with its amount; the selected type shows its stats, a slider and steps.
import {
	$,
	all,
	alone,
	changed,
	count,
	dur,
	lockedAt,
	most,
	paint,
	res,
	run,
	ship,
	slide,
	track,
	X,
} from "./common";
import type { CatalogEntry } from "./data";

let selected = 0;
let scale = 1;
const stats = ["Attack", "Hull", "Cargo", "Speed"];
const stat = (entry: CatalogEntry, s: number) => entry[4 + s] as number;

function card() {
	const entry = X.s.k[selected];
	const top = stats.map((_, s) => Math.max(...X.s.k.map((k) => stat(k, s))));
	$("card").innerHTML =
		`<div class="ln">${ship(selected, !entry[8])}<b>${entry[0]}</b><span>${res([entry[1], entry[2]])} · ${dur(entry[3] * 1e3)} each</span></div><div class="gr">${stats
			.map(
				(label, s) =>
					`<span>${label}</span><div class="bar"><i style="width:${Math.max(4, Math.sqrt(stat(entry, s) / (top[s] ?? 1)) * 100)}%"></i></div><span class="v">${entry[4 + s]}</span>`,
			)
			.join("")}</div>${
			entry[8]
				? `<div class="h">🔒 Needs the Orbital Shipyard at level ${entry[8]} first.</div>`
				: `<div class="pk"><b class="big" id="cn"></b>${track("")}</div><div class="steps">${[-10, -1, 1, 10]
						.map((d) => `<button class="b2" data-d="${d}">${d > 0 ? "+" : "−"}${Math.abs(d)}</button>`)
						.join("")}<button class="b2" data-d="max" id="mx"></button></div>`
		}`;
	if (entry[8]) return;
	scale = alone(selected);
	const set = slide("", selected, scale);
	for (const button of all(".steps button"))
		button.onclick = () =>
			set(button.dataset.d === "max" ? most(selected) : count(selected) + Number(button.dataset.d));
}

function select(index: number) {
	selected = index;
	for (const tab of all(".tab")) tab.classList.toggle("on", Number(tab.dataset.i) === index);
	card();
	changed();
}

run({
	html: () =>
		`<div class="tabs">${X.s.k.map((entry, i) => `<button class="tab" data-i="${i}">${ship(i, !entry[8])}<small id="c${i}"></small></button>`).join("")}</div><div id="card"></div>`,
	bind() {
		for (const tab of all(".tab")) tab.onclick = () => select(Number(tab.dataset.i));
		select(X.s.k[selected] && !lockedAt(selected) ? selected : 0);
	},
	tick() {
		X.s.k.forEach((_, i) => {
			$(`c${i}`).textContent = lockedAt(i) ? "🔒" : String(count(i) || "");
		});
		if (lockedAt(selected)) return;
		$("cn").textContent = String(count(selected));
		paint("", selected, scale);
		$("mx").textContent = `Max · ${most(selected)}`;
	},
});
