// Slider rows: every ship type has its own row with a slider and fine steps.
import { $, alone, count, lockedAt, paint, run, ship, slide, track, X } from "./common";

let scale: number[] = [];
const buildable = () => X.s.k.map((_, i) => i).filter((i) => !lockedAt(i));

run({
	html: () =>
		X.s.k
			.map((entry, i) =>
				entry[8]
					? `<div class="rw off">${ship(i, false)}<b>${entry[0]}</b><span class="h">🔒 Orbital Shipyard ${entry[8]}</span></div>`
					: `<div class="rw">${ship(i)}<b>${entry[0]}</b><span class="n" id="n${i}"></span>${track(i)}<button class="b2" id="m${i}">−</button><button class="b2" id="p${i}">+</button></div>`,
			)
			.join(""),
	bind() {
		scale = X.s.k.map((_, i) => alone(i));
		for (const i of buildable()) {
			const set = slide(i, i, scale[i]);
			$(`m${i}`).onclick = () => set(count(i) - 1);
			$(`p${i}`).onclick = () => set(count(i) + 1);
		}
	},
	tick() {
		for (const i of buildable()) {
			$(`n${i}`).textContent = String(count(i));
			paint(i, i, scale[i]);
		}
	},
});
