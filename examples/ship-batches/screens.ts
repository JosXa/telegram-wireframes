// Turns a ship batch state into one Telegram screen. Every button's callback data is a model action,
// and its navigation target is the encoded state that action produces.
import type {
	CallbackAnswer,
	Fixture,
	FixtureMessage,
	InlineKeyboardButton,
	MessageEntity,
} from "../../src/fixture";
import {
	act,
	buildable,
	cost,
	countOf,
	covers,
	decode,
	encode,
	initial,
	type Line,
	maxCompositions,
	maxFor,
	maxTimes,
	missing,
	planet,
	progress,
	type Resources,
	reply,
	type State,
	scaled,
	seconds,
	ships,
	stationedNow,
	takesReply,
	total,
	type Variant,
} from "./model";

export const quantity = (value: number) => String(Math.trunc(value)).replace(/\B(?=(\d{3})+(?!\d))/g, " ");
export const resources = (value: Resources) => `💠 ${quantity(value.minerals)} · 🔥 ${quantity(value.gas)}`;

/** At most two adjacent units, such as 21m 40s or 1h 5m. */
export function duration(value: number) {
	const time = Math.max(0, Math.ceil(value));
	const units: [number, string][] = [
		[Math.floor(time / 3600), "h"],
		[Math.floor((time % 3600) / 60), "m"],
		[time % 60, "s"],
	];
	const first = units.findIndex(([amount]) => amount > 0);
	if (first < 0) return "0s";
	return units
		.slice(first, first + 2)
		.filter(([amount]) => amount > 0)
		.map(([amount, unit]) => `${amount}${unit}`)
		.join(" ");
}

class Rich {
	text = "";
	entities: MessageEntity[] = [];
	add(text: string) {
		this.text += text;
		return this;
	}
	mark(type: MessageEntity["type"], text: string) {
		if (text) this.entities.push({ type, offset: this.text.length, length: text.length });
		return this.add(text);
	}
	line(text = "") {
		return this.add(`${text}\n`);
	}
	gap() {
		if (this.text && !this.text.endsWith("\n\n")) this.add("\n");
		return this;
	}
	tree(items: string[]) {
		for (const [index, item] of items.entries())
			this.line(`${index === items.length - 1 ? "└" : "├"} ${item}`);
		return this;
	}
	done() {
		return { text: this.text.trimEnd(), entities: this.entities };
	}
}

type Row = InlineKeyboardButton[];

class Screen {
	navigation: Record<string, string> = {};
	answers: Record<string, CallbackAnswer> = {};
	private toasts = 0;
	constructor(readonly state: State) {}
	nav(text: string, action: string, style?: InlineKeyboardButton["style"]): InlineKeyboardButton {
		this.navigation[action] = encode(act(this.state, action));
		return { text, callback_data: action, ...(style ? { style } : {}) };
	}
	toast(text: string, answer: string): InlineKeyboardButton {
		const data = `t:${++this.toasts}`;
		this.answers[data] = { text: answer };
		return { text, callback_data: data };
	}
	locked(text: string, answer: string) {
		return this.toast(`🔒 ${text}`, answer);
	}
	inert(text: string): InlineKeyboardButton {
		return { text, disabled: {} };
	}
}

const ship = (index: number) => {
	const found = ships[index];
	if (!found) throw new Error(`Unknown ship ${index}`);
	return found;
};
const pairs = <T>(items: T[]) =>
	Array.from({ length: Math.ceil(items.length / 2) }, (_, index) => items.slice(index * 2, index * 2 + 2));
const indexes = ships.map((_, index) => index);
const open = indexes.filter(buildable);
const closed = indexes.filter((index) => !buildable(index));
const lockedReason = (index: number) => `Needs the Orbital Shipyard at level ${ship(index).level} first.`;
const stats = (index: number) => {
	const { attack, hull, cargo, speed } = ship(index);
	return `Attack ${attack} · Hull ${hull} · Cargo capacity ${cargo} · Speed ${speed}`;
};
const perShip = (index: number) =>
	`Per ship: ${resources(ship(index).cost)} · ${duration(ship(index).seconds)}`;
const lineup = (lines: readonly Line[]) => {
	const names = lines.map(([index, count]) => `${ship(index).name} × ${count}`);
	return names.length > 1 ? `${names.slice(0, -1).join(", ")} and ${names.at(-1)}` : (names[0] ?? "");
};
const composerName = (state: State) => (state.batch ? "Add to ship batch" : "New ship batch");
const composerTitle = (state: State) => (state.batch ? "➕ Add to ship batch" : "🚀 New ship batch");

function header(rich: Rich, title: string, state: State) {
	rich.mark("bold", title).line();
	rich.line(`${planet.name} · ${planet.coordinates}`);
	rich.line(resources(state.stock)).line();
}

function stationedBlock(rich: Rich, state: State) {
	const counts = stationedNow(state);
	rich.mark("bold", "Stationed ships").line();
	const items = counts.flatMap((count, index) => (count > 0 ? [`${ship(index).name} × ${count}`] : []));
	if (items.length) rich.tree(items);
	else rich.line("No ships are stationed here yet.");
}

function batchBlock(rich: Rich, state: State) {
	if (!state.batch) return;
	const run = progress(state.batch);
	rich.mark("bold", `Ship batch · ${run.done} of ${run.count} ready`).line();
	rich.tree(
		run.lines.map((line) => {
			const name = ship(line.ship).name;
			if (line.done === line.count) return `✓ ${name} ${line.done} / ${line.count}`;
			if (line.nextIn !== undefined)
				return `🔨 ${name} ${line.done} / ${line.count} · next in ${duration(line.nextIn)}`;
			return `⏳ ${name} ${line.done} / ${line.count}`;
		}),
	);
	rich.line(`Ready in ${duration(run.remaining)}`);
}

const hints: Record<Variant, string> = {
	A: "Tap ➕ beside a ship type to add it.",
	B: "Pick a ship type, then set its amount.",
	C: "Open a ship type to set its amount.",
	D: "Reply with an order to fill the batch.",
	E: "Open a ship type to set its amount.",
	F: "Pick a ship type, then set its amount.",
	G: "Tap a ship type and reply with an amount.",
};

function draftBlock(rich: Rich, state: State, lines: readonly Line[], marker?: number) {
	if (state.batch) {
		const run = progress(state.batch);
		rich.line(
			`In production: ${run.count - run.done} of ${run.count} ships left · ready in ${duration(run.remaining)}`,
		);
		rich.line();
	}
	if (!lines.length) {
		rich.line(hints[state.v]);
		return;
	}
	rich.tree(
		lines.map(
			([index, count]) =>
				`${marker === index ? "▸ " : ""}${ship(index).name} × ${count} · ${duration(ship(index).seconds * count)}`,
		),
	);
	const ready = seconds(lines) + (state.batch ? progress(state.batch).remaining : 0);
	rich.line(
		state.batch
			? `Adding ${resources(cost(lines))} · batch ready in ${duration(ready)}`
			: `Batch: ${resources(cost(lines))} · ready in ${duration(ready)}`,
	);
	if (!covers(state.stock, cost(lines)))
		rich.line(`Mirsol is short of ${resources(missing(state.stock, cost(lines)))}.`);
}

function note(rich: Rich, state: State) {
	if (state.note) rich.gap().mark("italic", state.note).line();
}

function buildButton(screen: Screen, lines: readonly Line[], action = "build"): Row {
	const { state } = screen;
	const count = total(lines);
	const verb = state.batch ? "Add" : "Build";
	if (!count) return [screen.locked(verb, "Add ships to the batch first.")];
	const amount = cost(lines);
	const label = `${verb} ${count} ${count === 1 ? "ship" : "ships"}`;
	if (!covers(state.stock, amount))
		return [screen.locked(label, `Mirsol is short of ${resources(missing(state.stock, amount))}.`)];
	return [screen.nav(`🚀 ${label} · ${resources(amount)}`, action, "success")];
}

const back = (screen: Screen, label: string, action: string): Row => [screen.nav(`⬅️ ${label}`, action)];
const lockedRows = (screen: Screen): Row[] =>
	closed.map((index) => [screen.locked(ship(index).name, lockedReason(index))]);

function stepper(screen: Screen, index: number): Row[] {
	const { state } = screen;
	const count = countOf(state.draft, index);
	const max = maxFor(state, index);
	const none = `No ${ship(index).plural} in the batch yet.`;
	const full = `Mirsol's stock covers no more ${ship(index).plural}.`;
	const minus = (step: number) =>
		count > 0 ? screen.nav(`−${step}`, `dec:${index}:${step}`) : screen.toast(`−${step}`, none);
	const plus = (step: number) =>
		count < max ? screen.nav(`+${step}`, `inc:${index}:${step}`) : screen.toast(`+${step}`, full);
	return [
		[minus(10), minus(1), screen.inert(String(count)), plus(1), plus(10)],
		[
			max > 0 ? screen.nav(`Max · ${max}`, `max:${index}`) : screen.toast("Max · 0", full),
			screen.nav("✏️ Type amount", `ask:${index}`),
		],
	];
}

const typeLabel = (state: State, index: number, selected?: number) => {
	const count = countOf(state.draft, index);
	return `${selected === index ? "• " : ""}${ship(index).name}${count ? ` · ${count}` : ""}`;
};

function selectedBlock(rich: Rich, state: State, index: number) {
	rich
		.gap()
		.mark("bold", ship(index).name)
		.line(` × ${countOf(state.draft, index)}`);
	rich.line(stats(index));
	rich.line(perShip(index));
}

type Message = Omit<FixtureMessage, "from">;
const textMessage = (rich: Rich, rows: Row[]): Message => {
	const { text, entities } = rich.done();
	return { text, entities, reply_markup: { inline_keyboard: rows } };
};
const photoMessage = (index: number, rich: Rich, rows: Row[]): Message => {
	const { text, entities } = rich.done();
	return {
		photo: `art/${ship(index).key}.jpg`,
		caption: text,
		caption_entities: entities,
		reply_markup: { inline_keyboard: rows },
	};
};

function composeScreen(screen: Screen, sel: number, step: number): Message {
	const { state } = screen;
	const rich = new Rich();
	const v = state.v;
	header(rich, composerTitle(state), state);
	const marked = v === "B" || v === "F";
	draftBlock(rich, state, state.draft, marked ? sel : undefined);
	if (v === "D" && state.draft.length) rich.gap().line("Reply with a new order to replace this one.");
	if (marked) selectedBlock(rich, state, sel);
	note(rich, state);
	const rows: Row[] = [];
	if (v === "A") {
		for (const index of open) {
			const count = countOf(state.draft, index);
			const name = ship(index).name;
			const plus =
				count < maxFor(state, index)
					? screen.nav(`➕ ${name}`, `inc:${index}:${step}`)
					: screen.toast(`➕ ${name}`, `Mirsol's stock covers no more ${ship(index).plural}.`);
			rows.push(count > 0 ? [screen.nav(`➖ ${name}`, `dec:${index}:${step}`), plus] : [plus]);
		}
		rows.push(...lockedRows(screen));
		rows.push([1, 10, 100].map((size) => screen.nav(`${size === step ? "• " : ""}±${size}`, `step:${size}`)));
	} else if (marked) {
		rows.push(...pairs(open.map((index) => screen.nav(typeLabel(state, index, sel), `sel:${index}`))));
		rows.push(...lockedRows(screen));
		rows.push(...stepper(screen, sel));
	} else if (v === "C" || v === "E" || v === "G") {
		const action = v === "G" ? "ask" : "open";
		rows.push(...pairs(open.map((index) => screen.nav(typeLabel(state, index), `${action}:${index}`))));
		rows.push(...lockedRows(screen));
		if (v === "E" && state.draft.length)
			rows.push([
				state.comps.length < maxCompositions
					? screen.nav("💾 Save as composition", "save")
					: screen.locked(
							"Save as composition",
							`${maxCompositions} compositions are saved. Remove one first.`,
						),
			]);
	}
	rows.push(buildButton(screen, state.draft));
	if (v === "D") rows.push([screen.nav("✏️ Write a new order", "order")]);
	rows.push(back(screen, "Shipyard", "home"));
	return v === "F" ? photoMessage(sel, rich, rows) : textMessage(rich, rows);
}

function shipScreen(screen: Screen, index: number): Message {
	const { state } = screen;
	const rich = new Rich();
	header(rich, `🚀 ${ship(index).name}`, state);
	const { attack, hull, cargo, speed } = ship(index);
	const table: [string, number][] = [
		["Attack", attack],
		["Hull", hull],
		["Cargo capacity", cargo],
		["Speed", speed],
	];
	const width = Math.max(...table.map(([label]) => label.length)) + 1;
	rich.mark(
		"pre",
		table.map(([label, value]) => `${label.padEnd(width)}${String(value).padStart(5)}`).join("\n"),
	);
	rich.line().line();
	const count = countOf(state.draft, index);
	rich.line(
		`In this batch: ${count}${count ? ` · ${resources(cost([[index, count]]))} · ${duration(ship(index).seconds * count)}` : ""}`,
	);
	rich.line(perShip(index));
	rich.line(`Stationed here: ${stationedNow(state)[index] ?? 0}`);
	note(rich, state);
	return photoMessage(index, rich, [...stepper(screen, index), back(screen, composerName(state), "back")]);
}

function amountScreen(screen: Screen, index: number, returnsTo: "compose" | "ship"): Message {
	const { state } = screen;
	const rich = new Rich();
	header(rich, `✏️ How many ${ship(index).plural}?`, state);
	rich.line(stats(index));
	rich.line(perShip(index));
	const count = countOf(state.draft, index);
	const max = maxFor(state, index);
	rich.line(`In this batch: ${count}`);
	rich.line().line(`Mirsol's stock covers up to ${max}. Reply with a number.`);
	note(rich, state);
	const amounts: Row = [
		max > 0
			? screen.nav(`Max · ${max}`, `max:${index}`)
			: screen.toast("Max · 0", `Mirsol's stock covers no more ${ship(index).plural}.`),
	];
	if (count > 0) amounts.push(screen.nav("🗑 Remove", `zero:${index}`));
	const parent = returnsTo === "ship" ? ship(index).name : composerName(state);
	return textMessage(rich, [amounts, back(screen, parent, "back")]);
}

function orderScreen(screen: Screen): Message {
	const { state } = screen;
	const rich = new Rich();
	header(rich, state.batch ? "✏️ Add to ship batch" : "✏️ Ship order", state);
	if (state.batch) draftBlock(rich, state, []);
	else rich.line("Reply with an amount for each ship type, such as 12 starter, 4 raiding and 2 line.");
	rich.line(`The yard builds ${open.map((index) => ship(index).word).join(", ")}.`);
	note(rich, state);
	const rows: Row[] = [];
	if (!state.batch && state.last.length) rows.push([screen.nav("🔁 Last batch", "last")]);
	rows.push(back(screen, "Shipyard", "home"));
	return textMessage(rich, rows);
}

function compositionsBlock(rich: Rich, state: State) {
	rich.gap().mark("bold", "Compositions").line();
	if (!state.comps.length) rich.line("No compositions are saved yet.");
	else rich.tree(state.comps.map((comp) => `${comp.name}: ${lineup(comp.lines)}`));
}

const presetButtons = (screen: Screen) =>
	pairs(screen.state.comps.map((comp, index) => screen.nav(`📋 ${comp.name}`, `preset:${index}`)));

function homeScreen(screen: Screen): Message {
	const { state } = screen;
	const rich = new Rich();
	header(rich, "🚀 Shipyard", state);
	const rows: Row[] = [];
	if (state.batch) {
		batchBlock(rich, state);
		rich.line();
		stationedBlock(rich, state);
		rows.push([screen.nav("➕ Add ships", "add")], [screen.nav("🔄 Refresh", "refresh")]);
	} else {
		stationedBlock(rich, state);
		rich.line("No ship batch is in production.");
		if (state.v === "E") compositionsBlock(rich, state);
		if (state.last.length) {
			const amount = cost(state.last);
			rows.push([
				covers(state.stock, amount)
					? screen.nav("🔁 Last batch", "last")
					: screen.locked("Last batch", `Mirsol is short of ${resources(missing(state.stock, amount))}.`),
			]);
		}
		if (state.v === "E") rows.push(...presetButtons(screen));
		rows.push([screen.nav(state.v === "D" ? "✏️ Write a ship order" : "🚀 New ship batch", "new")]);
	}
	note(rich, state);
	rows.push(back(screen, "Command Center", "center"));
	return textMessage(rich, rows);
}

function pickScreen(screen: Screen): Message {
	const { state } = screen;
	const rich = new Rich();
	header(rich, composerTitle(state), state);
	draftBlock(rich, state, []);
	compositionsBlock(rich, state);
	note(rich, state);
	return textMessage(rich, [
		...presetButtons(screen),
		[screen.nav("🛠 Pick ships", "pick")],
		back(screen, "Shipyard", "home"),
	]);
}

function presetScreen(screen: Screen, comp: number, times: number): Message {
	const { state } = screen;
	const chosen = state.comps[comp];
	if (!chosen) throw new Error(`Unknown composition ${comp}`);
	const lines = scaled(chosen.lines, times);
	const rich = new Rich();
	header(rich, `📋 ${chosen.name} × ${times}`, state);
	draftBlock(rich, state, lines);
	note(rich, state);
	const max = maxTimes(state, chosen.lines);
	const short = `Mirsol's stock covers up to ×${max}.`;
	return textMessage(rich, [
		[1, 2, 3, 5, 10].map((size) =>
			size > max
				? screen.toast(`×${size}`, short)
				: screen.nav(`${size === times ? "• " : ""}×${size}`, `times:${size}`),
		),
		[
			max > 0 ? screen.nav(`Max · ×${max}`, `times:${max}`) : screen.toast("Max · ×0", short),
			screen.nav("✏️ Edit lines", "edit"),
		],
		buildButton(screen, lines, "use"),
		[screen.nav("🗑 Remove composition", `remove:${comp}`)],
		state.batch ? back(screen, composerName(state), "add") : back(screen, "Shipyard", "home"),
	]);
}

function nameScreen(screen: Screen): Message {
	const { state } = screen;
	const rich = new Rich();
	header(rich, "💾 Name this composition", state);
	rich.tree(state.draft.map(([index, count]) => `${ship(index).name} × ${count}`));
	rich.line().line("Reply with a short name, such as Raid wing.");
	note(rich, state);
	return textMessage(rich, [back(screen, composerName(state), "back")]);
}

function centerScreen(screen: Screen): Message {
	const rich = new Rich();
	rich.mark("bold", "🛰 Command Center").line();
	rich.line(`🪐 ${planet.name} · ${planet.coordinates}`);
	rich.line(resources(screen.state.stock));
	return textMessage(rich, [
		[screen.nav("🚀 Shipyard", "home")],
		[screen.toast("⬅️ All views", "This preview covers the Shipyard.")],
	]);
}

function finishedMessage(screen: Screen): Message {
	const rich = new Rich();
	rich.mark("bold", "🚀 Ship batch finished").line();
	rich.line(`${planet.name} · ${planet.coordinates}`);
	rich.line().line(`${lineup(screen.state.last)} are stationed.`);
	return textMessage(rich, [[screen.nav("🔁 Build again", "last")], [screen.nav("🚀 Shipyard", "home")]]);
}

export function screenFor(state: State, echo?: string): Fixture {
	const screen = new Screen(state);
	const s = state.s;
	const messages: Message[] =
		s.k === "compose"
			? [composeScreen(screen, s.sel, s.step)]
			: s.k === "ship"
				? [shipScreen(screen, s.sel)]
				: s.k === "amount"
					? [amountScreen(screen, s.sel, s.back)]
					: s.k === "order"
						? [orderScreen(screen)]
						: s.k === "pick"
							? [pickScreen(screen)]
							: s.k === "preset"
								? [presetScreen(screen, s.comp, s.times)]
								: s.k === "name"
									? [nameScreen(screen)]
									: s.k === "center"
										? [centerScreen(screen)]
										: s.k === "finished"
											? [homeScreen(screen), finishedMessage(screen)]
											: [homeScreen(screen)];
	screen.navigation["/shipyard"] = encode(act(state, "home"));
	if (takesReply(state)) screen.navigation["*"] = `${encode(state)}!{text}`;
	return {
		bot: {
			first_name: "Space Emperors",
			username: "space_emperors_bot",
			color: 5,
			commands: [{ command: "shipyard", description: "Build ships for your planet" }],
		},
		user: { first_name: "Joscha" },
		messages: [
			...(echo ? [{ from: "user" as const, text: echo }] : []),
			...messages.map((message) => ({ from: "bot" as const, ...message })),
		],
		navigation: screen.navigation,
		answers: screen.answers,
	};
}

const sampleDraft: Line[] = [
	[0, 12],
	[1, 4],
	[3, 2],
];
const drafted = (v: Variant, s: State["s"]): State => ({ ...initial(v), s, draft: sampleDraft });
const producing = (v: Variant, elapsed: number): State => ({
	...initial(v),
	stock: { minerals: 8434 - 2160, gas: 4806 - 680 },
	batch: { lines: sampleDraft, elapsed },
});
const compose = (sel = 0, step = 1) => ({ k: "compose" as const, sel, step });

/** Named states: each variant's start and the screens the gallery shows. */
export const aliases: Record<string, { state: State; echo?: string }> = {
	...Object.fromEntries(
		(["A", "B", "C", "D", "E", "F", "G"] as const).map((v) => [`batches-${v}`, { state: initial(v) }]),
	),
	"batches-A-compose": { state: drafted("A", compose(0, 10)) },
	"batches-B-compose": { state: drafted("B", compose(1)) },
	"batches-B-amount": { state: drafted("B", { k: "amount", sel: 1, back: "compose" }) },
	"batches-C-compose": { state: drafted("C", compose()) },
	"batches-C-ship": { state: drafted("C", { k: "ship", sel: 1 }) },
	"batches-D-order": { state: { ...initial("D"), s: { k: "order" } } },
	"batches-D-reply": {
		state: reply({ ...initial("D"), s: { k: "order" } }, "12 starter, 4 raid, 2 line"),
		echo: "12 starter, 4 raid, 2 line",
	},
	"batches-E-home": { state: initial("E") },
	"batches-E-preset": { state: { ...initial("E"), s: { k: "preset", comp: 0, times: 3 } } },
	"batches-E-compose": { state: drafted("E", compose()) },
	"batches-F-compose": { state: drafted("F", compose(1)) },
	"batches-F-line": { state: drafted("F", compose(3)) },
	"batches-G-compose": { state: drafted("G", compose()) },
	"batches-G-amount": { state: drafted("G", { k: "amount", sel: 2, back: "compose" }) },
	"batches-G-reply": {
		state: reply(drafted("G", { k: "amount", sel: 2, back: "compose" }), "6"),
		echo: "6",
	},
	"batches-production": { state: producing("C", 680) },
	"batches-add": {
		state: { ...producing("A", 680), s: compose(0, 1), draft: [[2, 3]] },
	},
	"batches-finished": { state: act(producing("C", 1700), "refresh") },
};

/** Resolves a fixture name: an alias, an encoded state, or an encoded state plus a typed reply. */
export function fixtureFor(name: string): Fixture | undefined {
	const alias = aliases[name];
	if (alias) return screenFor(alias.state, alias.echo);
	if (!name.startsWith("s.")) return undefined;
	const split = name.indexOf("!");
	if (split < 0) return screenFor(decode(name));
	return screenFor(reply(decode(name.slice(0, split)), decodeURIComponent(name.slice(split + 1))));
}
