import type { Fixture, FixtureMessage, InlineKeyboardButton } from "../../src/fixture";
import {
	archiveMessage,
	battles,
	lineupMessage,
	lossesMessage,
	reportMessage,
	resourceMessage,
	roundsMessage,
} from "./battle-reports";

// Design proposals only. Draft labels are authorized for this wireframe pass; they do not settle the glossary.
export type Scene = {
	id: string;
	view: string;
	title: string;
	group: string;
	surface: "Chat" | "Mini App";
	status: "V1" | "Proposal" | "Later";
	source: string;
	note: string;
	related: string[];
	fixture: Fixture;
	assets?: "admirals";
	preview?: string;
};
export const views = [
	"Command Center",
	"Buildings",
	"Research",
	"Shipyard",
	"Empire",
	"Supply Routes",
	"Fleet Command",
	"Galaxy Map",
	"System View",
	"Intelligence",
	"Alliance",
	"Battle Reports",
	"Dynasty",
	"Rankings",
	"Advisor",
	"Alert Preferences",
	"Season Briefing",
	"Activity Summary",
	"Battle Rounds",
];
export const resource = (minerals: string | number, gas: string | number) => `💠 ${minerals}  ·  🔥 ${gas}`;
const stock = resource("12 400", "6 100");
const warning = "⚠ Fleet approaching Nacre 🌐 1:214:6 · 20:40\nIts mission is unknown.";
const cb = (text: string, id: string, style?: InlineKeyboardButton["style"]): InlineKeyboardButton => ({
	text,
	callback_data: id,
	...(style ? { style } : {}),
});
const off = (text: string): InlineKeyboardButton => ({ text, disabled: {} });
const app = (text: string, route: string): InlineKeyboardButton => ({
	text,
	web_app: { url: `app.html?view=${route}` },
	style: "primary",
});
const map = (text: string, variant: string): InlineKeyboardButton => ({
	text,
	web_app: { url: `/__wireframes__/fixtures/galaxy/files/app/index.html?variant=${variant}` },
	style: "primary",
});
const message = (text: string, rows: InlineKeyboardButton[][] = []): FixtureMessage => ({
	from: "bot",
	text,
	entities: [{ type: "bold", offset: 0, length: text.indexOf("\n") < 0 ? text.length : text.indexOf("\n") }],
	...(rows.length ? { reply_markup: { inline_keyboard: rows } } : {}),
});
const bot: Fixture["bot"] = {
	first_name: "Space Emperors",
	username: "spaceemperorsbot",
	color: 5,
	description:
		"Build colonies, send fleets and spy on your neighbours. Anyone with a planet and a fleet calls themselves an emperor here.",
	commands: [
		{ command: "colony", description: "Command Center" },
		{ command: "empire", description: "Your colonies" },
		{ command: "advisor", description: "Next challenge" },
	],
};
function scene(
	id: string,
	view: string,
	title: string,
	group: string,
	source: string,
	note: string,
	messages: FixtureMessage[],
	related: string[],
	options: { status?: Scene["status"]; launch?: string } = {},
): Scene {
	return {
		id,
		view,
		title,
		group,
		surface: options.launch ? "Mini App" : "Chat",
		status: options.status || "V1",
		source,
		note,
		related,
		fixture: {
			bot,
			user: { first_name: "Joscha" },
			messages,
			...(options.launch
				? { mini_app: { button_text: options.launch, ready_selector: "[data-ready='true']" } }
				: {}),
		},
	};
}
const economy = "economy.md";
const warfare = "warfare.md";
const design = "game-design.md";
const ui = "telegram-interface.md";

export const scenes: Scene[] = [
	scene(
		"command-center",
		"Command Center",
		"Your home planet",
		"Colony",
		economy,
		"Settled name. A compact check-in with local stocks and independent work tracks; 2 building slots is the playtest default.",
		[
			message(
				`🪐 Nacre · 🌐 1:214:6\nCommand Center · 🏝 Tropical · Home planet\n\n${stock}\n💠 +720/h · storage 20 000\n🔥 +240/h · storage 10 000\n\n2 building upgrades running\nMineral Mine → 13 · 18 min\nAtmospheric Harvester → 9 · 32 min\nResearch: Combustion Engine → 5 · 46 min\nShipyard: 4 / 10 Scout Fighters ready\n\n${warning}`,
				[
					[cb("Buildings", "buildings"), cb("Research", "research")],
					[cb("Shipyard", "shipyard"), cb("Empire", "empire")],
					[app("Spy on incoming fleet", "incoming")],
					[map("Open system", "young"), app("Fleet Command", "fleets")],
				],
			),
		],
		["buildings", "research", "shipyard", "empire", "incoming", "activity"],
	),
	scene(
		"colony-picker",
		"Command Center",
		"Choose a colony",
		"Colony",
		economy,
		"Changing the selected colony changes its stock and work queues. Resources are never pooled.",
		[
			message(
				"🪐 Your colonies\nChoose where to give your next orders.\n\n🏝 Nacre · 🌐 1:214:6 · Home planet\n💠 12 400  ·  🔥 6 100\n\n🏔 Rime · 🌐 1:218:2\n💠 8 200  ·  🔥 1 800\n\n🌋 Cinder · 🌐 1:231:4\n💠 2 100  ·  🔥 9 300",
				[
					[cb("Nacre · 🌐 1:214:6", "command-center")],
					[cb("Rime · 🌐 1:218:2", "storage-full")],
					[cb("Cinder · 🌐 1:231:4", "empire")],
				],
			),
		],
		["command-center", "storage-full", "empire"],
	),
	scene(
		"storage-full",
		"Command Center",
		"Storage is full",
		"Colony",
		economy,
		"Production pauses at capacity in the provisional storage model. Deliveries and cancellation may exceed it; no energy amount is invented.",
		[
			message(
				"🏔 Rime · 🌐 1:218:2\nCommand Center · Snowy\n\n💠 20 000 / 20 000\nMineral storage is full, so the mine has stopped production.\n🔥 1 800 / 10 000 · +180/h\n\nBuilding upgrades: 1 / 2 active\nResearch Lab → 4 · 27 min\nShipyard available",
				[
					[cb("Review storage", "buildings")],
					[app("Transport resources", "dispatch")],
					[cb("Choose colony", "colony-picker")],
				],
			),
		],
		["buildings", "dispatch", "colony-picker"],
	),
	scene(
		"buildings",
		"Buildings",
		"Levels and paid queues",
		"Colony",
		economy,
		"Mineral Mine and Atmospheric Harvester are settled. Storage uses a draft unified Logistics Depot. All values are sample balance.",
		[
			message(
				`🏗 Buildings · Nacre 🌐 1:214:6\n${stock}\n\nIn progress · 2 / 2\nMineral Mine → 13 · 18 min\nAtmospheric Harvester → 9 · 32 min\n\nWaiting\nResearch Lab → 5\n\n${warning}`,
				[
					[cb("Mineral Mine → 13", "building-detail")],
					[cb("Logistics Depot · Level 6", "building-detail")],
					[cb("Building queue", "building-queue")],
					[cb("Command Center", "command-center")],
				],
			),
		],
		["building-detail", "building-queue", "queue-blocked", "command-center"],
	),
	scene(
		"building-detail",
		"Buildings",
		"Preview an upgrade",
		"Colony",
		economy,
		"Queueing pays immediately. Example effects and prices are illustrative, and storage remains a design choice.",
		[
			message(
				`🏗 Logistics Depot · 6 → 7\nNacre · 🌐 1:214:6\n\nStorage capacity\n💠 20 000 → 26 000\n🔥 10 000 → 13 000\n\nCost: ${resource("2 400", "800")}\nRemaining stock: ${resource("10 000", "5 300")}\nDuration: 24 min\n\nThis upgrade will wait behind Research Lab level 5.`,
				[
					[cb("Queue upgrade · Level 7", "building-queue", "success")],
					[cb("Back to buildings", "buildings")],
				],
			),
		],
		["building-queue", "buildings"],
	),
	scene(
		"building-queue",
		"Buildings",
		"Cancel paid work",
		"Colony",
		economy,
		"No refund wording at the initial 100% rate. Reordering is not offered because its rules remain open.",
		[
			message(
				"🏗 Building queue · Nacre\n\nIn progress\nMineral Mine → 13 · 18 min\nAtmospheric Harvester → 9 · 32 min\n\nWaiting\n1. Research Lab → 5\n2. Logistics Depot → 7",
				[
					[cb("Cancel Mineral Mine → 13", "queue-cancelled")],
					[cb("Cancel Logistics Depot → 7", "queue-cancelled")],
					[cb("Buildings", "buildings")],
				],
			),
		],
		["queue-cancelled", "queue-blocked", "buildings"],
	),
	scene(
		"queue-cancelled",
		"Buildings",
		"Cancellation completed",
		"Colony",
		economy,
		"The cancelled paid amount returns to this colony. This snapshot follows cancelling Logistics Depot level 7.",
		[
			message(
				`✓ Logistics Depot upgrade cancelled\nNacre · 🌐 1:214:6\n\n${stock}\n\nThe resources are back in storage.\nResearch Lab level 5 is still waiting behind 2 building upgrades.`,
				[[cb("Buildings", "buildings"), cb("Building queue", "building-queue")]],
			),
		],
		["buildings", "building-queue"],
	),
	scene(
		"queue-blocked",
		"Buildings",
		"A prerequisite was cancelled",
		"Colony",
		economy,
		"Example dependency only, not an approved tech tree. Ineligible work stays paid and cancellable while eligible work can start.",
		[
			message(
				"⏸ Research Lab → 5 is waiting\nNacre · 🌐 1:214:6\n\nThe Headquarters upgrade was cancelled, so the lab still needs Headquarters level 5.\nQueue that upgrade again or cancel the lab upgrade.\n\nOther eligible work can start.",
				[
					[cb("View prerequisite", "building-detail")],
					[cb("Cancel Research Lab → 5", "queue-cancelled")],
					[cb("Back to queue", "building-queue")],
				],
			),
		],
		["building-queue", "building-detail"],
		{ status: "Proposal" },
	),
	scene(
		"research",
		"Research",
		"Research across your colonies",
		"Colony",
		economy,
		"Draft view label. One player-wide research track is the provisional default; Nacre pays for this queue.",
		[
			message(
				`🔬 Research\nYour colonies share these discoveries.\n\nIn progress at Nacre · 🌐 1:214:6\nCombustion Engine → 5 · 46 min\n\nWaiting\nLaser Cannon → 3\n\nCompleted\nCombustion Engine · 4\nLaser Cannon · 2\nSolar Sails · 1\n\n${warning}`,
				[
					[cb("Combustion Engine · Level 4", "research-detail")],
					[cb("Cancel Laser Cannon → 3", "research-empty")],
					[cb("Tech tree", "tech-tree")],
					[cb("Command Center", "command-center")],
				],
			),
		],
		["research-detail", "research-empty", "tech-tree"],
	),
	scene(
		"research-detail",
		"Research",
		"Choose the paying colony",
		"Colony",
		economy,
		"Example research benefit, cost and duration. No dependency or balance curve is approved by this wireframe.",
		[
			message(
				`🔬 Solar Sails · 1 → 2\nFleets you dispatch after this upgrade will travel faster.\n\nResources from Nacre · 🌐 1:214:6\n${stock}\nCost: ${resource("3 600", "1 800")}\nDuration: 1h 20m\n\nThis upgrade will join your research queue.`,
				[
					[cb("Queue research · Level 2", "research")],
					[cb("Choose another colony", "colony-picker")],
					[cb("Research", "research")],
				],
			),
		],
		["research", "colony-picker"],
	),
	scene(
		"research-empty",
		"Research",
		"Research is available",
		"Colony",
		economy,
		"An empty track gives a useful action without idle reminders or pressure to return.",
		[
			message(
				`🔬 Research\nNo research is running or waiting.\nThe lab has put the kettle on.\n\nCompleted\nCombustion Engine · 4\nLaser Cannon · 2\nSolar Sails · 1\n\nNacre · 🌐 1:214:6\n${stock}`,
				[[cb("Choose research", "research-detail")], [cb("Tech tree", "tech-tree")]],
			),
		],
		["research-detail", "tech-tree"],
	),
	scene(
		"tech-tree",
		"Research",
		"Prerequisites",
		"Colony",
		economy,
		"A deliberately marked example tree, because the complete prerequisite graph is still undecided.",
		[
			message(
				"🔬 Tech tree\n\n✓ Research Lab · Level 4\n  ↳ Combustion Engine · Level 4\n  ↳ Laser Cannon · Level 2\n\nExpansion\nColony Ship\nYour colonies: 3",
				[[cb("Combustion Engine", "research-detail")], [off("Colony Ship")], [cb("Research", "research")]],
			),
		],
		["research", "shipyard-locked"],
		{ status: "Proposal" },
	),
	scene(
		"shipyard",
		"Shipyard",
		"Individual ship completions",
		"Colony",
		economy,
		"Orbital Shipyard and Scout Fighter are draft labels. Four finished ships are already available; the unfinished six remain cancellable.",
		[
			message(
				`🛠 Shipyard · Nacre 🌐 1:214:6\nOrbital Shipyard · Level 4\n${stock}\n\nIn progress\nScout Fighter · 4 / 10 complete\nNext ship: 2 min · batch: 12 min\n\nWaiting\nResource Transport × 2\n\nYour stationed ships\nScout Fighter × 24\nResource Transport × 6`,
				[
					[cb("Build ships", "ship-batch")],
					[cb("Cancel 6 unfinished ships", "ship-batch-cancelled")],
					[app("Manage stationed ships", "stationed")],
					[cb("Colony Ship", "shipyard-locked")],
				],
			),
		],
		["ship-batch", "ship-batch-cancelled", "shipyard-locked", "stationed"],
	),
	scene(
		"ship-batch",
		"Shipyard",
		"Queue a ship batch",
		"Colony",
		economy,
		"The batch is paid in full when queued. Values and ship characteristics are sample state.",
		[
			message(
				`🛠 Scout Fighter × 10\nFast · fragile · small cargo hold\n\nBatch cost: ${resource("2 000", "500")}\nDuration: 2 min per ship\n\nShip batches: 1 in progress · 1 waiting\nThese ships will follow the waiting batch.`,
				[
					[cb("− 1", "ship-batch"), cb("10 ships", "ship-batch"), cb("+ 1", "ship-batch")],
					[cb("Build 10 ships", "shipyard", "success")],
					[cb("Shipyard", "shipyard")],
				],
			),
		],
		["shipyard", "ship-batch-unaffordable"],
	),
	scene(
		"ship-batch-unaffordable",
		"Shipyard",
		"Insufficient local resources",
		"Colony",
		economy,
		"Unaffordable actions use Telegram's disabled button support. Resources come from the selected colony.",
		[
			message(
				`🛠 Scout Fighter × 100\nNacre · 🌐 1:214:6\n\nCost: ${resource("20 000", "5 000")}\nAvailable: ${stock}\n\nNacre needs 💠 7 600 more minerals for these ships.\nChoose a smaller batch or transport resources here.`,
				[
					[off("Build 100 · insufficient 💠 minerals")],
					[cb("Choose 10 ships", "ship-batch")],
					[app("Transport resources", "dispatch")],
				],
			),
		],
		["ship-batch", "dispatch"],
	),
	scene(
		"ship-batch-cancelled",
		"Shipyard",
		"Keep completed ships",
		"Colony",
		economy,
		"Only the six unfinished ships are cancelled; four completed ships remain usable. No full-refund wording appears.",
		[
			message(
				"✓ 6 unfinished Scout Fighters cancelled\nNacre · 🌐 1:214:6\n\nThe 4 completed ships remain stationed, and work has started on Resource Transport × 2.\nThe unused resources are back in storage.\n\n💠 13 600  ·  🔥 6 400",
				[[cb("Shipyard", "shipyard")], [app("Stationed ships", "stationed")]],
			),
		],
		["shipyard", "stationed"],
	),
	scene(
		"shipyard-locked",
		"Shipyard",
		"Expansion milestone",
		"Colony",
		economy,
		"The colony ship's final gates and increasing price are unresolved, so this state shows that explicitly instead of inventing them.",
		[
			message(
				"🛠 Colony Ship\nA Colony Ship founds your next colony on a free planet.\nThe cost rises with the number of planets you own.\n\nYour colonies: 3",
				[[off("Colony Ship")], [map("Find a free planet", "young")], [cb("Shipyard", "shipyard")]],
			),
		],
		["galaxy-map", "system-view", "tech-tree"],
		{ status: "Proposal" },
	),
	scene(
		"empire",
		"Empire",
		"Compare your colonies",
		"Colony",
		economy,
		"Each colony keeps its resource pool. Biome affects gas production; the example rates do not select multipliers.",
		[
			message(
				"🏛 Empire · 3 colonies\n\n🏝 Nacre · 🌐 1:214:6 · Home planet\n💠 12 400  ·  🔥 6 100\n💠 +720/h  ·  🔥 +240/h\nBuildings 2 / 2 · Shipyard 4 / 10\n⚠ 1 incoming fleet · 20:40\n\n🏔 Rime · 🌐 1:218:2\n💠 8 200  ·  🔥 1 800\n💠 +540/h  ·  🔥 +180/h\nBuildings 1 / 2 · Shipyard available\n\n🌋 Cinder · 🌐 1:231:4\n💠 2 100  ·  🔥 9 300\n💠 +360/h  ·  🔥 +410/h\nBuildings 1 / 2 · Shipyard 1 / 4",
				[
					[cb("Nacre", "command-center"), cb("Rime", "storage-full")],
					[app("Move resources", "dispatch")],
					[cb("Galaxy Map", "galaxy-map")],
				],
			),
		],
		["command-center", "storage-full", "dispatch", "supply-routes"],
	),
	scene(
		"supply-routes",
		"Supply Routes",
		"Later: route automation",
		"Colony",
		ui,
		"Draft label and later concept only. Automatic routes are explicitly outside V1; this wireframe directs the player to manual dispatch.",
		[
			message(
				"📦 Supply Routes\nPrepare a transport between your colonies.\n\nNacre · 🌐 1:214:6 → Rime · 🌐 1:218:2\n\nYour cargo needs ships, however impressive the shipping manifest looks.",
				[[app("Prepare transport", "dispatch")], [cb("Empire", "empire")]],
			),
		],
		["dispatch", "empire"],
		{ status: "Later" },
	),
	scene(
		"fleets",
		"Fleet Command",
		"Movements and actions",
		"Fleets & map",
		warfare,
		"Draft view label. Own missions are visible; others' incoming missions stay unknown. Recall is available only outbound.",
		[
			message(
				`🚀 Fleet Command\nNacre · 🌐 1:214:6\n\n1 outbound · 1 returning\n1 incoming fleet with an unknown mission\n\n${warning}`,
				[
					[cb("Your ship lineup", "fleet-lineup")],
					[app("Open Fleet Command", "fleets")],
					[cb("Battle Reports", "battle-reports")],
				],
			),
		],
		["dispatch", "incoming", "stationed", "fleet-returning", "fleet-lineup"],
	),
	...([false, true] as const).map((large) =>
		scene(
			large ? "fleet-lineup-large" : "fleet-lineup",
			"Fleet Command",
			large ? "Large fleet lineup" : "Colony ship lineup",
			"Fleets & map",
			warfare,
			"Compact text lists use shortlisted draft names and sample base stats. Speed is an index; higher is faster. Research and travel formulas remain separate.",
			[lineupMessage(large)],
			[large ? "fleet-lineup" : "fleet-lineup-large", "battle-reports", "fleets"],
			{ status: "Proposal" },
		),
	),
	scene(
		"dispatch",
		"Fleet Command",
		"Ships, cargo and arrival",
		"Fleets & map",
		warfare,
		"Interactive manual dispatch. Departure is immediate. Speed changes arrival and illustrative gas cost; the minimum speed and curve remain proposals.",
		[
			message(
				`🚀 Prepare a fleet\nOrigin: Nacre · 🌐 1:214:6\n${stock}\n\nChoose your ships, target, mission and cargo.`,
				[[app("Prepare dispatch", "dispatch")]],
			),
		],
		["dispatch-confirm", "fleets", "stationed"],
		{ launch: "Prepare dispatch" },
	),
	scene(
		"dispatch-confirm",
		"Fleet Command",
		"Review before dispatch",
		"Fleets & map",
		warfare,
		"The quoted sample totals reserve travel gas for both legs. Attacking an ally requires an extra explicit confirmation.",
		[
			message("🚀 Review dispatch\nYour fleet is ready for your order.", [
				[app("Review dispatch", "confirm")],
			]),
		],
		["dispatch", "fleet-dispatched", "ally-attack"],
		{ launch: "Review dispatch" },
	),
	scene(
		"ally-attack",
		"Fleet Command",
		"Explicit allied-target confirmation",
		"Fleets & map",
		warfare,
		"Deliberate betrayal is possible under the arrival defaults. This confirmation never certifies someone else's unknown mission.",
		[
			message(
				"⚠ Attack an alliance member\nTarget: Beacon · 🌐 1:219:3\nOwner: Mira · your alliance\n\nYou're about to attack Mira's colony.\nThe alliance group will have something to discuss.",
				[[app("Review allied target", "ally-attack")]],
			),
		],
		["dispatch", "fleet-dispatched"],
		{ launch: "Review allied target" },
	),
	scene(
		"fleet-dispatched",
		"Fleet Command",
		"Dispatch succeeded",
		"Fleets & map",
		warfare,
		"A completed local preview updates ships and resources once. It does not contact a game server.",
		[
			message(
				"✓ Transport dispatched\nNacre 🌐 1:214:6 → Rime 🌐 1:218:2\n\nResource Transport × 2\nCargo: 💠 2 000  ·  🔥 500\nArrival: 19:35 · Return: 20:50\nTravel gas: 🔥 180",
				[[app("View movement", "dispatched")]],
			),
		],
		["fleet-returning", "fleets", "dispatch"],
		{ launch: "View movement" },
	),
	scene(
		"fleet-returning",
		"Fleet Command",
		"Returning fleet",
		"Fleets & map",
		warfare,
		"Returning fleets cannot be recalled. Withdrawing stationed ships is a separate action from recall.",
		[
			message(
				"↙ Fleet returning\nAsh 🌐 1:214:8 → Nacre 🌐 1:214:6\n\nScout Fighter × 18\nResource Transport × 2\nReturning loot: 💠 2 688  ·  🔥 672\nArrival: 19:10",
				[[off("Returning to Nacre")], [app("Fleet movements", "fleets")]],
			),
		],
		["fleets", "stationed"],
	),
	scene(
		"stationed",
		"Fleet Command",
		"Ownership and reinforcements",
		"Fleets & map",
		warfare,
		"The host cannot dispatch visiting ships. Withdraw is available for your contingent stationed at another player's colony.",
		[
			message("🛡 Stationed ships\nReview your ships and visiting reinforcements.", [
				[cb("Ship lineup & stats", "fleet-lineup")],
				[app("Open stationed ships", "stationed")],
			]),
		],
		["dispatch", "fleets", "incoming"],
		{ launch: "Open stationed ships" },
	),
	scene(
		"incoming",
		"Fleet Command",
		"Unverified incoming fleet",
		"Fleets & map",
		warfare,
		"An allied sender is not evidence of a friendly mission. Investigation is a sample response, with no approved drone count, range or success formula.",
		[
			message(
				`⚠ Incoming fleet\nMira · Beacon 🌐 1:219:3 → Nacre 🌐 1:214:6\nArrival: 20:40\n\nMira is in your alliance, but the fleet's mission and ships are unknown.\nThe reception committee has left the banner rolled up.`,
				[[app("Spy on fleet", "incoming")]],
			),
		],
		["fleet-verified", "fleet-scan-failed", "alliance", "stationed"],
		{ launch: "Spy on fleet" },
	),
	scene(
		"fleet-verified",
		"Intelligence",
		"Verified for one movement leg",
		"Fleets & map",
		warfare,
		"Verification is attached to the current leg, not a 14-day fleet guarantee. The app includes a preview control for recall or arrival expiry.",
		[
			message(
				"👁 Reinforcements incoming\nMira → Nacre 🌐 1:214:6\nEspionage report · 18:12\n\nScout Fighter × 12\nCargo unknown\nArrival: 20:40\n\nMira's fleet is bringing reinforcements.\nThe reception committee can unroll the banner.",
				[[app("View fleet report", "verified")]],
			),
		],
		["fleet-report-expired", "incoming", "intelligence"],
		{ launch: "View fleet report" },
	),
	scene(
		"fleet-scan-failed",
		"Intelligence",
		"Investigation reveals nothing",
		"Fleets & map",
		warfare,
		"A failed scan leaves mission and composition unknown. It never turns the fleet into a reinforcement.",
		[
			message(
				"👁 Espionage revealed nothing\nMira → Nacre 🌐 1:214:6\nEspionage attempt · 18:12\n\n⚠ Incoming fleet · 20:40\nMission unknown\nShips unknown\n\nThe report arrived in a very confidential envelope.",
				[[app("View incoming fleet", "scan-failed")], [cb("Intelligence", "intelligence")]],
			),
		],
		["incoming", "intelligence"],
		{ launch: "View incoming fleet" },
	),
	scene(
		"fleet-report-expired",
		"Intelligence",
		"Historical movement report",
		"Fleets & map",
		warfare,
		"The historical snapshot remains readable, but cannot verify a replacement movement.",
		[
			message(
				"👁 Fleet report · recalled\nMira → Nacre 🌐 1:214:6\nEspionage report · 10 Oct · 18:12\n\nMission: Reinforcements\nScout Fighter × 12\n\nMira recalled this fleet at 18:26.",
				[[app("Current movements", "fleets")], [cb("Intelligence", "intelligence")]],
			),
		],
		["intelligence", "incoming"],
	),
	scene(
		"galaxy-map",
		"Galaxy Map",
		"A sector of the galaxy",
		"Fleets & map",
		ui,
		"Reuses the optimized 4,921-system sector map. Full-galaxy sector layout and fog-of-war rules remain open; exposed map data is illustrative.",
		[
			message("🗺 Galaxy Map\nExplore your sector and choose a star system.", [
				[map("Open Galaxy Map", "galaxy")],
			]),
		],
		["system-view", "dispatch", "incoming"],
		{ launch: "Open Galaxy Map" },
	),
	scene(
		"system-view",
		"System View",
		"Local orbits and incoming fleets",
		"Fleets & map",
		ui,
		"Reuses the existing four-planet study with interactive orbits. A separate chat snapshot shows the rendered hexagonal system view.",
		[
			message("🪐 System View\nChoose a planet or follow a fleet's approach.", [
				[map("Open System View", "young")],
			]),
		],
		["system-chat", "system-developed", "incoming", "planet-card"],
		{ launch: "Open System View" },
	),
	scene(
		"system-developed",
		"System View",
		"An established system",
		"Fleets & map",
		ui,
		"Existing eight-planet map study: orbital stations, patrols and transport movements, with planets sized for touch selection.",
		[
			message("🪐 Aurelia\n8 colonies share this star.\nThe property boundaries extend into orbit.", [
				[map("Open established system", "developed")],
			]),
		],
		["system-view", "galaxy-map"],
		{ launch: "Open established system" },
	),
	scene(
		"system-chat",
		"System View",
		"System snapshot in chat",
		"Fleets & map",
		ui,
		"Static hexagonal system image and native Telegram actions. The image shows sample ownership, not hidden stocks.",
		[
			{
				from: "bot",
				photo: "system.png",
				caption:
					"🪐 Solara · Sector 1 · System 214\n8 orbits · Nacre at 🌐 1:214:6\n⚠ Incoming fleet to Nacre · 20:40\n👁 Ash · report valid until 23 Oct",
				reply_markup: {
					inline_keyboard: [
						[cb("Nacre · 🌐 1:214:6", "command-center"), cb("Ash · 🌐 1:214:8", "planet-report")],
						[map("Explore system", "young")],
					],
				},
			},
		],
		["system-view", "command-center", "planet-report"],
	),
	scene(
		"intelligence",
		"Intelligence",
		"Dated reports",
		"Reports",
		warfare,
		"Draft archive label. Planet snapshots and movement-leg verification have different lifetimes.",
		[
			message(
				"👁 Intelligence\n\nPlanet reports\nAsh · 🌐 1:214:8\n9 Oct · 18:12 · valid until 23 Oct\n\nCairn · 🌐 1:228:5\n21 Sep · 10:04 · expired\n\nFleet reports\nMira → Nacre · 10 Oct · 18:12\nReinforcements · approaching\n\nOrin → Nacre · 9 Oct · 09:10\nArchived · fleet arrived",
				[
					[cb("Ash: espionage report", "planet-report")],
					[cb("Cairn: expired report", "planet-report-expired")],
					[cb("Mira: fleet report", "fleet-verified")],
				],
			),
		],
		["planet-report", "planet-report-expired", "fleet-verified", "fleet-report-expired"],
	),
	scene(
		"planet-report",
		"Intelligence",
		"Planet report snapshot",
		"Reports",
		warfare,
		"The 14-day marker is not a live feed. Share publishes only this dated report.",
		[
			message(
				"👁 Ash · 🌐 1:214:8\nEspionage report · 9 Oct · 18:12\nValid until 23 Oct · 18:12\n\n🏜 Wasteland · Abandoned world\n💠 6 400  ·  🔥 1 600\nStationed ships: Scout Fighter × 8\nBuildings and queued work: unknown\n\nAsh has no active owner, but 8 Scout Fighters still disagree with visitors.",
				[
					[app("Prepare an attack", "attack")],
					[{ text: "Share espionage report", switch_inline_query: "report:ash-20261009" }],
					[cb("Intelligence", "intelligence")],
				],
			),
		],
		["dispatch", "planet-report-expired", "planet-card"],
	),
	scene(
		"planet-report-expired",
		"Intelligence",
		"Expired planet report",
		"Reports",
		warfare,
		"Expired reports lose their current map marker. Their old values remain historical, without claiming current access.",
		[
			message(
				"👁 Cairn · 🌐 1:228:5 · expired\nEspionage report · 21 Sep · 10:04\nExpired: 5 Oct · 10:04\n\nResources on 21 Sep\n💠 4 200  ·  🔥 900\n\nCairn's current resources and stationed ships are unknown.\nThe map pin has outlived its usefulness.",
				[[off("Outside espionage range")], [cb("Intelligence", "intelligence")]],
			),
		],
		["intelligence", "planet-report"],
	),
	scene(
		"planet-card",
		"Intelligence",
		"Share a planet card",
		"Reports",
		ui,
		"A selected snapshot intended for inline sharing. This preview sends nothing to a real chat.",
		[
			message(
				"🪐 Nacre · 🌐 1:214:6\n🏝 Tropical · Colony of Joscha\nAlliance: Meridian\n\nShared 10 Oct · 18:20",
				[
					[{ text: "Share planet card", switch_inline_query: "planet:1:214:6" }],
					[map("View system", "young")],
				],
			),
		],
		["system-view", "alliance"],
	),
	scene(
		"alliance",
		"Alliance",
		"Your alliance",
		"People & season",
		design,
		"Draft view label. Group actions are only mock buttons, and no real group link or outbound message is used.",
		[
			message(
				"🤝 Meridian\nAlliance · 12 members · English\n\nOwner: Mira\nJoin policy: approval\nMinimum trophy count: 500\n\n⚠ Nacre · fleet arrives 20:40\nMission unknown · sender Mira\n\nLatest battle: Ash · 18:04\nJoscha won · battle report ready",
				[
					[cb("Alliance group", "alliance-group")],
					[cb("Member roster", "alliance-roster"), cb("Join policy", "alliance-manage")],
					[app("Coordinate reinforcements", "reinforce")],
				],
			),
		],
		["alliance-group", "alliance-roster", "alliance-manage", "alliance-join", "incoming"],
	),
	scene(
		"alliance-group",
		"Alliance",
		"A summary for the group",
		"People & season",
		"notifications.md",
		"Content proposal shown in a private fixture because the renderer does not yet support group peers. Aggregate events and avoid repeated mentions.",
		[
			message(
				"🛡 Meridian · fleet summary\n\nNacre · 🌐 1:214:6\n1 incoming fleet · arrival 20:40\nMira · mission unknown\n\nReinforcements stationed: 12 ships\n\nMira's fleet is approaching Nacre, but its mission is still unknown.",
				[[app("Spy on fleet", "incoming")], [app("Prepare reinforcements", "reinforce")]],
			),
		],
		["alliance", "incoming", "stationed"],
	),
	scene(
		"alliance-roster",
		"Alliance",
		"Members and roles",
		"People & season",
		design,
		"The roster shows alliance roles and trophies without inventing online-presence or absence reporting.",
		[
			message(
				"🤝 Meridian · members\n\nMira · Owner · 🏆 2 480\nJoscha · 🏆 1 240\nTavi · 🏆 1 100\nElian · 🏆 980\n\nShowing 1–4 of 12",
				[
					[cb("Next members →", "alliance-roster")],
					[cb("Manage membership", "alliance-manage")],
					[cb("Alliance", "alliance")],
				],
			),
		],
		["alliance", "alliance-manage"],
	),
	scene(
		"alliance-manage",
		"Alliance",
		"Owner controls",
		"People & season",
		design,
		"Owner-only scenario. Kick allows a new application; ban blocks rejoining. No real membership changes occur.",
		[
			message(
				"🤝 Meridian · alliance controls\nOwner: Mira\n\nJoin policy: approval\nMinimum trophy count: 500\nLanguage: English\n\nSelected member: Elian",
				[
					[cb("Change join policy", "alliance-manage")],
					[cb("Kick Elian", "alliance-remove"), cb("Ban Elian", "alliance-remove")],
					[cb("Member roster", "alliance-roster")],
				],
			),
		],
		["alliance-remove", "alliance-roster"],
	),
	scene(
		"alliance-remove",
		"Alliance",
		"Confirm a membership action",
		"People & season",
		design,
		"Destructive membership changes need an explicit review. This snapshot demonstrates the ban variant.",
		[
			message("Ban Elian from Meridian?\n\nElian will leave the alliance and won't be able to rejoin.", [
				[cb("Ban Elian", "alliance-roster", "danger")],
				[cb("Keep Elian", "alliance-roster")],
			]),
		],
		["alliance-roster", "alliance-manage"],
	),
	scene(
		"alliance-join",
		"Alliance",
		"Find an alliance",
		"People & season",
		design,
		"Shows open and approval policies with trophy gating. Pending approval is a separate state.",
		[
			message(
				"🤝 Find an alliance\nYour trophies: 🏆 1 240\n\nMeridian · English · 12 members\nApproval · minimum 🏆 500\n\nWayfarers · German · 8 members\nOpen · minimum 🏆 200\n\nZenith · English · 18 members\nApproval · minimum 🏆 2 000",
				[
					[cb("Apply to Meridian", "alliance-pending")],
					[cb("Join Wayfarers", "alliance")],
					[off("Zenith · requires 🏆 2 000")],
				],
			),
		],
		["alliance-pending", "alliance"],
	),
	scene(
		"alliance-pending",
		"Alliance",
		"Application pending",
		"People & season",
		design,
		"No repeated prompts or assumption that the alliance owner has read the request.",
		[
			message(
				"🤝 Application sent to Meridian\n\nYour application is waiting for Mira's approval.\nThe imperial seal has made its first impression.",
				[[cb("Find alliances", "alliance-join")], [cb("Command Center", "command-center")]],
			),
		],
		["alliance-join", "command-center"],
	),
	scene(
		"battle-reports",
		"Battle Reports",
		"Battle archive",
		"Reports",
		warfare,
		"Text reports stay in Telegram, including ship losses, resource accounting and round detail. Outcomes and stats are illustrative.",
		[archiveMessage()],
		battles.map((battle) => battle.id),
	),
	...battles.flatMap((battle) => [
		scene(
			battle.id,
			"Battle Reports",
			battle.label,
			"Reports",
			warfare,
			"Authored sample losses. Cargo is capped by surviving holds and half of each resource; salvage is 30% of lost construction resources, collected separately.",
			[reportMessage(battle)],
			[`${battle.id}-ships-0`, `${battle.id}-resources`, "battle-reports"],
		),
		...battle.contingents.map((contingent, index) =>
			scene(
				`${battle.id}-ships-${index}`,
				"Battle Reports",
				`${battle.planet} · ${contingent.owner}'s ships`,
				"Reports",
				warfare,
				"One contingent per page keeps full ship names and per-ship stats readable. Losses remain attributed to their owner.",
				[lossesMessage(battle, index)],
				[battle.id, "battle-reports"],
			),
		),
		scene(
			`${battle.id}-resources`,
			"Battle Reports",
			`${battle.planet} · loot and loss value`,
			"Reports",
			warfare,
			"Loot travels with survivors. Salvage stays at the battle orbit. Travel gas is excluded from destroyed construction value.",
			[resourceMessage(battle)],
			[battle.id, "battle-reports"],
		),
	]),
	scene(
		"battle-replay",
		"Battle Rounds",
		"Read a battle round by round",
		"Reports",
		warfare,
		"Round details are native Telegram text. Sample losses do not choose a live battle-window duration.",
		[roundsMessage()],
		["battle-report", "battle-window"],
	),
	scene(
		"battle-window",
		"Command Center",
		"Proposed battle in progress",
		"Colony",
		warfare,
		"Leading proposal, not settled behavior: 6 rounds across a 5-minute window. Only this planet's spending, cancellation and stationed ships are locked.",
		[
			message(
				"⚔ Battle at Nacre · 🌐 1:214:6\nRound 3 / 6 · ends in 2m 30s\n\nA battle is raging above Nacre, so new orders and cancellations must wait until it ends.\nExisting work and production continue, and newly completed ships join the next round.\nThe construction site has put out a second traffic cone.",
				[
					[off("Buildings: battle in progress")],
					[off("Nacre's ships are in battle")],
					[cb("Choose another colony", "colony-picker")],
					[app("Fleets elsewhere", "fleets")],
				],
			),
		],
		["colony-picker", "fleets", "battle-reports"],
		{ status: "Proposal" },
	),
	scene(
		"dynasty",
		"Dynasty",
		"Progress that survives seasons",
		"People & season",
		design,
		"Trophies and achievements survive resets. Earning formulas and achievement awards remain sample design.",
		[
			message(
				"🏆 Joscha's dynasty\n1 240 trophies\n\nAchievements\nFirst arrival · completed your first attack\nSecond horizon · founded a second colony\nTogether · defended with an ally\n\nYour trophies and achievements will follow you into the next season.\nThe trophy cabinet is already taking up most of the office.",
				[[cb("Rankings", "rankings")], [cb("Season Briefing", "season")], [cb("Invite a player", "invite")]],
			),
		],
		["rankings", "season", "invite"],
	),
	scene(
		"rankings",
		"Rankings",
		"Player standings",
		"People & season",
		design,
		"Illustrative standings by trophies. Alliance aggregation is still an example convention rather than a settled scoring rule.",
		[
			message(
				"🏆 Rankings · players\n\n1. Mira · 2 480\n2. Orin · 2 160\n3. Tavi · 1 940\n\n…\n18. Joscha · 1 240 · you\n19. Elian · 1 180",
				[[cb("Players", "rankings"), cb("Alliances", "rankings-alliance")], [cb("Dynasty", "dynasty")]],
			),
		],
		["rankings-alliance", "dynasty"],
	),
	scene(
		"rankings-alliance",
		"Rankings",
		"Alliance standings",
		"People & season",
		design,
		"Example sums of member trophies; the final alliance ranking formula needs design.",
		[
			message(
				"🏆 Rankings · alliances\nCombined member trophies\n\n1. Zenith · 28 600 · 18 members\n2. Meridian · 18 240 · 12 members\n3. Wayfarers · 11 080 · 8 members\n\nYour alliance: Meridian",
				[[cb("Players", "rankings"), cb("Alliances", "rankings-alliance")], [cb("Alliance", "alliance")]],
			),
		],
		["rankings", "alliance"],
		{ status: "Proposal" },
	),
	scene(
		"advisor",
		"Advisor",
		"First check-in",
		"Getting started",
		design,
		"The challenge chain begins with a nickname. Starter protection lasts five days; joining as its start is the provisional default.",
		[
			message(
				"👋 Welcome to Space Emperors\nThe Tide has brought another galaxy within reach for one season.\nAnyone with a planet and a fleet calls themselves an emperor here, so your stationery will need a name.\n\nChallenge 1 · Choose a nickname\nStarter protection: 5 days\nReward to your home planet: 💠 100  ·  🔥 50",
				[[cb("Choose nickname", "nickname")], [cb("Season Briefing", "season")]],
			),
		],
		["nickname", "advisor-mine", "season"],
	),
	scene(
		"nickname",
		"Advisor",
		"Nickname and validation",
		"Getting started",
		design,
		"Nicknames are unique. This storyboard shows an occupied name and an available replacement; it introduces no new naming rules.",
		[
			message("Choose your nickname\nWhat will the other emperors call you?"),
			{ from: "user", text: "Nova" },
			message("Nova is already taken.\nThat letterhead belongs to someone else, so choose another nickname."),
			{ from: "user", text: "Joscha" },
			message(
				"✓ Welcome, Joscha\nYour home planet is Nacre · 🌐 1:214:6\n\nChallenge complete\nDelivered to Nacre: 💠 100  ·  🔥 50\n\nYour name is on the door.",
				[[cb("Next challenge", "advisor-mine")]],
			),
		],
		["advisor-mine", "command-center"],
	),
	scene(
		"advisor-mine",
		"Advisor",
		"Three-second first upgrade",
		"Getting started",
		economy,
		"The active screen changes during the first upgrade rather than sending an unsolicited message at each completion.",
		[
			message(
				"🧭 Advisor · 2 / 6\nUpgrade your Mineral Mine on Nacre.\n\nNacre · 🌐 1:214:6\nMineral Mine · Level 1 → 2\nDuration: 3 seconds\nCost: 💠 50  ·  🔥 0\n\nReward to Nacre: 💠 150  ·  🔥 50",
				[[cb("Upgrade Mineral Mine", "advisor-ships", "success")], [cb("Command Center", "command-center")]],
			),
		],
		["advisor-ships", "command-center"],
	),
	scene(
		"advisor-ships",
		"Advisor",
		"Establish ship production",
		"Getting started",
		design,
		"Draft installation and hull names. First dispatch should be possible within 30 minutes; this wireframe does not define the full prerequisite tree.",
		[
			message(
				"🧭 Advisor · 3 / 6\nBuild your Orbital Shipyard, then build Scout Fighters.\nA fleet looks more convincing with ships in it.\n\n✓ Nickname chosen\n✓ Mineral Mine upgraded\n\nReward to Nacre: 💠 300  ·  🔥 100",
				[
					[cb("Open buildings", "buildings")],
					[cb("Choose ships to build", "ship-batch")],
					[cb("View next challenge", "advisor-dispatch")],
				],
			),
		],
		["buildings", "ship-batch", "advisor-dispatch"],
	),
	scene(
		"advisor-dispatch",
		"Advisor",
		"Your first attack",
		"Getting started",
		design,
		"The target is an abandoned world in the home system. Founding a second colony is a later milestone, not a tutorial task.",
		[
			message(
				"🧭 Advisor · 6 / 6\nPrepare your first attack on Ash, an abandoned world in your home system.\n\n✓ Starter ships built\n✓ Fleet Command opened\n\nAsh · 🌐 1:214:8 · Abandoned world\n\nReward to Nacre: 💠 500  ·  🔥 200",
				[[app("Prepare first attack", "attack")], [cb("Battle report", "battle-report")]],
			),
		],
		["dispatch", "battle-report", "advisor-complete"],
	),
	scene(
		"advisor-complete",
		"Advisor",
		"Claim a challenge once",
		"Getting started",
		design,
		"A completed challenge is claimable once; the next snapshot shows the reward already claimed.",
		[
			message(
				"✓ First attack completed\nYour fleet is returning to Nacre.\nThe imperial history will need more than one page now.\n\nReward delivered to Nacre · 🌐 1:214:6\n💠 500  ·  🔥 200",
				[
					[off("Reward delivered")],
					[cb("Battle report", "battle-report")],
					[cb("Command Center", "command-center")],
				],
			),
		],
		["battle-report", "command-center"],
	),
	scene(
		"preferences",
		"Alert Preferences",
		"Control messages",
		"Getting started",
		"notifications.md",
		"Routine and critical categories are separate. Quiet hours apply to both unless critical override is explicitly enabled. Reminders start off.",
		[
			message(
				"🔔 Notification Preferences\n\nUpgrades and ship completions: on\nIncoming fleets and known attacks: on\n\nQuiet hours: 22:00–08:00\nLocal time: Berlin\nFleet notifications during quiet hours: off\n\nFleet reminders: off\nReturn reminders: off",
				[
					[cb("Completions: on", "preferences-muted"), cb("Incoming fleets: on", "preferences-muted")],
					[cb("Quiet hours", "preferences-quiet")],
					[cb("Reminders · off", "preferences-quiet")],
				],
			),
		],
		["preferences-muted", "preferences-quiet", "activity"],
	),
	scene(
		"preferences-muted",
		"Alert Preferences",
		"Routine messages muted",
		"Getting started",
		"notifications.md",
		"The underlying events continue and remain visible on return; this state does not postpone a flood of messages.",
		[
			message(
				"🔕 Completion notifications are off\n\nYour next Activity Summary will show what finished.\n\nIncoming fleet notifications: on\nQuiet hours: 22:00–08:00\nNotifications during quiet hours: off\nReminders: off",
				[[cb("Turn completion notifications on", "preferences")], [cb("Activity Summary", "activity")]],
			),
		],
		["preferences", "activity"],
	),
	scene(
		"preferences-quiet",
		"Alert Preferences",
		"Quiet hours and explicit override",
		"Getting started",
		"notifications.md",
		"No escalation because a player is asleep. Enabling critical override is a distinct explicit choice, not a default.",
		[
			message(
				"🌙 Quiet hours\n22:00 → 08:00 · Berlin\n\nAll notifications are quiet during these hours.\nMay incoming fleets and known attacks interrupt?",
				[
					[cb("Keep all notifications quiet", "preferences")],
					[cb("Allow fleet notifications", "preferences")],
					[cb("Change quiet hours", "preferences-quiet")],
				],
			),
		],
		["preferences", "activity"],
	),
	scene(
		"season",
		"Season Briefing",
		"Season rules and carry-over",
		"People & season",
		design,
		"No final season length or speed is selected. Example dates are explicitly marked, and protection is five days.",
		[
			message(
				"🌌 Season Briefing\nThe Tide has brought a new galaxy within reach for one season.\nThe imperial flags still have the creases from storage.\n\n10 Oct → 9 Jan · 1× game speed\n5 days of starter protection\nEnglish and German\n\nYour dynasty keeps\nTrophies and achievements\n\nNext season starts fresh\nColonies, ships, resources and research",
				[[cb("Dynasty", "dynasty")], [cb("Start with the Advisor", "advisor")]],
			),
		],
		["dynasty", "advisor", "season-ended"],
	),
	scene(
		"season-ended",
		"Season Briefing",
		"Between seasons",
		"People & season",
		design,
		"An end-state proposal with no invented new-season start date or paid early-access mechanism.",
		[
			message(
				"🌌 This season has ended\nThe galaxy stands frozen exactly as it was, unfinished upgrades included.\nYour dynasty's trophies and achievements come with you into the next season.\n\n🏆 1 240 trophies\n3 achievements\n\nNext season: awaiting announcement",
				[[cb("View dynasty", "dynasty")], [cb("Final rankings", "rankings")]],
			),
		],
		["dynasty", "rankings"],
		{ status: "Proposal" },
	),
	scene(
		"activity",
		"Activity Summary",
		"Return after eight hours",
		"Getting started",
		"notifications.md",
		"One summary of changes since the last meaningful action. Incoming fleets remain prominent without replaying every queued notification.",
		[
			message(
				"Welcome back, Joscha\nHere's what changed in the last 8 hours.\n\n⚠ Incoming fleet to Nacre · 20:40\nMira · mission unknown\n\nCompleted\n3 building upgrades across 2 colonies\nCombustion Engine reached level 4\n10 Scout Fighters finished at Nacre\n\nDelivered to Rime\n💠 2 000  ·  🔥 500\n\nBattle\nVictory at Ash · battle report ready",
				[
					[app("Spy on incoming fleet", "incoming")],
					[cb("Battle report", "battle-report"), cb("Empire", "empire")],
					[cb("Notification Preferences", "preferences")],
				],
			),
		],
		["incoming", "battle-report", "empire", "activity-empty"],
	),
	scene(
		"activity-empty",
		"Activity Summary",
		"Nothing new",
		"Getting started",
		"notifications.md",
		"No guilt, urgency or upgrade reminder when there are no new events.",
		[
			message(
				"You're up to date\nNothing new has happened since your last orders.\nThe imperial bulletin is unusually thin.\n\nNext completion at Nacre\nMineral Mine → 13 · 18 min",
				[[cb("Command Center", "command-center")], [map("Explore the galaxy", "galaxy")]],
			),
		],
		["command-center", "galaxy-map"],
	),
	scene(
		"invite",
		"Dynasty",
		"Invite links and bonus codes",
		"People & season",
		design,
		"A sample invite token with no live recipient. Reward amounts and claim conditions are undecided; premium remains later work.",
		[
			message(
				"🎁 Invite a player\nInvite someone to the galaxy and earn a reward when they join.\nThere's always room for another emperor with opinions about borders.\n\nYour invite code: DEMO-JOSCHA",
				[
					[{ text: "Copy invite code", copy_text: { text: "DEMO-JOSCHA" } }],
					[cb("Redeem bonus code", "bonus-code")],
					[cb("Dynasty", "dynasty")],
				],
			),
		],
		["bonus-code", "dynasty"],
	),
	scene(
		"bonus-code",
		"Dynasty",
		"Bonus code validation",
		"People & season",
		design,
		"Example failed redemption with a clear recovery path; no actual code is consumed.",
		[
			message("🎁 Bonus code\nReply with your code to deliver its resources to Nacre 🌐 1:214:6."),
			{ from: "user", text: "DEMO-EXPIRED" },
			message("This bonus code has expired.\nTry another code.", [
				[cb("Try another code", "invite")],
				[cb("Change receiving colony", "colony-picker")],
			]),
		],
		["invite", "colony-picker"],
	),
];

export const journeys = [
	{
		title: "First attack",
		ids: [
			"advisor",
			"nickname",
			"advisor-mine",
			"advisor-ships",
			"ship-batch",
			"advisor-dispatch",
			"dispatch",
			"battle-report",
			"advisor-complete",
		],
	},
	{
		title: "A brief check-in",
		ids: ["activity", "command-center", "buildings", "building-detail", "building-queue"],
	},
	{
		title: "Rally a defense",
		ids: ["incoming", "fleet-verified", "alliance", "stationed", "dispatch", "battle-defense"],
	},
	{
		title: "Move resources",
		ids: ["empire", "dispatch", "dispatch-confirm", "fleet-dispatched", "fleet-returning"],
	},
];
