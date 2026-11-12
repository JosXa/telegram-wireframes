// Shared runtime of the Shipyard widgets. Each layout supplies only its composer; the frame, totals,
// order request and production view are the same. Bundled into one inline script per layout.
import type { Line, ShipyardData } from "./data";

type TelegramWidget = {
	chatData: string | null;
	request(data: string): Promise<{ result: string | null }>;
	onEvent(type: string, handler: () => void): void;
	ready(): void;
};

export type Composer = {
	/** Markup of the composer body. */
	html(): string;
	/** Binds handlers after the body is inserted. */
	bind(): void;
	/** Redraws what depends on the draft or the stock. */
	tick(): void;
	/** Button label for an empty draft, or nothing to offer the last batch again. */
	empty?: string;
};

const W = (window as unknown as { TelegramWidget?: TelegramWidget }).TelegramWidget;
export const $ = (id: string) => document.getElementById(id) as HTMLElement;
export const all = (selector: string) => [...document.querySelectorAll<HTMLElement>(selector)];

const paths = [
	"M3 10L12 5L17 8.5L37 10L17 11.5L12 15Z",
	"M3 10L15 6.5L20 2L24 7L35 8.5V11.5L25 14Q14 16 3 10Z",
	"M3 7H12L14 4H30L37 8V12L30 16H14L12 13H3V11H10V9H3Z",
	"M2 10L8 7H23L25 3H30L32 7L38 8.5V11.5L32 13H8Z",
	"M1 10L11 4.5H17L19 2H26L28 4.5H34L39 7V13L34 15.5H11Z",
];
/** A ship silhouette, sized by class. */
export const ship = (index: number, on = true) =>
	`<svg class="sh${on ? "" : " off"}" viewBox="0 0 40 20" width="${24 + index * 4}" height="${12 + index * 2}"><path d="${paths[index]}"/></svg>`;

export const num = (value: number) => {
	let n = Math.floor(value);
	if (n < 1e5) return String(n).replace(/\B(?=(\d{3})+(?!\d))/g, " ");
	let unit = -1;
	while (n >= 1e3 && unit < 2) {
		n /= 1e3;
		unit++;
	}
	return `${Math.floor(n * 10) / 10}${"KMB"[unit]}`;
};
export const dur = (ms: number) => {
	const t = Math.max(0, Math.ceil(ms / 1e3));
	const h = (t / 3600) | 0;
	const m = ((t / 60) | 0) % 60;
	const s = t % 60;
	return h ? `${h}h${m ? ` ${m}m` : ""}` : m ? `${m}m${s ? ` ${s}s` : ""}` : `${s}s`;
};
export const at = (time: number) =>
	new Date(time).toLocaleTimeString(navigator.language, { hour: "2-digit", minute: "2-digit" });
export const res = (amounts: number[]) => `💠 ${num(amounts[0])} · 🔥 ${num(amounts[1])}`;

/** The widget's state: the bot's chat_data, the local draft and the pending order. */
export const X = {
	s: {} as ShipyardData,
	draft: [] as Line[],
	add: false,
	busy: false,
	err: "",
};

export const name = (index: number) => X.s.k[index][0];
export const lockedAt = (index: number) => X.s.k[index][8];
export const count = (index: number) => X.draft.find((line) => line[0] === index)?.[1] ?? 0;
export const total = (lines: Line[] = X.draft) => lines.reduce((sum, line) => sum + line[1], 0);

/** Sets a type's amount: zero removes its line, a new type joins the end. */
export function put(index: number, amount: number) {
	const line = X.draft.find((entry) => entry[0] === index);
	if (amount <= 0) X.draft = X.draft.filter((entry) => entry[0] !== index);
	else if (line) line[1] = amount;
	else X.draft.push([index, amount]);
}

export const stock = (now = Date.now()) => {
	const hours = (now - X.s.t) / 3.6e6;
	return [X.s.m + X.s.rm * hours, X.s.g + X.s.rg * hours];
};
export const cost = (lines: Line[] = X.draft) =>
	lines.reduce((sum, [i, n]) => [sum[0] + X.s.k[i][1] * n, sum[1] + X.s.k[i][2] * n], [0, 0]);
export const seconds = (lines: Line[]) => lines.reduce((sum, [i, n]) => sum + X.s.k[i][3] * n, 0) * 1e3;

/** Most ships of a type the stock covers beside the rest of the draft. */
export const most = (index: number) => {
	const entry = X.s.k[index];
	const left = stock();
	const rest = cost(X.draft.filter((line) => line[0] !== index));
	return Math.max(0, Math.floor(Math.min((left[0] - rest[0]) / entry[1], (left[1] - rest[1]) / entry[2])));
};
/** Most ships of a type the stock covers on its own. */
export const alone = (index: number) => {
	const left = stock();
	return Math.max(1, Math.floor(Math.min(left[0] / X.s.k[index][1], left[1] / X.s.k[index][2])));
};

/** The running batch line by line, as the server builds it: ships one after another in order. */
export function plan(now: number) {
	const batch = X.s.b as NonNullable<ShipyardData["b"]>;
	let t = batch.s;
	let done = 0;
	let next: [number, number] | undefined;
	const rows = batch.l.map(([i, n]) => {
		const each = X.s.k[i][3] * 1e3;
		const start = t;
		t += each * n;
		const ready = Math.max(0, Math.min(n, Math.floor((now - start) / each)));
		done += ready;
		if (!next && ready < n && now >= start) next = [i, start + (ready + 1) * each - now];
		return [i, n, ready];
	});
	return { rows, done, total: total(batch.l), end: t, next };
}

/** When the draft would be ready: after the running batch when adding to it. */
export const readyAt = (now: number) => (X.add && X.s.b ? plan(now).end : now) + seconds(X.draft);

let composer: Composer;

export function run(layout: Composer) {
	composer = layout;
	W?.onEvent("chatDataChanged", load);
	load();
	setInterval(tick, 1000);
	W?.ready();
}

function load() {
	try {
		X.s = JSON.parse(W?.chatData ?? "null") ?? {};
	} catch {
		X.s = {} as ShipyardData;
	}
	X.add = false;
	X.busy = false;
	X.err = "";
	X.draft = [];
	build();
}

function build() {
	const producing = X.s.b && !X.add;
	$("app").innerHTML =
		`<div class="hd">${producing ? "🚀 Ship batch" : X.add ? "➕ Add to the ship batch" : "🚀 New ship batch"}</div><div class="sub">${X.s.p} · 🌐 ${X.s.c} · <span id="st"></span></div>${
			producing
				? `<div id="pl"></div><div class="tot" id="tot"></div><button class="go" id="go">➕ Add ships</button>`
				: `<div id="v">${composer.html()}</div><div class="tot" id="tot"></div><div class="msg" id="msg"></div><div class="row2">${X.add ? `<button class="b2" id="back">Back</button>` : ""}<button class="go" id="go"></button></div>`
		}`;
	if (producing)
		$("go").onclick = () => {
			X.add = true;
			X.draft = [];
			build();
		};
	else {
		composer.bind();
		$("go").onclick = order;
		if (X.add)
			$("back").onclick = () => {
				X.add = false;
				build();
			};
	}
	tick();
}

function tick() {
	const now = Date.now();
	$("st").textContent = res(stock(now));
	if (X.s.b && !X.add) {
		const p = plan(now);
		$("pl").innerHTML = p.rows
			.map(
				([i, n, ready]) =>
					`<div class="ln">${ship(i)}<b>${name(i)}</b><span>${ready} of ${n}${ready === n ? " ✓" : p.next?.[0] === i ? ` · next in ${dur(p.next[1])}` : ""}</span></div><div class="bar"><i style="width:${(ready / n) * 100}%"></i></div>`,
			)
			.join("");
		$("tot").innerHTML =
			p.done < p.total
				? `${p.done} of ${p.total} ready<span>all ready at ${at(p.end)} · in ${dur(p.end - now)}</span>`
				: `✅ ${p.total} ships stationed<span>at ${at(p.end)}</span>`;
		return;
	}
	changed();
}

/** Redraws the totals, the order button and the composer after the draft or the stock changed. */
export function changed() {
	const now = Date.now();
	const amount = total();
	const need = cost();
	const left = stock(now);
	const short = [
		need[0] > left[0] && `💠 ${num(Math.ceil(need[0] - left[0]))}`,
		need[1] > left[1] && `🔥 ${num(Math.ceil(need[1] - left[1]))}`,
	]
		.filter(Boolean)
		.join(" · ");
	const end = readyAt(now);
	$("tot").innerHTML = amount
		? `${res(need)}<span>ready at ${at(end)} · in ${dur(end - now)}</span>`
		: `<span>${X.add ? "New ships join the end of the batch." : ""}</span>`;
	const offer = !amount && !X.add && composer.empty === undefined && X.s.d?.length;
	const button = $("go") as HTMLButtonElement;
	button.disabled = X.busy || (!amount && !offer) || !!short;
	button.textContent = X.busy
		? "Sending the order to the yard…"
		: amount
			? `${X.add ? "Add" : "Build"} ${amount} ${amount === 1 ? "ship" : "ships"}`
			: offer
				? `🔁 Same again · ${res(cost(X.s.d))}`
				: (composer.empty ?? (X.add ? "Choose ships to add" : "Choose ships"));
	$("msg").textContent = short ? `${X.s.p} is short of ${short}.` : X.err;
	composer.tick();
}

function order() {
	if (!total()) {
		X.draft = X.s.d.map((line) => [...line] as Line);
		return changed();
	}
	if (!W) return;
	const request = W.request(`${X.add ? "a" : "b"}:${X.draft.map(([i, n]) => `${i}*${n}`).join(",")}`);
	X.busy = true;
	X.err = "";
	changed();
	request.then(
		({ result }) => {
			let reply: { e?: string } = {};
			try {
				reply = JSON.parse(result ?? "{}");
			} catch {}
			X.busy = false;
			X.err = reply.e ?? "";
			changed();
		},
		() => {
			X.busy = false;
			X.err = "The yard did not get the order. Try again.";
			changed();
		},
	);
}

/** A slider track. Horizontal drags belong to it (touch-action: pan-y in CSS); vertical drags scroll the chat. */
export const track = (id: string | number) =>
	`<div class="sl" id="sl${id}"><div class="tr"><i id="f${id}"></i><u id="u${id}"></u></div></div>`;

/**
 * Binds a type's slider: the track spans 0 to `scale` ships, amounts stay between `floor` and what the
 * stock covers, and a cancelled drag is undone. Returns the setter for step buttons.
 */
export function slide(id: string | number, index: number, scale: number, floor = 0) {
	const element = $(`sl${id}`);
	let box: DOMRect;
	let before = 0;
	const set = (amount: number) => {
		put(index, Math.max(floor, Math.min(amount, most(index))));
		changed();
	};
	const move = (event: PointerEvent) =>
		set(Math.round(Math.min(1, Math.max(0, (event.clientX - box.left) / box.width)) * scale));
	element.onpointerdown = (event) => {
		before = count(index);
		box = element.getBoundingClientRect();
		element.setPointerCapture(event.pointerId);
		move(event);
		element.onpointermove = move;
	};
	element.onpointerup = () => {
		element.onpointermove = null;
	};
	element.onpointercancel = () => {
		element.onpointermove = null;
		set(before);
	};
	return set;
}

/** Shows a type's amount on its track and hatches the stretch the stock cannot reach. */
export function paint(id: string | number, index: number, scale: number) {
	$(`f${id}`).style.width = `${(count(index) / scale) * 100}%`;
	$(`u${id}`).style.left = `${Math.min(1, most(index) / scale) * 100}%`;
}
