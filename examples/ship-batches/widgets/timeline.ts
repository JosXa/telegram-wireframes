// Build order: the batch as a timeline in build order. Each line shows when its last ship is ready,
// and moving a line earlier or later changes which ships the planet gets first.
import {
	$,
	all,
	alone,
	at,
	changed,
	count,
	most,
	name,
	paint,
	put,
	readyAt,
	run,
	seconds,
	ship,
	slide,
	track,
	X,
} from "./common";

let selected = -1;
let scale = 1;

function editor() {
	const line = X.draft[selected];
	if (!line) {
		$("ed").innerHTML = `<div class="h">The yard builds the lines from left to right.</div>`;
		return;
	}
	const i = line[0];
	$("ed").innerHTML =
		`<div class="ln">${ship(i)}<b>${name(i)}</b></div><div class="pk"><b class="big" id="cn"></b>${track("")}</div><div class="steps"><button class="b2" data-m="-1">◀ Earlier</button><button class="b2" data-m="1">Later ▶</button><button class="b2" data-m="0">✕ Remove</button></div>`;
	scale = alone(i);
	slide("", i, scale, 1);
	for (const button of all(".steps button"))
		button.onclick = () => {
			const move = Number(button.dataset.m);
			if (!move) {
				X.draft.splice(selected, 1);
				selected = Math.min(selected, X.draft.length - 1);
			} else {
				const to = selected + move;
				if (to < 0 || to >= X.draft.length) return;
				[X.draft[selected], X.draft[to]] = [X.draft[to], X.draft[selected]];
				selected = to;
			}
			editor();
			changed();
		};
}

function select(index: number) {
	selected = index;
	editor();
	changed();
}

run({
	html: () =>
		`<div class="tl" id="tl"></div><div id="ls"></div><div class="add">${X.s.k
			.map(
				(entry, i) =>
					`<button class="b2" data-i="${i}"${entry[8] ? " disabled" : ""}>${ship(i, !entry[8])}${entry[8] ? "🔒" : "+"}</button>`,
			)
			.join("")}</div><div id="ed"></div>`,
	bind() {
		selected = X.draft.length ? 0 : -1;
		for (const button of all(".add button"))
			button.onclick = () => {
				const i = Number(button.dataset.i);
				if (!count(i) && most(i) < 1) return;
				if (!count(i)) put(i, 1);
				select(X.draft.findIndex((line) => line[0] === i));
			};
		editor();
	},
	tick() {
		const want = X.draft.length ? Math.min(Math.max(selected, 0), X.draft.length - 1) : -1;
		if (want !== selected) return select(want);
		const now = Date.now();
		const whole = seconds(X.draft) || 1;
		let end = readyAt(now) - seconds(X.draft);
		$("tl").innerHTML = X.draft
			.map(
				([i, n], j) =>
					`<button class="sg${j === selected ? " on" : ""}" data-j="${j}" style="flex:${Math.max(0.12, seconds([[i, n]]) / whole)}">${ship(i)}</button>`,
			)
			.join("");
		$("ls").innerHTML = X.draft
			.map(([i, n], j) => {
				end += seconds([[i, n]]);
				return `<div class="ln it${j === selected ? " on" : ""}" data-j="${j}"><b>${name(i)} × ${n}</b><span>ready ${at(end)}</span></div>`;
			})
			.join("");
		for (const item of all("[data-j]")) item.onclick = () => select(Number(item.dataset.j));
		const line = X.draft[selected];
		if (!line) return;
		$("cn").textContent = String(line[1]);
		paint("", line[0], scale);
	},
});
