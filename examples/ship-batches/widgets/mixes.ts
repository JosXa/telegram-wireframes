// Mixes: the last batch and saved mixes, each built in multiples. Saving a mix needs a typed name,
// so the bot asks for it in a reply after the inline button under the message.

import { $, all, changed, cost, name, res, run, stock, X } from "./common";
import type { Line } from "./data";

let selected = -1;
let times = 1;

const mixes = (): [string, Line[]][] => [
	["🔁 Last batch", X.s.d ?? []],
	...(X.s.o ?? []).map(([n, l]): [string, Line[]] => [`📋 ${n}`, l]),
];
const most = (lines: Line[]) => {
	const one = cost(lines);
	const left = stock();
	return Math.max(0, Math.floor(Math.min(left[0] / one[0], left[1] / one[1])));
};

function pick(index: number, multiple = 1) {
	selected = index;
	const lines = mixes()[index][1];
	times = Math.max(1, Math.min(multiple, most(lines)));
	X.draft = most(lines) ? lines.map(([i, n]) => [i, n * times] as Line) : [];
	for (const card of all(".mx")) card.classList.toggle("on", Number(card.dataset.i) === index);
	changed();
}

run({
	empty: "Choose a mix",
	html: () =>
		`${mixes()
			.map(
				([title, lines], i) =>
					`<button class="mx" data-i="${i}"><b>${title}</b><small>${lines.map(([s, n]) => `${name(s)} × ${n}`).join(" · ")}</small><span>${res(cost(lines))}</span></button>`,
			)
			.join("")}<div class="pk" id="pk"><div class="steps">${[1, 2, 3, 5, 10]
			.map((n) => `<button class="b2" data-t="${n}">×${n}</button>`)
			.join("")}<button class="b2" data-t="max" id="mx"></button></div></div><div class="h" id="pv"></div>`,
	bind() {
		selected = -1;
		for (const card of all(".mx")) card.onclick = () => pick(Number(card.dataset.i));
		for (const button of all("#pk button"))
			button.onclick = () => {
				if (selected < 0) return;
				const lines = mixes()[selected][1];
				pick(selected, button.dataset.t === "max" ? most(lines) : Number(button.dataset.t));
			};
	},
	tick() {
		const on = selected >= 0;
		$("pk").style.display = on ? "" : "none";
		if (!on) {
			$("pv").textContent = "Pick a mix, then choose how many times to build it.";
			return;
		}
		const lines = mixes()[selected][1];
		const limit = most(lines);
		$("mx").textContent = `Max ×${limit}`;
		for (const button of all("#pk [data-t]")) {
			const t = button.dataset.t === "max" ? limit : Number(button.dataset.t);
			(button as HTMLButtonElement).disabled = t < 1 || t > limit;
			button.classList.toggle("on", t === times && button.dataset.t !== "max");
		}
		$("pv").textContent = X.draft.map(([i, n]) => `${name(i)} × ${n}`).join(" · ");
	},
});
