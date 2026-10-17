import type { FixtureMessage, InlineKeyboardButton, MessageEntity } from "../../src/fixture";
import { count } from "../galaxy/app/numbers.js";

// Draft names come from the design shortlist. These base stats and authored losses are presentation samples,
// not approved balance or a combat simulation. Cargo, loss values and salvage share the same data.
export const ships = {
	scout: { name: "Scout Fighter", attack: 12, hull: 60, cargo: 20, speed: 120, minerals: 200, gas: 50 },
	marauder: { name: "Marauder", attack: 35, hull: 140, cargo: 250, speed: 100, minerals: 600, gas: 200 },
	gunship: { name: "Gunship", attack: 110, hull: 130, cargo: 30, speed: 90, minerals: 1200, gas: 400 },
	cruiser: {
		name: "Line Cruiser",
		attack: 260,
		hull: 1500,
		cargo: 500,
		speed: 60,
		minerals: 6500,
		gas: 2000,
	},
	battleship: {
		name: "Battleship",
		attack: 1200,
		hull: 9000,
		cargo: 1500,
		speed: 25,
		minerals: 32000,
		gas: 12000,
	},
	transport: {
		name: "Resource Transport",
		attack: 0,
		hull: 300,
		cargo: 1500,
		speed: 70,
		minerals: 800,
		gas: 250,
	},
	colony: { name: "Colony Ship", attack: 0, hull: 3000, cargo: 0, speed: 20, minerals: 30000, gas: 15000 },
} as const;
export type Ship = keyof typeof ships;
export type Group = { ship: Ship; before: number; after: number };
export type Contingent = { owner: string; side: "Attacker" | "Defender"; groups: Group[] };
// Use the same role icons in every battle report summary and detail page.
const sideIcons = { Attacker: "⚔️", Defender: "🛡️" } as const;
export type Battle = {
	id: string;
	label: string;
	title: string;
	planet: string;
	coordinates: string;
	rounds: number;
	contingents: Contingent[];
	stock: [number, number];
};
const group = (ship: Ship, before: number, after: number): Group => ({ ship, before, after });
export const battles: Battle[] = [
	{
		id: "battle-report",
		label: "Small battle · victory",
		title: "Victory at Ash",
		planet: "Ash",
		coordinates: "1:214:8",
		rounds: 3,
		contingents: [
			{ owner: "Joscha", side: "Attacker", groups: [group("scout", 24, 18), group("transport", 2, 2)] },
			{ owner: "Abandoned world", side: "Defender", groups: [group("scout", 8, 0)] },
		],
		stock: [6400, 1600],
	},
	{
		id: "battle-loss",
		label: "Small battle · defeat",
		title: "Defeat at Cairn",
		planet: "Cairn",
		coordinates: "1:228:5",
		rounds: 2,
		contingents: [
			{ owner: "Joscha", side: "Attacker", groups: [group("marauder", 12, 0)] },
			{ owner: "Orin", side: "Defender", groups: [group("gunship", 10, 9), group("cruiser", 2, 2)] },
		],
		stock: [24000, 8000],
	},
	{
		id: "battle-defense",
		label: "Large battle · allied defense",
		title: "Defense held at Nacre",
		planet: "Nacre",
		coordinates: "1:214:6",
		rounds: 6,
		contingents: [
			{
				owner: "Kael",
				side: "Attacker",
				groups: [
					group("scout", 1800, 0),
					group("gunship", 360, 0),
					group("cruiser", 120, 0),
					group("battleship", 30, 0),
					group("transport", 45, 0),
				],
			},
			{
				owner: "Joscha",
				side: "Defender",
				groups: [group("scout", 1200, 510), group("cruiser", 160, 118), group("battleship", 40, 34)],
			},
			{ owner: "Mira", side: "Defender", groups: [group("scout", 600, 420), group("cruiser", 80, 64)] },
			{ owner: "Tavi", side: "Defender", groups: [group("gunship", 200, 132), group("battleship", 20, 17)] },
		],
		stock: [420000, 180000],
	},
	{
		id: "battle-draw",
		label: "Large battle · draw",
		title: "Draw at Bastion",
		planet: "Bastion",
		coordinates: "1:312:4",
		rounds: 6,
		contingents: [
			{ owner: "Joscha", side: "Attacker", groups: [group("scout", 400, 190), group("cruiser", 40, 24)] },
			{ owner: "Orin", side: "Defender", groups: [group("scout", 300, 75), group("cruiser", 30, 13)] },
		],
		stock: [150000, 70000],
	},
	{
		id: "battle-raid",
		label: "Raid · weak defense",
		title: "Raid won at Sable",
		planet: "Sable",
		coordinates: "1:218:7",
		rounds: 1,
		contingents: [
			{ owner: "Joscha", side: "Attacker", groups: [group("marauder", 80, 80), group("transport", 12, 12)] },
			{ owner: "Orin", side: "Defender", groups: [group("scout", 8, 0), group("transport", 6, 0)] },
		],
		stock: [120000, 40000],
	},
	{
		id: "battle-unopposed",
		label: "Raid · no defenders",
		title: "Unopposed at Dusk",
		planet: "Dusk",
		coordinates: "1:216:3",
		rounds: 0,
		contingents: [
			{ owner: "Joscha", side: "Attacker", groups: [group("transport", 5, 5)] },
			{ owner: "Abandoned world", side: "Defender", groups: [] },
		],
		stock: [8000, 2000],
	},
	{
		id: "battle-tutorial",
		label: "First launch · victory",
		title: "First victory at Ash",
		planet: "Ash",
		coordinates: "1:214:8",
		rounds: 1,
		contingents: [
			{ owner: "Joscha", side: "Attacker", groups: [group("scout", 6, 5)] },
			{ owner: "Abandoned world", side: "Defender", groups: [group("scout", 1, 0)] },
		],
		stock: [800, 200],
	},
];

export const resources = (m: number, g: number) => `💠 ${count(m)} · 🔥 ${count(g)}`;
export function totals(groups: Group[]) {
	return groups.reduce(
		(total, item) => {
			const ship = ships[item.ship];
			const lost = item.before - item.after;
			total.before += item.before;
			total.after += item.after;
			total.minerals += lost * ship.minerals;
			total.gas += lost * ship.gas;
			total.capacity += item.after * ship.cargo;
			return total;
		},
		{ before: 0, after: 0, minerals: 0, gas: 0, capacity: 0 },
	);
}
export function settlement(battle: Battle) {
	const attacking = totals(battle.contingents.filter((c) => c.side === "Attacker").flatMap((c) => c.groups));
	const defending = totals(battle.contingents.filter((c) => c.side === "Defender").flatMap((c) => c.groups));
	const won = attacking.after > 0 && defending.after === 0;
	const lootable = battle.stock.map((n) => Math.floor(n / 2));
	const cargo = won ? Math.min(attacking.capacity, lootable[0] + lootable[1]) : 0;
	const minerals = cargo ? Math.floor((cargo * lootable[0]) / (lootable[0] + lootable[1])) : 0;
	return {
		attacking,
		defending,
		won,
		loot: [minerals, cargo - minerals],
		salvage: [
			Math.floor((attacking.minerals + defending.minerals) * 0.3),
			Math.floor((attacking.gas + defending.gas) * 0.3),
		],
	};
}

type Section = { heading: string; lines: string[]; table?: string };
function textMessage(sections: Section[], buttons: InlineKeyboardButton[][]): FixtureMessage {
	let text = "";
	const entities: MessageEntity[] = [];
	for (const section of sections) {
		if (text) text += "\n\n";
		entities.push({ type: "bold", offset: text.length, length: section.heading.length });
		text += `${section.heading}${section.lines.length ? `\n${section.lines.join("\n")}` : ""}`;
		if (section.table) {
			text += "\n";
			entities.push({ type: "pre", offset: text.length, length: section.table.length });
			text += section.table;
		}
	}
	return { from: "bot", text, entities, reply_markup: { inline_keyboard: buttons } };
}
const callback = (text: string, id: string): InlineKeyboardButton => ({ text, callback_data: id });
function lossTable(groups: Group[]): string | undefined {
	if (!groups.length) return;
	// Keep full ship names and just two numeric columns so Telegram can fit the table on a phone.
	const rows = groups.map((g) => [ships[g.ship].name, count(g.before - g.after), count(g.after)]);
	rows.unshift(["Ship", "Lost", "Survived"]);
	const widths = rows[0].map((_, column) => Math.max(...rows.map((row) => row[column].length)));
	return rows
		.map((row) =>
			row
				.map((value, column) => (column ? value.padStart(widths[column]) : value.padEnd(widths[column])))
				.join(" "),
		)
		.join("\n");
}
export function shipStats(id: Ship) {
	const s = ships[id];
	return [`Atk ${count(s.attack)} · Hull ${count(s.hull)}`, `Cargo ${count(s.cargo)} · Speed ${s.speed}`];
}
export function lineupMessage(large: boolean): FixtureMessage {
	const lineup: [Ship, number][] = large
		? [
				["scout", 1200],
				["marauder", 240],
				["gunship", 180],
				["cruiser", 160],
				["battleship", 40],
			]
		: [
				["scout", 24],
				["transport", 6],
				["colony", 1],
			];
	return textMessage(
		[
			{
				heading: large ? "Battle fleet · Nacre 🌐 1:214:6" : "Your ships · Nacre 🌐 1:214:6",
				lines: ["Stats per ship"],
			},
			...lineup.map(([id, amount]) => ({
				heading: `${ships[id].name} × ${count(amount)}`,
				lines: shipStats(id),
			})),
			{
				heading: `${count(lineup.reduce((n, [, amount]) => n + amount, 0))} ships · your ships`,
				lines: large ? [] : ["Mira has 12 Scout Fighters stationed here."],
			},
		],
		[
			[callback(large ? "Colony ships" : "Battle fleet", large ? "fleet-lineup" : "fleet-lineup-large")],
			[callback("Battle reports", "battle-reports")],
			[callback("⬅️ Fleet Command", "fleets")],
		],
	);
}
export function archiveMessage(): FixtureMessage {
	return textMessage(
		[
			{
				heading: "Battle reports",
				lines: ["Your battles and their losses are recorded here."],
			},
			...battles.map((b) => {
				const s = settlement(b);
				return {
					heading: b.title,
					lines: [
						`${b.planet} 🌐 ${b.coordinates} · ${sideIcons.Attacker} ${count(s.attacking.before)} vs ${sideIcons.Defender} ${count(s.defending.before)} ships`,
					],
				};
			}),
		],
		battles.map((b) => [callback(b.title, b.id)]),
	);
}
export function reportMessage(battle: Battle): FixtureMessage {
	const result = settlement(battle);
	const summaries: Record<string, string> = {
		"battle-report":
			"You defeated Ash's defenders. The victory parade is waiting for the transports to unload.",
		"battle-loss": "Your fleet was lost at Cairn. The admiralty has put the victory stationery away.",
		"battle-defense": "Nacre's defenders held. The safety officer has recommended a hard hat.",
		"battle-draw": "Both sides still had ships at Bastion. Both have requested the same victory banner.",
		"battle-raid": "You won at Sable. The imperial procession includes Resource Transports.",
		"battle-unopposed":
			"Your fleet met no defenders at Dusk. The formal challenge was read to an empty orbit.",
		"battle-tutorial":
			"Your first battle at Ash ended in victory. The commemorative plaque is larger than the cargo hold.",
	};
	const sections: Section[] = [
		{
			heading: battle.title,
			lines: [
				`🌐 ${battle.coordinates} · ${battle.rounds ? `${battle.rounds} round${battle.rounds === 1 ? "" : "s"}` : "No combat"} · 10 Oct`,
				summaries[battle.id],
			],
		},
		...battle.contingents.map((c) => {
			const total = totals(c.groups);
			return {
				heading: `${sideIcons[c.side]} ${c.owner}`,
				lines: c.groups.length
					? [
							`${count(total.before)} ships at arrival`,
							...(battle.contingents.length > 2
								? [`${count(total.before - total.after)} lost · ${count(total.after)} survived`]
								: []),
						]
					: ["No stationed ships"],
				table: battle.contingents.length > 2 ? undefined : lossTable(c.groups),
			};
		}),
		{
			heading: "Returning loot",
			lines: [
				resources(result.loot[0], result.loot[1]),
				...(result.won
					? [
							`Cargo capacity used: ${count(result.loot[0] + result.loot[1])} / ${count(result.attacking.capacity)}`,
						]
					: []),
			],
		},
		{
			heading: `Salvage · left at 🌐 ${battle.coordinates}`,
			lines: [resources(result.salvage[0], result.salvage[1])],
		},
	];
	return textMessage(sections, [
		[
			callback("Ship losses and stats", `${battle.id}-ships-0`),
			callback("Loot and losses", `${battle.id}-resources`),
		],
		...(battle.id === "battle-report" ? [[callback("Round by round", "battle-replay")]] : []),
		[callback("⬅️ Battle reports", "battle-reports")],
	]);
}
export function lossesMessage(battle: Battle, index: number): FixtureMessage {
	const contingent = battle.contingents[index];
	const total = totals(contingent.groups);
	return textMessage(
		[
			{
				heading: `${battle.planet} · ship losses ${index + 1}/${battle.contingents.length}`,
				lines: [
					`🌐 ${battle.coordinates} · ${sideIcons[contingent.side]} ${contingent.owner}`,
					`${count(total.before)} ships at arrival`,
				],
				table: lossTable(contingent.groups),
			},
			...contingent.groups.map((g) => ({
				heading: ships[g.ship].name,
				lines: [shipStats(g.ship)[0]],
			})),
			{
				heading: `${count(total.before - total.after)} ships lost`,
				lines: [
					resources(total.minerals, total.gas),
					...(contingent.groups.length ? [] : ["No stationed ships at arrival."]),
				],
			},
		],
		[
			[
				...(index > 0 ? [callback("← Previous fleet", `${battle.id}-ships-${index - 1}`)] : []),
				...(index + 1 < battle.contingents.length
					? [callback("Next fleet →", `${battle.id}-ships-${index + 1}`)]
					: []),
			],
			[callback("Battle reports", "battle-reports")],
			[callback("⬅️ Battle summary", battle.id)],
		],
	);
}
export function resourceMessage(battle: Battle): FixtureMessage {
	const s = settlement(battle);
	const [sector, system, orbit] = battle.coordinates.split(":");
	return textMessage(
		[
			{
				heading: `${battle.planet} · resources`,
				lines: [`🌐 ${battle.coordinates}`],
			},
			{
				heading: `${sideIcons.Attacker} Ship losses`,
				lines: [resources(s.attacking.minerals, s.attacking.gas)],
			},
			{
				heading: `${sideIcons.Defender} Ship losses`,
				lines: [resources(s.defending.minerals, s.defending.gas)],
			},
			{
				heading: "Returning loot",
				lines: [
					resources(s.loot[0], s.loot[1]),
					...(s.won
						? [
								`Cargo capacity: ${count(s.attacking.capacity)}`,
								`Unused cargo capacity: ${count(s.attacking.capacity - s.loot[0] - s.loot[1])}`,
							]
						: ["No resources were taken."]),
				],
			},
			{
				heading: "Salvage at the orbit",
				lines: [resources(s.salvage[0], s.salvage[1])],
			},
		],
		[
			...(s.salvage.some(Boolean)
				? [
						[
							{
								text: "Collect salvage",
								web_app: { url: `app.html?view=salvage&sector=${sector}&system=${system}&orbit=${orbit}` },
							},
						],
					]
				: []),
			[callback("Battle reports", "battle-reports")],
			[callback("⬅️ Battle summary", battle.id)],
		],
	);
}
export function roundsMessage(): FixtureMessage {
	return textMessage(
		[
			{
				heading: "Ash · round by round",
				lines: ["🌐 1:214:8"],
			},
			{
				heading: "At arrival",
				lines: [
					`${sideIcons.Attacker} Joscha: 24 Scout Fighters + 2 Resource Transports`,
					`${sideIcons.Defender} Abandoned world: 8 Scout Fighters`,
				],
			},
			{
				heading: "Round 1",
				lines: [`Scout Fighters: ${sideIcons.Attacker} 24 → 22 · ${sideIcons.Defender} 8 → 5`],
			},
			{
				heading: "Round 2",
				lines: [`Scout Fighters: ${sideIcons.Attacker} 22 → 20 · ${sideIcons.Defender} 5 → 2`],
			},
			{
				heading: "Round 3 · victory",
				lines: [
					`Scout Fighters: ${sideIcons.Attacker} 20 → 18 · ${sideIcons.Defender} 2 → 0`,
					"Both Resource Transports survive.",
					"18 Scout Fighters and 2 Resource Transports return with cargo.",
				],
			},
		],
		[[callback("Battle reports", "battle-reports")], [callback("⬅️ Battle summary", "battle-report")]],
	);
}
