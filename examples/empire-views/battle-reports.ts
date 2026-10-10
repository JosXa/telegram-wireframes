import type { FixtureMessage, InlineKeyboardButton, MessageEntity } from "../../src/fixture";

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
export type Battle = {
	id: string;
	label: string;
	title: string;
	planet: string;
	coordinates: string;
	rounds: number;
	contingents: Contingent[];
	stock: [number, number];
	aftermath: string;
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
		aftermath: "Cargo aboard · home at 19:10.\nAsh remains an abandoned world.",
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
		aftermath: "No attacking ships return.\nYour colonies and research are intact.",
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
		aftermath: "Allied survivors remain stationed.\nEach owner controls their own ships.",
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
		aftermath: "Both sides survive round 6.\nYour ships return at 23:40 without loot.",
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
		aftermath: "Cargo holds full · home at 20:15.\nSable still belongs to Orin.",
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
		aftermath: "No shots fired.\nCargo aboard · home at 19:55.",
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
		aftermath: "Cargo aboard · home at 19:50.\nThe first launch challenge is complete.",
	},
];

export const count = (value: number) => value.toLocaleString("en-GB").replaceAll(",", " ");
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

type Section = { heading: string; lines: string[] };
function textMessage(sections: Section[], buttons: InlineKeyboardButton[][]): FixtureMessage {
	let text = "";
	const entities: MessageEntity[] = [];
	for (const section of sections) {
		if (text) text += "\n\n";
		entities.push({ type: "bold", offset: text.length, length: section.heading.length });
		text += `${section.heading}${section.lines.length ? `\n${section.lines.join("\n")}` : ""}`;
	}
	return { from: "bot", text, entities, reply_markup: { inline_keyboard: buttons } };
}
const callback = (text: string, id: string): InlineKeyboardButton => ({ text, callback_data: id });
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
				heading: large ? "Battle fleet · Nacre 1:214:6" : "Your ships · Nacre 1:214:6",
				lines: ["Base stats per ship · sample values", "Higher speed is faster; the slowest ship sets pace."],
			},
			...lineup.map(([id, amount]) => ({
				heading: `${ships[id].name} × ${count(amount)}`,
				lines: shipStats(id),
			})),
			{
				heading: `${count(lineup.reduce((n, [, amount]) => n + amount, 0))} ships · yours to command`,
				lines: large
					? ["Heavy hulls commit the fleet for longer."]
					: ["Mira also has 12 Scout Fighters here.", "Her ships defend with yours; only she commands them."],
			},
		],
		[
			[
				callback(
					large ? "Colony lineup" : "Large fleet example",
					large ? "fleet-lineup" : "fleet-lineup-large",
				),
			],
			[callback("Battle Reports", "battle-reports"), callback("Fleet controls", "fleets")],
		],
	);
}
export function archiveMessage(): FixtureMessage {
	return textMessage(
		[
			{
				heading: "Battle Reports",
				lines: [
					"Small battles, allied defense and resource raids.",
					"Sample outcomes · draft ship names and stats.",
				],
			},
			...battles.map((b) => {
				const s = settlement(b);
				return {
					heading: b.label,
					lines: [
						`${b.planet} ${b.coordinates} · ${count(s.attacking.before)} vs ${count(s.defending.before)} ships`,
					],
				};
			}),
		],
		battles.map((b) => [callback(b.label, b.id)]),
	);
}
export function reportMessage(battle: Battle): FixtureMessage {
	const result = settlement(battle);
	const sections: Section[] = [
		{
			heading: battle.title,
			lines: [
				`${battle.coordinates} · ${battle.rounds ? `${battle.rounds} round${battle.rounds === 1 ? "" : "s"}` : "No combat"} · 10 Oct`,
				"Sample battle · before → survivors (lost)",
			],
		},
		...battle.contingents.map((c) => {
			const total = totals(c.groups);
			return {
				heading: `${c.side} · ${c.owner}`,
				lines:
					battle.contingents.length > 2
						? [
								`${count(total.before)} → ${count(total.after)} ships (${count(total.before - total.after)} lost)`,
							]
						: c.groups.length
							? c.groups.map(
									(g) =>
										`${ships[g.ship].name}: ${count(g.before)} → ${count(g.after)} (${count(g.before - g.after)} lost)`,
								)
							: ["No stationed ships"],
			};
		}),
		{
			heading: "Loot · aboard returning ships",
			lines: [
				resources(result.loot[0], result.loot[1]),
				...(result.won
					? [`Hold: ${count(result.loot[0] + result.loot[1])} / ${count(result.attacking.capacity)}`]
					: ["No loot without an attacking victory."]),
			],
		},
		{
			heading: `Salvage · left at ${battle.coordinates}`,
			lines: [
				resources(result.salvage[0], result.salvage[1]),
				...(result.salvage.some(Boolean)
					? ["Separate collection mission required."]
					: ["No ships destroyed."]),
			],
		},
		{ heading: "After the battle", lines: [battle.aftermath] },
	];
	return textMessage(sections, [
		[
			callback("Ship losses & stats", `${battle.id}-ships-0`),
			callback("Loot & loss value", `${battle.id}-resources`),
		],
		...(battle.id === "battle-report" ? [[callback("Round by round", "battle-replay")]] : []),
		[callback("Battle Reports", "battle-reports")],
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
					`${battle.coordinates} · ${contingent.side}: ${contingent.owner}`,
					"Before → survivors · lost",
					"Sample base stats per ship.",
				],
			},
			...contingent.groups.map((g) => ({
				heading: ships[g.ship].name,
				lines: [
					`${count(g.before)} → ${count(g.after)} · ${count(g.before - g.after)} lost`,
					shipStats(g.ship)[0],
				],
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
			[callback("Battle summary", battle.id), callback("Battle Reports", "battle-reports")],
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
				lines: [battle.coordinates, "Sample defaults: up to 50% looted; 30% salvage."],
			},
			{ heading: "Attacker construction losses", lines: [resources(s.attacking.minerals, s.attacking.gas)] },
			{ heading: "Defender construction losses", lines: [resources(s.defending.minerals, s.defending.gas)] },
			{
				heading: "Loot carried home",
				lines: [
					resources(s.loot[0], s.loot[1]),
					...(s.won
						? [
								"Limited by half the available stock and surviving holds.",
								`${count(s.attacking.capacity - s.loot[0] - s.loot[1])} cargo space unused.`,
							]
						: ["No attacking victory; no resources taken."]),
				],
			},
			{
				heading: "Salvage at the orbit",
				lines: [
					resources(s.salvage[0], s.salvage[1]),
					"From destroyed hulls on both sides.",
					"Travel gas is spent; it does not become salvage.",
				],
			},
		],
		[
			[callback("Battle summary", battle.id)],
			...(s.salvage.some(Boolean)
				? [
						[
							{
								text: "Prepare salvage collection",
								web_app: { url: `app.html?view=salvage&sector=${sector}&system=${system}&orbit=${orbit}` },
							},
						],
					]
				: []),
			[callback("Battle Reports", "battle-reports")],
		],
	);
}
export function roundsMessage(): FixtureMessage {
	return textMessage(
		[
			{
				heading: "Ash · round by round",
				lines: ["1:214:8 · small battle", "Sample losses · both sides fire each round."],
			},
			{
				heading: "At arrival",
				lines: ["Joscha: 24 Scout Fighters + 2 Resource Transports", "Defenders: 8 Scout Fighters"],
			},
			{ heading: "Round 1", lines: ["Scout Fighters: Joscha 24 → 22 · defenders 8 → 5"] },
			{ heading: "Round 2", lines: ["Scout Fighters: Joscha 22 → 20 · defenders 5 → 2"] },
			{
				heading: "Round 3 · victory",
				lines: [
					"Scout Fighters: Joscha 20 → 18 · defenders 2 → 0",
					"Both Resource Transports survive.",
					"18 fighters + 2 transports return with cargo.",
				],
			},
		],
		[[callback("Battle summary", "battle-report")], [callback("Battle Reports", "battle-reports")]],
	);
}
