// The Shipyard widget's chat_data, and a stand-in for the bot that answers the widget's requests.
// One widget message lives through the whole batch: composing, production, and the next batch.
import { planet, ships, shipyardLevel } from "../model";

/** [name, minerals, gas, seconds, attack, hull, cargo, speed, Shipyard level when locked] */
export type CatalogEntry = [string, number, number, number, number, number, number, number, number?];
/** [catalog index, count] in build order. */
export type Line = [number, number];

export type ShipyardData = {
	/** Planet name and coordinates. */
	p: string;
	c: string;
	/** Stock at time t (epoch ms), and production per hour. */
	t: number;
	m: number;
	g: number;
	rm: number;
	rg: number;
	k: CatalogEntry[];
	/** Stationed ships per catalog index. */
	n: number[];
	/** The last batch, offered again. */
	d: Line[];
	/** The batch in production: start (epoch ms) and lines. Ship durations are fixed when it starts. */
	b: { s: number; l: Line[] } | null;
	/** Saved mixes for the mixes layout. */
	o?: [string, Line[]][];
};

export const catalog = (): CatalogEntry[] =>
	ships.map((ship) => {
		const entry: CatalogEntry = [
			ship.name,
			ship.cost.minerals,
			ship.cost.gas,
			ship.seconds,
			ship.attack,
			ship.hull,
			ship.cargo,
			ship.speed,
		];
		if (ship.level > shipyardLevel) entry.push(ship.level);
		return entry;
	});

export function initialData(now: number, mixes: boolean): ShipyardData {
	return {
		p: planet.name,
		c: planet.coordinates.replace("🌐 ", ""),
		t: now,
		m: 8434,
		g: 4806,
		rm: 1320,
		rg: 540,
		k: catalog(),
		n: [6, 1, 0, 0, 0],
		d: [
			[0, 12],
			[1, 4],
			[3, 2],
		],
		b: null,
		...(mixes
			? {
					o: [
						[
							"Raid wing",
							[
								[1, 2],
								[0, 4],
							],
						],
						[
							"Home guard",
							[
								[2, 3],
								[3, 1],
							],
						],
					],
				}
			: {}),
	};
}

export const stockAt = (data: ShipyardData, now: number): [number, number] => {
	const hours = (now - data.t) / 3_600_000;
	return [data.m + data.rm * hours, data.g + data.rg * hours];
};

export const linesCost = (data: ShipyardData, lines: Line[]): [number, number] =>
	lines.reduce<[number, number]>(
		(sum, [index, count]) => [sum[0] + data.k[index][1] * count, sum[1] + data.k[index][2] * count],
		[0, 0],
	);

/** When each line of the running batch finishes, in build order. */
export function batchEnd(data: ShipyardData) {
	if (!data.b) return null;
	return data.b.l.reduce((at, [index, count]) => at + data.k[index][3] * 1000 * count, data.b.s);
}

export type Answer = { data: ShipyardData; result: string };

const refuse = (data: ShipyardData, text: string): Answer => ({ data, result: JSON.stringify({ e: text }) });

/** Requests: `b:` places a batch, `a:` adds to the running one; lines are `index*count` joined by commas. */
export function answer(data: ShipyardData, request: string, now: number): Answer {
	const match = /^([ab]):((?:\d+\*\d+,?)+)$/.exec(request);
	if (!match) return refuse(data, "The yard could not read that order.");
	const lines: Line[] = match[2]
		.split(",")
		.filter(Boolean)
		.map((part) => part.split("*").map(Number) as Line);
	const types = new Set(lines.map(([index]) => index));
	if (types.size !== lines.length || lines.some(([index, count]) => !data.k[index] || count < 1))
		return refuse(data, "The yard could not read that order.");
	const locked = lines.find(([index]) => data.k[index][8]);
	if (locked)
		return refuse(
			data,
			`${data.k[locked[0]][0]}s need the Orbital Shipyard at level ${data.k[locked[0]][8]} first.`,
		);
	const adding = match[1] === "a";
	if (adding !== Boolean(data.b))
		return refuse(
			data,
			adding ? "The batch has already finished." : "A ship batch is already in production.",
		);
	const stock = stockAt(data, now);
	const cost = linesCost(data, lines);
	if (cost[0] > stock[0] + 1e-6 || cost[1] > stock[1] + 1e-6)
		return refuse(data, `${data.p} is short of resources.`);
	const next: ShipyardData = { ...data, t: now, m: stock[0] - cost[0], g: stock[1] - cost[1] };
	next.b = data.b ? { s: data.b.s, l: merged(data, lines, now) } : { s: now, l: lines };
	return { data: next, result: JSON.stringify({ ok: 1 }) };
}

/** Additions grow the unfinished line of the same type, and other types join the end. */
function merged(data: ShipyardData, added: Line[], now: number): Line[] {
	const lines = data.b?.l.map((line) => [...line] as Line) ?? [];
	let at = data.b?.s ?? now;
	const open = new Set<number>();
	for (const [index, count] of lines) {
		at += data.k[index][3] * 1000 * count;
		if (at > now) open.add(index);
	}
	for (const [index, count] of added) {
		const line = lines.findLast(([type]) => type === index);
		if (line && open.has(index)) line[1] += count;
		else lines.push([index, count]);
	}
	return lines;
}

/** Finishes the batch once its last ship is ready: the ships are stationed and the batch is offered again. */
export function settle(data: ShipyardData, now: number): { data: ShipyardData; finished: Line[] } | null {
	const end = batchEnd(data);
	if (end === null || !data.b || now < end) return null;
	const n = [...data.n];
	const totals = new Map<number, number>();
	for (const [index, count] of data.b.l) {
		n[index] += count;
		totals.set(index, (totals.get(index) ?? 0) + count);
	}
	const finished = [...totals];
	return { data: { ...data, n, d: finished, b: null }, finished };
}

const list = (data: ShipyardData, lines: Line[]) => {
	const parts = lines.map(([index, count]) => `${data.k[index][0]} × ${count}`);
	return parts.length > 1 ? `${parts.slice(0, -1).join(", ")} and ${parts.at(-1)}` : (parts[0] ?? "");
};

/** The caption under the widget: the fallback for clients without widgets. */
export function caption(data: ShipyardData) {
	if (!data.b) return `🚀 ${data.p}'s Shipyard has free slips for a new ship batch.`;
	return `🚀 ${data.p}: ${list(data, data.b.l)} ${data.b.l.length > 1 || data.b.l[0][1] > 1 ? "are" : "is"} in production.`;
}

export function finishedText(data: ShipyardData, lines: Line[]) {
	return `🚀 Ship batch finished at ${data.p} 🌐 ${data.c}\n${list(data, lines)} ${lines.length > 1 || lines[0][1] > 1 ? "are" : "is"} stationed.`;
}
