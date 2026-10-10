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
const warning = "⚠ Incoming fleet · Nacre 1:214:6 · 20:40\nMission unverified · inspect before acting.";
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
	description: "A persistent galaxy. Build colonies, coordinate fleets, share intelligence.",
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
				`🪐 Nacre · 1:214:6\nCommand Center · 🏝 Tropical · Home planet\n\n${stock}\n💠 +720/h · storage 20 000\n🔥 +240/h · storage 10 000\n\n2 building upgrades running\nMineral Mine → 13 · 18 min\nAtmospheric Harvester → 9 · 32 min\nResearch: Combustion Engine → 5 · 46 min\nShipyard: 4 / 10 Scout Fighters ready\n\n${warning}`,
				[
					[cb("Buildings", "buildings"), cb("Research", "research")],
					[cb("Shipyard", "shipyard"), cb("Empire", "empire")],
					[app("Inspect incoming fleet", "incoming")],
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
				"🪐 Choose a colony\n\n🏝 Nacre · 1:214:6 · Home planet\n💠 12 400  ·  🔥 6 100\n\n🏔 Rime · 1:218:2\n💠 8 200  ·  🔥 1 800\n\n🌋 Cinder · 1:231:4\n💠 2 100  ·  🔥 9 300",
				[
					[cb("Nacre · 1:214:6", "command-center")],
					[cb("Rime · 1:218:2", "storage-full")],
					[cb("Cinder · 1:231:4", "empire")],
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
				"🏔 Rime · 1:218:2\nCommand Center · Snowy\n\n💠 20 000 / 20 000\nMineral production paused: storage is full.\n🔥 1 800 / 10 000 · +180/h\n\nBuilding upgrades: 1 / 2 active\nResearch Lab → 4 · 27 min\nShipyard is available",
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
				`🏗 Buildings · Nacre 1:214:6\n${stock}\n\nRUNNING · 2 / 2\nMineral Mine 12 → 13 · 18 min\nAtmospheric Harvester 8 → 9 · 32 min\n\nWAITING · already paid\nResearch Lab 4 → 5\n\nAVAILABLE\nLogistics Depot · Level 6\nOrbital Shipyard · Level 4\n\n${warning}`,
				[
					[cb("Mineral Mine · 12 → 13", "building-detail")],
					[cb("Logistics Depot · Level 6", "building-detail")],
					[cb("Manage paid queue", "building-queue")],
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
				`🏗 Logistics Depot · 6 → 7\nNacre · 1:214:6\n\nStorage capacity\n💠 20 000 → 26 000\n🔥 10 000 → 13 000\n\nCost: ${resource("2 400", "800")}\nAfter payment: ${resource("10 000", "5 300")}\nDuration: 24 min once started\n\nBoth building slots are occupied.\nJoins the paid waiting queue.`,
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
				"🏗 Building queue · Nacre\n\nRUNNING\nMineral Mine → 13 · 18 min\nAtmospheric Harvester → 9 · 32 min\n\nWAITING · already paid\n1. Research Lab → 5\n2. Logistics Depot → 7\n\nWaiting work starts when a building slot opens.",
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
				`✓ Logistics Depot upgrade cancelled\nNacre · 1:214:6\n\n${stock}\n\nResearch Lab → 5 is still waiting.\n2 building upgrades continue.`,
				[[cb("Buildings", "buildings"), cb("Paid queue", "building-queue")]],
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
				"⏸ Research Lab → 5 is waiting\nNacre · 1:214:6\n\nMissing prerequisite in this example:\nHeadquarters level 5\n\nIts prerequisite upgrade was cancelled.\nThis work stays in your paid queue.\nOther eligible work can start.",
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
				`🔬 Research\nApplies across your colonies this season\n\nRUNNING AT NACRE\nCombustion Engine 4 → 5 · 46 min\nPaid from Nacre · 1:214:6\n\nWAITING · already paid\nLaser Cannon 2 → 3\n\nCOMPLETED\nCombustion Engine · 4\nLaser Cannon · 2\nSolar Sails · 1\n\n${warning}`,
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
				`🔬 Solar Sails · 1 → 2\nApplies across all your colonies\n\nExample effect: greater travel speed\nNew speeds apply to future dispatches.\nFleets already in flight keep their arrival times.\n\nPaid from Nacre · 1:214:6\n${stock}\nCost: ${resource("3 600", "1 800")}\nDuration: 1h 20m once started\n\nJoins your research queue.`,
				[
					[cb("Queue research · Level 2", "research")],
					[cb("Change paying colony", "colony-picker")],
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
				`🔬 Research\nNo research running or waiting\n\nYour completed research still applies:\nCombustion Engine · 4\nLaser Cannon · 2\nSolar Sails · 1\n\nNacre · 1:214:6\n${stock}`,
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
				"🔬 Tech tree · example dependencies\n\n✓ Research Lab · Level 4\n  ↳ Combustion Engine · Level 4\n  ↳ Laser Cannon · Level 2\n\n○ Advanced ship construction\n  Prerequisites still under design\n\nColony ships are a substantial investment.\nTheir gate and price curve are not settled.",
				[
					[cb("Combustion Engine", "research-detail")],
					[off("Colony Ship · gate undecided")],
					[cb("Research", "research")],
				],
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
				`🛠 Shipyard · Nacre 1:214:6\nOrbital Shipyard · Level 4\n${stock}\n\nRUNNING\nScout Fighter · 4 / 10 complete\nNext ship: 2 min · batch: 12 min\nCompleted ships are already stationed.\n\nWAITING · already paid\nResource Transport × 2\n\nYOUR STATIONED SHIPS\nScout Fighter × 24\nResource Transport × 6`,
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
				`🛠 Scout Fighter × 10\nFast · fragile · small cargo hold\n\nBatch cost: ${resource("2 000", "500")}\n2 min per ship once started\nEach completed ship becomes available.\n\nAlready queued: 1 active, 1 waiting\nThis batch joins the waiting queue.`,
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
				`🛠 Scout Fighter × 100\nNacre · 1:214:6\n\nCost: ${resource("20 000", "5 000")}\nAvailable: ${stock}\n\nNeed 💠 7 600 more at Nacre.\nChoose a smaller batch or transport resources.`,
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
				"✓ 6 unfinished Scout Fighters cancelled\nNacre · 1:214:6\n\n4 completed ships remain stationed.\nResource Transport × 2 has started.\n\n💠 13 600  ·  🔥 6 400",
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
				"🛠 Colony Ship\nFounds a colony on a free planet\n\nExpansion is a substantial investment.\nCost increases with owned planets.\n\nDESIGN PREVIEW\nPrerequisites and price curve are undecided.\nYou currently own 3 colonies.",
				[
					[off("Production gate under design")],
					[map("Find a free planet", "young")],
					[cb("Shipyard", "shipyard")],
				],
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
				"🏛 Empire · 3 colonies\n\n🏝 Nacre · 1:214:6 · Home planet\n💠 12 400  ·  🔥 6 100\n💠 +720/h  ·  🔥 +240/h\nBuildings 2 / 2 · Shipyard 4 / 10\n⚠ 1 incoming fleet · 20:40\n\n🏔 Rime · 1:218:2\n💠 8 200  ·  🔥 1 800\n💠 +540/h  ·  🔥 +180/h\nBuildings 1 / 2 · Shipyard available\n\n🌋 Cinder · 1:231:4\n💠 2 100  ·  🔥 9 300\n💠 +360/h  ·  🔥 +410/h\nBuildings 1 / 2 · Shipyard 1 / 4",
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
				"📦 Supply Routes · later concept\n\nAutomatic transfers are outside V1.\nFor now, dispatch ships with cargo.\n\nNacre · 1:214:6 → Rime · 1:218:2\nChoose ships, cargo and arrival time\nfor each transport.",
				[[app("Prepare a manual transport", "dispatch")], [cb("Empire", "empire")]],
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
				`🚀 Fleet Command\nNacre · 1:214:6\n\n1 outbound · 1 returning\n1 unverified incoming fleet\n\n${warning}`,
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
				`🚀 Prepare a fleet\nOrigin: Nacre · 1:214:6\n${stock}\n\nChoose owned ships, target, mission and cargo.\nPick an arrival time within the fleet's speed bounds.`,
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
			message(
				"🚀 Review dispatch\nYour ships leave when you confirm.\n\nTravel time stays fixed during flight.",
				[[app("Review dispatch", "confirm")]],
			),
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
				"⚠ Attack an alliance member\nTarget: Beacon · 1:219:3\nOwner: Mira · your alliance\n\nThis is an attack mission.",
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
				"✓ Transport dispatched\nNacre 1:214:6 → Rime 1:218:2\n\nResource Transport × 2\nCargo: 💠 2 000  ·  🔥 500\nArrival: 19:35 · Return: 20:50\nTravel gas reserved: 🔥 180",
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
				"↙ Fleet returning\nAsh 1:214:8 → Nacre 1:214:6\n\nScout Fighter × 18\nResource Transport × 2\nCargo: 💠 2 688  ·  🔥 672\nArrival: 19:10\n\nThis fleet is already returning.",
				[[off("Recall unavailable on return")], [app("Fleet movements", "fleets")]],
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
			message("🛡 Stationed ships\nOwned ships and visiting reinforcements remain separate.", [
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
				`⚠ Incoming fleet\nMira · Beacon 1:219:3 → Nacre 1:214:6\nArrival: 20:40\n\nMission and ship composition unknown.\nMira is in your alliance.`,
				[[app("Inspect fleet", "incoming")]],
			),
		],
		["fleet-verified", "fleet-scan-failed", "alliance", "stationed"],
		{ launch: "Inspect fleet" },
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
				"👁 Reinforcements incoming\nMira → Nacre 1:214:6\nVerified at 18:12 · current leg only\n\nScout Fighter × 12\nCargo unknown\nArrival: 20:40\n\nRecall, arrival or a replacement leg ends this verification.",
				[[app("Inspect verification", "verified")]],
			),
		],
		["fleet-report-expired", "incoming", "intelligence"],
		{ launch: "Inspect verification" },
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
				"👁 No new information\nMira → Nacre 1:214:6\nInvestigation at 18:12\n\n⚠ Incoming fleet · 20:40\nMission unverified\nShip composition unknown",
				[[app("Inspect incoming fleet", "scan-failed")], [cb("Intelligence", "intelligence")]],
			),
		],
		["incoming", "intelligence"],
		{ launch: "Inspect incoming fleet" },
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
				"👁 Fleet report · historical\nMira → Nacre 1:214:6\nVerified 10 Oct · 18:12\n\nSnapshot: Reinforcement mission\nScout Fighter × 12\n\nThis movement was recalled at 18:26.\nIts verification is no longer current.",
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
			message(
				"🗺 Galaxy Map\nYour neighbourhood in one sector\n\nSelect a hex to inspect its stellar system.\nZoom out for the sector; pan to explore.",
				[[map("Open Galaxy Map", "galaxy")]],
			),
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
			message(
				"🪐 System View\nPlanets, ownership and visible movements\n\n⚠ Incoming fleets remain visible on the map.\nTap a marker for intelligence.",
				[[map("Open System View", "young")]],
			),
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
			message("🪐 Aurelia · established system\n8 colonies and orbital infrastructure", [
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
					"🪐 Solara · Sector 1 · System 214\n8 orbits · Nacre at 1:214:6\n⚠ Incoming fleet to Nacre · 20:40\n👁 Ash · report valid until 23 Oct",
				reply_markup: {
					inline_keyboard: [
						[cb("Nacre · 1:214:6", "command-center"), cb("Ash · 1:214:8", "planet-report")],
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
				"👁 Intelligence\n\nPLANET REPORTS\nAsh · 1:214:8\n9 Oct · 18:12 · valid until 23 Oct\n\nCairn · 1:228:5\n21 Sep · 10:04 · expired\n\nFLEET REPORTS\nMira → Nacre · 10 Oct · 18:12\nReinforcements · current leg\n\nOrin → Nacre · 9 Oct · 09:10\nHistorical · fleet arrived",
				[
					[cb("Ash · current snapshot", "planet-report")],
					[cb("Cairn · expired snapshot", "planet-report-expired")],
					[cb("Mira · movement verification", "fleet-verified")],
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
				"👁 Ash · 1:214:8\nSnapshot: 9 Oct · 18:12\nValid until 23 Oct · 18:12\n\n🏜 Wasteland · Abandoned world\n💠 6 400  ·  🔥 1 600\nStationed ships: Scout Fighter × 8\nBuildings and queued work: unknown\n\nThese values may have changed.",
				[
					[app("Prepare an attack", "attack")],
					[{ text: "Share this snapshot", switch_inline_query: "report:ash-20261009" }],
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
				"👁 Cairn · 1:228:5 · expired\nSnapshot: 21 Sep · 10:04\nExpired: 5 Oct · 10:04\n\nHistorical resources\n💠 4 200  ·  🔥 900\n\nCurrent resources and stationed ships unknown.\nNo current 👁 marker on this planet.",
				[[off("Investigation unavailable · outside sample range")], [cb("Intelligence", "intelligence")]],
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
				"🪐 Nacre · 1:214:6\n🏝 Tropical · Colony of Joscha\nAlliance: Meridian\n\nShared 10 Oct · 18:20\nResource stocks and queues are private.",
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
				"🤝 Meridian\nAlliance · 12 members · English\n\nOwner: Mira\nJoin policy: approval\nMinimum trophy count: 500\n\n⚠ Nacre · fleet arrives 20:40\nMission unverified · sender Mira\n\nLatest battle: Ash · 18:04\nJoscha won · report available",
				[
					[cb("Open alliance group · preview", "alliance-group")],
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
				"🛡 Meridian · fleet summary\n\nNacre · 1:214:6\n1 incoming fleet · arrival 20:40\nMira · mission unverified\n\n12 allied ships already stationed\nInspect the movement before coordinating.",
				[[app("Inspect movement", "incoming")], [app("Prepare reinforcements", "reinforce")]],
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
				"🤝 Meridian · owner controls\nPreview as Mira\n\nJoin policy: approval\nMinimum trophy count: 500\nLanguage: English\n\nSelected member: Elian\nKick: may apply again\nBan: cannot rejoin",
				[
					[cb("Change join policy", "alliance-manage")],
					[cb("Kick Elian · review", "alliance-remove"), cb("Ban Elian · review", "alliance-remove")],
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
			message(
				"Ban Elian from Meridian?\n\nElian will leave the alliance and cannot rejoin.\nUse Kick instead if a later application should be allowed.",
				[
					[cb("Confirm ban · preview", "alliance-roster", "danger")],
					[cb("Keep membership", "alliance-roster")],
				],
			),
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
					[cb("Join Wayfarers · preview", "alliance")],
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
				"🤝 Application sent to Meridian\n\nApproval is pending.\nYou can keep playing while the owner decides.",
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
				"⚔ Battle at Nacre · 1:214:6\nPROPOSED TIMED-BATTLE STATE\nRound 3 / 6 · ends in 2m 30s\n\nProduction and paid work continue.\nNewly completed ships join next round.\nSpending, cancelling and stationed ships\nare locked here until the battle ends.\n\nYour other colonies remain available.",
				[
					[off("Buildings · locked during battle")],
					[off("Dispatch from Nacre · ships in battle")],
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
				"🏆 Joscha's dynasty\n1 240 trophies\n\nACHIEVEMENTS\nFirst arrival · completed your first attack\nSecond horizon · founded a second colony\nTogether · defended with an ally\n\nTrophies and achievements survive\nthe end of a season.\nColonies, ships and research reset.",
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
				"🏆 Rankings · players\n\n1. Mira · 2 480\n2. Orin · 2 160\n3. Tavi · 1 940\n\n…\n18. Joscha · 1 240 · you\n19. Elian · 1 180\n\nUpdated with this sample snapshot.",
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
				"🏆 Rankings · alliances\nExample: combined member trophies\n\n1. Zenith · 28 600 · 18 members\n2. Meridian · 18 240 · 12 members\n3. Wayfarers · 11 080 · 8 members\n\nYour alliance: Meridian",
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
				"👋 Welcome to Space Emperors\nI'm your advisor. Let's establish your first colony.\n\nChoose a nickname to begin.\nYour home planet has 5 days of starter protection.\n\nChallenge 1 · Choose a nickname\nReward to your home planet: 💠 100  ·  🔥 50",
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
			message("Choose your nickname\nReply with the name you want other players to see."),
			{ from: "user", text: "Nova" },
			message("Nova is already taken.\nChoose another nickname."),
			{ from: "user", text: "Joscha" },
			message(
				"✓ Welcome, Joscha\nYour home planet is Nacre · 1:214:6\n\nChallenge complete\n💠 100  ·  🔥 50 added to Nacre",
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
				"🧭 Advisor · 2 / 6\nUpgrade your Mineral Mine\n\nNacre · 1:214:6\nMineral Mine · Level 1 → 2\nDuration: 3 seconds\nCost: 💠 50  ·  🔥 0\n\nReward to Nacre: 💠 150  ·  🔥 50",
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
				"🧭 Advisor · 3 / 6\nEstablish ship production\n\n✓ Nickname chosen\n✓ Mineral Mine upgraded\n\nNext: build your Orbital Shipyard.\nThen produce starter Scout Fighters.\n\nReward to Nacre: 💠 300  ·  🔥 100",
				[
					[cb("Open buildings", "buildings")],
					[cb("Preview ship batch", "ship-batch")],
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
				"🧭 Advisor · 6 / 6\nAttack an abandoned world\n\n✓ Starter ships built\n✓ Fleet Command opened\n\nAsh · 1:214:8 · Abandoned world\nChoose ships and review your arrival time.\nYour survivors return after the battle.\n\nReward to Nacre: 💠 500  ·  🔥 200",
				[[app("Prepare first attack", "attack")], [cb("Preview battle report", "battle-report")]],
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
				"✓ First attack completed\nYour fleet is returning to Nacre.\n\nReward claimed at Nacre · 1:214:6\n💠 500  ·  🔥 200\n\nYou can plan upgrades or inspect the battle.\nThe galaxy is yours to explore at your pace.",
				[
					[off("Reward already claimed")],
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
				"🔔 Alert Preferences\n\nRoutine completions: on\nIncoming fleets and verified attacks: on\n\nQuiet hours: 22:00–08:00\nTime zone: Europe/Berlin\nCritical alerts during quiet hours: off\n\nFleet reminders: off\nReactivation reminders: off\n\nUnseen routine changes are grouped into\none summary when you return.",
				[
					[cb("Routine · on", "preferences-muted"), cb("Critical · on", "preferences-muted")],
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
				"🔕 Routine messages are muted\n\nUpgrades, production and fleets keep progressing.\nYour next Activity Summary will show changes.\n\nCritical fleet alerts: on\nQuiet hours: 22:00–08:00\nCritical override: off\nReminders: off",
				[[cb("Turn routine messages on", "preferences")], [cb("Activity Summary", "activity")]],
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
				"🌙 Quiet hours\n22:00 → 08:00 · Europe/Berlin\n\nRoutine messages are quiet.\nCritical fleet alerts are also quiet.\nGame events remain visible when you return.\n\nAllow critical alerts during these hours?",
				[
					[cb("Keep all alerts quiet", "preferences")],
					[cb("Allow critical alerts · preview", "preferences")],
					[cb("Change times · preview", "preferences-quiet")],
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
				"🌌 Season Briefing\n\nILLUSTRATIVE SEASON\n10 Oct → 9 Jan · 1× game speed\nFinal duration and speed remain undecided.\n\nOne galaxy, growing by sectors\n5 days of starter protection when joining\nManual resource transports\nEnglish and German\n\nCARRY OVER\nTrophies and achievements\n\nRESET\nColonies, ships, resources and research",
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
				"🌌 This season has ended\n\nYour dynasty remains:\n🏆 1 240 trophies\n3 achievements\n\nColonies, ships, resources and research reset.\nNext season's start has not been announced.",
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
				"Welcome back, Joscha\nSince your last action · 8 hours ago\n\n⚠ Incoming fleet to Nacre · 20:40\nMira · mission unverified\n\nCOMPLETED\n3 building upgrades across 2 colonies\nCombustion Engine reached level 4\n10 Scout Fighters finished at Nacre\n\nARRIVED\nTransport delivered to Rime\n💠 2 000  ·  🔥 500\n\nBATTLE\nVictory at Ash · report ready",
				[
					[app("Inspect incoming fleet", "incoming")],
					[cb("Battle report", "battle-report"), cb("Empire", "empire")],
					[cb("Alert Preferences", "preferences")],
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
				"You're up to date\nNo new events since your last action.\n\nNext completion at Nacre:\nMineral Mine → 13 · 18 min",
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
				"🎁 Invite a player\nYour invitation token: DEMO-JOSCHA\n\nInviting a new player earns a reward.\nReward amount and claim conditions\nare still under design.\n\nHave a bonus code?\nChoose the colony that receives its resources.",
				[
					[{ text: "Copy sample invite token", copy_text: { text: "DEMO-JOSCHA" } }],
					[cb("Redeem bonus code · preview", "bonus-code")],
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
			message("🎁 Bonus code\nResources will go to Nacre · 1:214:6\nReply with your code."),
			{ from: "user", text: "DEMO-EXPIRED" },
			message("This code has expired.\nNo resources were added.", [
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
