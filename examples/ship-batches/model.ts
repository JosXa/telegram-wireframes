// Mixed ship batches: a planet builds one batch at a time, with one line per ship type, in the order
// the player composed it. The whole batch is charged when it is placed. This model is pure, so every
// preview screen is a function of a state that fits into the fixture name.

export type Resources = { minerals: number; gas: number };

export type Ship = {
	key: string;
	name: string;
	plural: string;
	/** The word a written order uses for this type. */
	word: string;
	cost: Resources;
	seconds: number;
	/** Shipyard level that unlocks the type. */
	level: number;
	attack: number;
	hull: number;
	cargo: number;
	speed: number;
};

/** The provisional gamebot catalog with its placeholder names, while the class names are held. */
export const ships: readonly Ship[] = [
	{
		key: "starterCombat",
		name: "Starter ship",
		plural: "Starter ships",
		word: "starter",
		cost: { minerals: 40, gas: 10 },
		seconds: 45,
		level: 1,
		attack: 5,
		hull: 30,
		cargo: 20,
		speed: 12,
	},
	{
		key: "lootRaiding",
		name: "Raiding ship",
		plural: "Raiding ships",
		word: "raiding",
		cost: { minerals: 120, gas: 40 },
		seconds: 120,
		level: 2,
		attack: 6,
		hull: 80,
		cargo: 250,
		speed: 10,
	},
	{
		key: "smallCombat",
		name: "Strike ship",
		plural: "Strike ships",
		word: "strike",
		cost: { minerals: 160, gas: 50 },
		seconds: 150,
		level: 3,
		attack: 24,
		hull: 150,
		cargo: 30,
		speed: 9,
	},
	{
		key: "mediumLine",
		name: "Line ship",
		plural: "Line ships",
		word: "line",
		cost: { minerals: 600, gas: 200 },
		seconds: 480,
		level: 5,
		attack: 100,
		hull: 640,
		cargo: 120,
		speed: 7,
	},
	{
		key: "heavyLine",
		name: "Heavy line ship",
		plural: "Heavy line ships",
		word: "heavy",
		cost: { minerals: 2000, gas: 700 },
		seconds: 1500,
		level: 8,
		attack: 370,
		hull: 2400,
		cargo: 300,
		speed: 4,
	},
];

export const shipyardLevel = 5;
export const planet = { name: "Mirsol", coordinates: "🌐 1:1:6" };
export const maxCompositions = 4;

export const variantIds = ["A", "B", "C", "D", "E", "F", "G"] as const;
export type Variant = (typeof variantIds)[number];

/** [ship index, count]; a list holds each ship type once, in the order it was added. */
export type Line = [ship: number, count: number];
export type Composition = { name: string; lines: Line[] };
export type Batch = { lines: Line[]; elapsed: number };

export type Screen =
	| { k: "home" }
	| { k: "center" }
	| { k: "compose"; sel: number; step: number }
	| { k: "ship"; sel: number }
	| { k: "amount"; sel: number; back: "compose" | "ship" }
	| { k: "order" }
	| { k: "pick" }
	| { k: "preset"; comp: number; times: number }
	| { k: "name" }
	| { k: "finished" };

export type State = {
	v: Variant;
	s: Screen;
	stock: Resources;
	stationed: number[];
	batch: Batch | null;
	last: Line[];
	draft: Line[];
	comps: Composition[];
	/** One-time feedback for the next screen. */
	note?: string;
};

export function initial(v: Variant): State {
	return {
		v,
		s: { k: "home" },
		stock: { minerals: 8434, gas: 4806 },
		stationed: [6, 1, 0, 0, 0],
		batch: null,
		last: [
			[0, 12],
			[1, 4],
			[3, 2],
		],
		draft: [],
		comps:
			v === "E"
				? [
						{
							name: "Raid wing",
							lines: [
								[1, 2],
								[0, 4],
							],
						},
						{
							name: "Home guard",
							lines: [
								[2, 3],
								[3, 1],
							],
						},
					]
				: [],
	};
}

const ship = (index: number) => {
	const found = ships[index];
	if (!found) throw new Error(`Unknown ship ${index}`);
	return found;
};

export const buildable = (index: number) => ship(index).level <= shipyardLevel;
export const firstBuildable = () => ships.findIndex((_, index) => buildable(index));

export function cost(lines: readonly Line[]): Resources {
	return lines.reduce(
		(sum, [index, count]) => ({
			minerals: sum.minerals + ship(index).cost.minerals * count,
			gas: sum.gas + ship(index).cost.gas * count,
		}),
		{ minerals: 0, gas: 0 },
	);
}

export const seconds = (lines: readonly Line[]) =>
	lines.reduce((sum, [index, count]) => sum + ship(index).seconds * count, 0);
export const total = (lines: readonly Line[]) => lines.reduce((sum, [, count]) => sum + count, 0);
export const countOf = (lines: readonly Line[], index: number) =>
	lines.find(([shipIndex]) => shipIndex === index)?.[1] ?? 0;

export function setCount(lines: readonly Line[], index: number, count: number): Line[] {
	if (count <= 0) return lines.filter(([shipIndex]) => shipIndex !== index);
	if (lines.some(([shipIndex]) => shipIndex === index))
		return lines.map((line) => (line[0] === index ? [index, count] : line));
	return [...lines, [index, count]];
}

export const covers = (stock: Resources, amount: Resources) =>
	stock.minerals >= amount.minerals && stock.gas >= amount.gas;
export const missing = (stock: Resources, amount: Resources): Resources => ({
	minerals: Math.max(0, amount.minerals - stock.minerals),
	gas: Math.max(0, amount.gas - stock.gas),
});
const subtract = (stock: Resources, amount: Resources) => ({
	minerals: stock.minerals - amount.minerals,
	gas: stock.gas - amount.gas,
});

/** The most ships of one type the stock covers, next to the rest of the draft. */
export function maxFor(state: State, index: number) {
	const left = subtract(state.stock, cost(setCount(state.draft, index, 0)));
	const { cost: unit } = ship(index);
	return Math.max(0, Math.floor(Math.min(left.minerals / unit.minerals, left.gas / unit.gas)));
}

/** How many times the stock covers a composition. */
export function maxTimes(state: State, lines: readonly Line[]) {
	const unit = cost(lines);
	return Math.max(0, Math.floor(Math.min(state.stock.minerals / unit.minerals, state.stock.gas / unit.gas)));
}

export const scaled = (lines: readonly Line[], times: number): Line[] =>
	lines.map(([index, count]) => [index, count * times]);

export type LineProgress = { ship: number; count: number; done: number; nextIn?: number };

/** Ships finish one after another, line by line in the composed order. */
export function progress(batch: Batch) {
	let time = batch.elapsed;
	const lines: LineProgress[] = batch.lines.map(([index, count]) => {
		const each = ship(index).seconds;
		if (time >= each * count) {
			time -= each * count;
			return { ship: index, count, done: count };
		}
		const done = Math.floor(time / each);
		const nextIn = each - (time - done * each);
		time = 0;
		return { ship: index, count, done, nextIn };
	});
	const all = seconds(batch.lines);
	const current = lines.find((line) => line.nextIn !== undefined);
	if (current) for (const line of lines.slice(lines.indexOf(current) + 1)) delete line.nextIn;
	return {
		lines,
		done: lines.reduce((sum, line) => sum + line.done, 0),
		count: total(batch.lines),
		remaining: all - batch.elapsed,
	};
}

/** Added ships join their type's unfinished line; other types start a new line at the end. */
export function merge(batch: Batch, added: readonly Line[]): Line[] {
	const lines = progress(batch).lines.map((line) => ({ ...line }));
	for (const [index, count] of added) {
		const open = lines.find((line) => line.ship === index && line.done < line.count);
		if (open) open.count += count;
		else lines.push({ ship: index, count, done: 0 });
	}
	return lines.map((line) => [line.ship, line.count]);
}

/** One line per type again, for building the same batch a second time. */
export function collapse(lines: readonly Line[]): Line[] {
	return lines.reduce<Line[]>(
		(result, [index, count]) => setCount(result, index, countOf(result, index) + count),
		[],
	);
}

/** Stationed ships, including the ones the running batch has finished. */
export function stationedNow(state: State) {
	if (!state.batch) return state.stationed;
	const { lines } = progress(state.batch);
	return state.stationed.map(
		(count, index) => count + lines.filter((line) => line.ship === index).reduce((sum, l) => sum + l.done, 0),
	);
}

const composer = (state: State): Screen => {
	if (state.v === "D") return { k: "order" };
	return { k: "compose", sel: firstBuildable(), step: 1 };
};

function place(state: State, lines: readonly Line[]): State {
	const placed = state.batch ? merge(state.batch, lines) : [...lines];
	return {
		...state,
		s: { k: "home" },
		stock: subtract(state.stock, cost(lines)),
		batch: { lines: placed, elapsed: state.batch?.elapsed ?? 0 },
		draft: [],
	};
}

/** The preview's Refresh moves the clock forward, so a batch finishes within a few taps. */
export function refresh(state: State): State {
	if (!state.batch) return { ...state, s: { k: "home" } };
	const all = seconds(state.batch.lines);
	const elapsed = Math.min(all, state.batch.elapsed + Math.max(300, Math.ceil(all / 4)));
	if (elapsed < all) return { ...state, s: { k: "home" }, batch: { ...state.batch, elapsed } };
	return {
		...state,
		s: { k: "finished" },
		stationed: stationedNow({ ...state, batch: { ...state.batch, elapsed } }),
		last: collapse(state.batch.lines),
		batch: null,
	};
}

/** Where a prompt or ship page returns to. */
function leave(state: State): Screen {
	const s = state.s;
	if (s.k === "amount")
		return s.back === "ship" ? { k: "ship", sel: s.sel } : { k: "compose", sel: s.sel, step: 1 };
	if (s.k === "ship") return { k: "compose", sel: s.sel, step: 1 };
	if (s.k === "name") return { k: "compose", sel: firstBuildable(), step: 1 };
	return s;
}

/** Amount buttons on a prompt close it; on other screens they keep the screen. */
const afterAmount = (state: State): Screen => (state.s.k === "amount" ? leave(state) : state.s);

/** Applies one button's action. The callback data is the action string. */
export function act(state: State, action: string): State {
	const [verb = "", first = "0", second = "0"] = action.split(":");
	const a = Number(first);
	const b = Number(second);
	const next: State = { ...state, note: undefined };
	switch (verb) {
		case "home":
			return { ...next, s: { k: "home" }, draft: [] };
		case "center":
			return { ...next, s: { k: "center" }, draft: [] };
		case "new":
			return { ...next, s: composer(state), draft: [] };
		case "add":
			return { ...next, s: state.v === "E" ? { k: "pick" } : composer(state), draft: [] };
		case "pick":
			return { ...next, s: { k: "compose", sel: firstBuildable(), step: 1 } };
		case "last":
			return { ...next, s: { k: "compose", sel: firstBuildable(), step: 1 }, draft: collapse(state.last) };
		case "sel":
			return { ...next, s: { k: "compose", sel: a, step: state.s.k === "compose" ? state.s.step : 1 } };
		case "open":
			return { ...next, s: { k: "ship", sel: a } };
		case "ask":
			return { ...next, s: { k: "amount", sel: a, back: state.s.k === "ship" ? "ship" : "compose" } };
		case "back":
			return { ...next, s: leave(state) };
		case "inc":
			return {
				...next,
				draft: setCount(state.draft, a, Math.min(maxFor(state, a), countOf(state.draft, a) + b)),
			};
		case "dec":
			return { ...next, draft: setCount(state.draft, a, countOf(state.draft, a) - b) };
		case "max":
			return { ...next, s: afterAmount(state), draft: setCount(state.draft, a, maxFor(state, a)) };
		case "zero":
			return { ...next, s: afterAmount(state), draft: setCount(state.draft, a, 0) };
		case "step":
			return state.s.k === "compose" ? { ...next, s: { ...state.s, step: a } } : next;
		case "build":
			return place(next, state.draft);
		case "refresh":
			return refresh(next);
		case "order":
			return { ...next, s: { k: "order" } };
		case "preset":
			return { ...next, s: { k: "preset", comp: a, times: 1 } };
		case "times":
			return state.s.k === "preset" ? { ...next, s: { ...state.s, times: a } } : next;
		case "edit":
			if (state.s.k !== "preset") return next;
			return {
				...next,
				s: { k: "compose", sel: firstBuildable(), step: 1 },
				draft: scaled(state.comps[state.s.comp]?.lines ?? [], state.s.times),
			};
		case "use":
			if (state.s.k !== "preset") return next;
			return place(next, scaled(state.comps[state.s.comp]?.lines ?? [], state.s.times));
		case "remove":
			return {
				...next,
				s: state.batch ? { k: "pick" } : { k: "home" },
				comps: state.comps.filter((_, index) => index !== a),
			};
		case "save":
			return { ...next, s: { k: "name" } };
		default:
			throw new Error(`Unknown action ${action}`);
	}
}

/** Parses a written order such as "12 starter, 4 raiding and 2 line". */
export function parseOrder(text: string): { lines: Line[] } | { problem: string } {
	const parts = text
		.toLowerCase()
		.split(/[,;\n+]|\band\b/)
		.map((part) => part.trim())
		.filter(Boolean);
	let lines: Line[] = [];
	for (const part of parts) {
		const match = part.match(/^(\d+)\s*[x×]?\s*([a-z]+)/) ?? part.match(/^([a-z]+)[a-z\s]*?[x×]?\s*(\d+)$/);
		const [count, word] =
			match && /^\d/.test(match[1] ?? "") ? [match[1], match[2]] : [match?.[2], match?.[1]];
		const index = ships.findIndex((item) => item.word.slice(0, 3) === word?.slice(0, 3));
		if (!count || index < 0)
			return { problem: `The yard could not read “${part}”. Write it like 12 starter, 4 raiding.` };
		if (!buildable(index))
			return {
				problem: `${ship(index).plural} need the Orbital Shipyard at level ${ship(index).level} first.`,
			};
		lines = setCount(lines, index, countOf(lines, index) + Number(count));
	}
	if (!lines.length) return { problem: "Write an amount for each ship type, such as 12 starter." };
	return { lines };
}

/** Applies a typed reply on the screens that ask for one. */
export function reply(state: State, text: string): State {
	const next: State = { ...state, note: undefined };
	const s = state.s;
	if (s.k === "amount") {
		const typed = text.replace(/[\s.,']/g, "");
		if (!/^\d+$/.test(typed)) return { ...next, note: "Reply with a whole number, such as 12." };
		const limit = maxFor(state, s.sel);
		const count = Math.min(Number(typed), limit);
		return {
			...next,
			s: leave(state),
			draft: setCount(state.draft, s.sel, count),
			note:
				Number(typed) > limit
					? `Mirsol's stock covers ${limit} ${limit === 1 ? ship(s.sel).name : ship(s.sel).plural}, so the batch holds ${limit}.`
					: undefined,
		};
	}
	if (s.k === "order" || (state.v === "D" && s.k === "compose")) {
		const order = parseOrder(text);
		if ("problem" in order) return { ...next, note: order.problem };
		return { ...next, s: { k: "compose", sel: firstBuildable(), step: 1 }, draft: order.lines };
	}
	if (s.k === "name") {
		const name = text.trim();
		if (!name || name.length > 24) return { ...next, note: "Use a name of 1 to 24 characters." };
		return {
			...next,
			s: leave(state),
			comps: [...state.comps, { name, lines: state.draft }],
			note: `Saved as “${name}”.`,
		};
	}
	return next;
}

/** Screens that take a typed reply route any sent text through the state machine. */
export const takesReply = (state: State) =>
	state.s.k === "amount" ||
	state.s.k === "order" ||
	state.s.k === "name" ||
	(state.v === "D" && state.s.k === "compose");

export const encode = (state: State) => `s.${Buffer.from(JSON.stringify(state)).toString("base64url")}`;
export const decode = (name: string): State =>
	JSON.parse(Buffer.from(name.slice(2), "base64url").toString("utf8")) as State;
