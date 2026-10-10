// Player-facing onboarding copy stays together for the planned batch writing review.
// Extraction preserves the current wording; these lines are not approved final copy.
export const admirals = [
	{ id: "calder", name: "Renn Calder", voice: "Experienced, patient, quietly dry" },
	{ id: "voss", name: "Mara Voss", voice: "Direct, practical, fiercely protective" },
] as const;
export type Admiral = (typeof admirals)[number]["id"];
export type Beat = {
	id: string;
	title: string;
	phase: "First command" | "Later situations";
	art: string;
	milestone: boolean;
	facts: string;
	lines: Record<Admiral, string>;
	action: string;
	note: string;
	app?: string;
};

// Narrative, prices and timings are proposals. Each style gets identical mechanics and screen controls.
export const beats: Beat[] = [
	{
		id: "welcome",
		title: "First contact",
		phase: "First command",
		art: "welcome",
		milestone: true,
		facts: "Nacre · 1:214:6 · Your home planet\nStarter protection: 5 days",
		lines: {
			calder:
				"Commander. Renn Calder, Frontier Relay. Nacre is yours to build. I'll help you get its first ships into orbit. What should the crews call you?",
			voss: "Mara Voss, Frontier Relay. That world below is your first command. We'll get its mines working and its ships flying. What name goes on the roster?",
		},
		action: "Choose my nickname",
		note: "A portrait can establish a human relationship here. The Frontier Relay is proposed lore: independent colonies share navigation and emergency assistance.",
	},
	{
		id: "nickname",
		title: "Choose a nickname",
		phase: "First command",
		art: "welcome",
		milestone: false,
		facts: "Nickname: Joscha\nThis name is available.\nChallenge reward at Nacre: 💠 100 · 🔥 50",
		lines: {
			calder: "Joscha. I'll put that on the roster. The colony will make the name mean something.",
			voss: "Joscha. Good. Let's give the flight crews a reason to remember it.",
		},
		action: "Confirm Joscha",
		note: "Compare the repeated portrait with a short text confirmation. A form does not always benefit from a new character appearance.",
	},
	{
		id: "home",
		title: "Meet your colony",
		phase: "First command",
		art: "construction",
		milestone: false,
		facts:
			"Command Center · Nacre 1:214:6\n🏝 Tropical · Home planet\n💠 500 · 🔥 250\nMineral Mine · Level 1\nBuildings: 0 / 2 running",
		lines: {
			calder:
				"The ledgers here belong to Nacre. When you found another colony, you'll carry supplies between them. First, let's give this mine a better cutting head.",
			voss: "These are Nacre's stores. Spend here, build here. A second colony will need its own supplies. Start with the mine.",
		},
		action: "Open Mineral Mine",
		note: "The colony overview is a repeated-use screen. Artwork competes with stocks and active work here.",
	},
	{
		id: "mine",
		title: "Your first upgrade",
		phase: "First command",
		art: "construction",
		milestone: false,
		facts:
			"Mineral Mine · 1 → 2\nNacre · 1:214:6\nCost: 💠 50 · 🔥 0\nDuration: 3 seconds\nChallenge reward: 💠 150 · 🔥 50",
		lines: {
			calder: "A fleet begins with a mine. Authorize the upgrade. This first crew is already standing by.",
			voss: "Ships need hulls. Hulls need minerals. Give the crew the order; this first upgrade takes three seconds.",
		},
		action: "Upgrade Mineral Mine",
		note: "The three-second upgrade edits the active screen. It does not create a separate unsolicited completion message.",
	},
	{
		id: "mine-ready",
		title: "Work completes",
		phase: "First command",
		art: "construction",
		milestone: false,
		facts:
			"✓ Mineral Mine reached level 2\nNacre · 1:214:6\nChallenge reward claimed once\n💠 150 · 🔥 50 added to Nacre",
		lines: {
			calder: "Good. The mine will keep working while you're elsewhere. Next, the orbital yard.",
			voss: "The crew has it from here. Let's turn those minerals into ships.",
		},
		action: "Establish ship production",
		note: "A deliberately ordinary success: test whether a large portrait overstates the importance of a routine completion.",
	},
	{
		id: "shipyard",
		title: "Establish ship production",
		phase: "First command",
		art: "hangar",
		milestone: false,
		facts:
			"Orbital Shipyard · Level 1\nExample cost: 💠 300 · 🔥 100\nExample duration: 4 min\nBuilding work and research progress separately.",
		lines: {
			calder: "The relay brought plans, not a fleet. Build the yard and your own crews can take over.",
			voss: "This yard gives you ships of your own. Research can run while the builders work.",
		},
		action: "Build Orbital Shipyard",
		note: "Installation and ship names remain draft labels. Prices and prerequisite details are illustrative.",
	},
	{
		id: "ships",
		title: "Starter ships",
		phase: "First command",
		art: "hangar",
		milestone: true,
		facts:
			"Scout Fighter batch · 4 / 6 complete\nNext ship: 2 min\nCompleted ships are already stationed.\nChallenge reward at Nacre: 💠 300 · 🔥 100",
		lines: {
			calder:
				"Four crews are ready. Each finished ship is yours to use; you needn't wait for the whole batch. Let's learn to move them.",
			voss: "Four fighters ready. The other two are still on the line. Finished ships can fly now. Open Fleet Command.",
		},
		action: "Open Fleet Command",
		app: "attack",
		note: "A first fleet is a plausible character milestone. The later batch notifications should stay compact.",
	},
	{
		id: "target",
		title: "Choose the first target",
		phase: "First command",
		art: "planning",
		milestone: false,
		facts:
			"Ash · 1:214:8 · Abandoned world\nIn your home system\nA few minutes later: all 6 fighters are ready.\nThis is an attack target, not a free colony.\nPrepare ships, target and mission in the Mini App.",
		lines: {
			calder:
				"Ash's owner is gone. Its old defense ships aren't. We'll plan an attack, read the report, then bring our survivors home.",
			voss: "Ash is abandoned, but its defenses still work. Check the target before you launch. Empty command chair doesn't mean empty orbit.",
		},
		action: "Prepare first attack",
		app: "attack",
		note: "The art and voice introduce the tactical decision. Map and fleet controls belong in the Mini App.",
	},
	{
		id: "review",
		title: "Review the dispatch",
		phase: "First command",
		art: "dispatch",
		milestone: false,
		facts:
			"Attack · Nacre 1:214:6 → Ash 1:214:8\nScout Fighter × 6\nTravel time: 45 min\nArrival: 19:05\nReserved travel gas: 🔥 80\nDeparture is immediate when confirmed.",
		lines: {
			calder:
				"Read the destination once more. Slower travel can save gas, but once this fleet leaves, its arrival time is fixed.",
			voss: "Six ships. Ash. Attack mission. Check the gas and arrival time. Confirm only when that is the order you mean to give.",
		},
		action: "Review in Fleet Command",
		app: "attack",
		note: "A critical confirmation needs numbers first. This portrait-heavy version is deliberately a candidate for removal.",
	},
	{
		id: "departed",
		title: "The fleet is away",
		phase: "First command",
		art: "dispatch",
		milestone: true,
		facts:
			"✓ Attack dispatched\nNacre 1:214:6 → Ash 1:214:8\nArrival: 19:05\nOutbound fleets can be recalled.\nYour colony keeps producing.",
		lines: {
			calder:
				"They're away. There's no need to watch the clock. Leave the crews to their work; the report will be here when you return.",
			voss: "Fleet away. Go do something else if you like. The ships keep moving, and Nacre keeps working.",
		},
		action: "Back to Command Center",
		note: "An admiral can grant permission to leave. This line must never turn into pressure to return at the arrival time.",
	},
	{
		id: "victory",
		title: "Your first battle report",
		phase: "First command",
		art: "victory",
		milestone: true,
		facts:
			"Victory · Ash 1:214:8\n6 Scout Fighters sent · 5 survived\nCargo: 💠 80 · 🔥 20\nSalvage at Ash: 💠 120 · 🔥 30\nSalvage needs a separate collection mission.",
		lines: {
			calder:
				"The survivors are coming home. Read what it cost as carefully as what it brought back. That's how the next order gets better.",
			voss: "Five made it homeward. Look at the losses before the cargo. Then we'll know what to change next time.",
		},
		action: "Read battle report",
		note: "Restrained pride fits a first success. The detailed report is text in Telegram; sample losses do not define combat balance.",
	},
	{
		id: "returned",
		title: "Your command begins",
		phase: "First command",
		art: "victory",
		milestone: true,
		facts:
			"✓ Fleet returned to Nacre · 1:214:6\n5 Scout Fighters stationed\n💠 80 · 🔥 20 delivered\nFirst command challenge complete\nReward already claimed",
		lines: {
			calder:
				"You've built, launched and brought a fleet back. I'll remain on the relay if you need advice. The orders from here are yours.",
			voss: "You can run the whole loop now. I'll be on the relay when you need me. You have the command.",
		},
		action: "Set my alert preferences",
		note: "A clear handover lets the advisor recede after onboarding. No repeated challenge reward can be claimed.",
	},
	{
		id: "incoming",
		title: "An unknown incoming fleet",
		phase: "Later situations",
		art: "incoming",
		milestone: false,
		facts:
			"⚠ Incoming fleet · Nacre 1:214:6\nSender: Mira · alliance member\nArrival: 20:40\nMission and ship composition unknown",
		lines: {
			calder:
				"Mira's name is on the signal. Her orders aren't. Inspect the movement before you decide what it means.",
			voss: "We know who's coming, not why. An alliance badge isn't a verified mission. Check the movement.",
		},
		action: "Inspect incoming fleet",
		app: "incoming",
		note: "The unknown mission must stay unknown. Test whether the portrait delays the warning or helps interpret it.",
	},
	{
		id: "loss",
		title: "After losing ships",
		phase: "Later situations",
		art: "loss",
		milestone: true,
		facts:
			"Defeat · Cairn 1:228:5\n6 Scout Fighters lost\nNo cargo taken\nYour colonies and research remain intact.",
		lines: {
			calder:
				"That was a hard report. Let's understand it before placing another order. You can rebuild when you're ready.",
			voss: "We lost those ships. Rushing another fleet out won't bring them back. Read the report; we'll make the next plan with better information.",
		},
		action: "Review losses",
		note: "A serious expression and useful recovery path can help. Praise, jokes, urgency and sales pressure would hurt here.",
	},
	{
		id: "return",
		title: "Back after eight hours",
		phase: "Later situations",
		art: "welcome",
		milestone: false,
		facts:
			"Activity Summary · Since your last action\n3 building upgrades completed\n6 ships finished at Nacre\n1 transport delivered\n💠 2 000 · 🔥 500",
		lines: {
			calder: "Welcome back. The crews kept things moving. Here's what changed while you were away.",
			voss: "You're back. The colony's been working. Here's the short version.",
		},
		action: "Open Command Center",
		note: "Compare a welcoming face with a factual summary. No absence guilt, no backlogged message flood.",
	},
	{
		id: "queue",
		title: "An ordinary paid queue",
		phase: "Later situations",
		art: "planning",
		milestone: false,
		facts:
			"Buildings · Nacre 1:214:6\n💠 12 400 · 🔥 6 100\n\nRUNNING · 2 / 2\nMineral Mine → 13 · 18 min\nAtmospheric Harvester → 9 · 32 min\n\nWAITING · already paid\nResearch Lab → 5",
		lines: {
			calder: "The next eligible job starts when a slot opens. You've already paid for the waiting work.",
			voss: "Two crews working, one job waiting. The queue can look after itself.",
		},
		action: "Manage paid work",
		note: "Likely a poor place for a repeated large portrait. This state makes the space and attention cost visible.",
	},
	{
		id: "preferences",
		title: "Choose when the game speaks",
		phase: "Later situations",
		art: "welcome",
		milestone: false,
		facts:
			"Alert Preferences\nRoutine completions: on\nCritical fleet alerts: on\nQuiet hours: 22:00–08:00\nCritical override: off\nReminders: off",
		lines: {
			calder: "Set the hours you want the relay to stay quiet. Your colonies can work without waking you.",
			voss: "Your time, your rules. Tell the relay when to stay quiet.",
		},
		action: "Save preferences",
		note: "Character presence should support the player's control. Reminders stay off unless explicitly enabled.",
	},
];

export const words = {
	game: "Space Emperors",
	appTitle: "First fleet · Space Emperors",
	appBadge: "Onboarding · sample state",
	admiral: "Admiral {name}",
	commandCenter: "Command Center",
	advisor: "Advisor",
	origin: "Nacre · 1:214:6",
	chooseAdmiral: "Choose your admiral",
	chooseAdmiralNote: "Follow the first colony through its first launch, then explore the full bot.",
	continueOnboarding: "Continue onboarding",
	miniApp: {
		incoming: "Incoming fleet",
		sent: "Fleet dispatched",
		review: "Review dispatch",
		prepare: "Prepare your first fleet",
		unknown: "⚠ Mission unverified",
		incomingRoute: "Mira · Beacon 1:219:3 → Nacre 1:214:6",
		incomingTime: "Arrival: 20:40",
		unknownCargo: "Ship composition and cargo unknown.",
		investigationNote:
			"Alliance membership does not establish a friendly mission. Investigation rules remain under design.",
		outbound: "✓ {count} Scout Fighters are outbound",
		route: "Nacre 1:214:6 → Ash 1:214:8",
		sector: "Sector",
		system: "System",
		orbit: "Orbit",
		targetCoordinates: "Target coordinates",
		coordinateNote: "First launch target: Ash · 1:214:8",
		coordinateError: "Use sector 1, system 214, orbit 8 for this first launch.",
		attackArrival: "Attack · Arrival {arrival}",
		reservedGas: "Travel gas reserved",
		sentNote: "Your colony keeps producing. You can return to Telegram while the fleet travels.",
		attackMission: "Attack mission",
		abandoned: "Abandoned world · home system",
		availableShips: "Scout Fighters · 6 available",
		speed: "Travel speed",
		slowerNote: "A slower arrival uses less gas. Departure is immediate when you confirm.",
		ships: "Ships",
		shipCount: "{count} Scout Fighters",
		travelTime: "Travel time",
		minutes: "{minutes} min",
		arrival: "Arrival",
		bothLegs: "Travel gas · both legs",
		departureNote: "Ships leave immediately. Their arrival time is fixed after dispatch.",
		edit: "Edit",
		dispatch: "Dispatch now",
		sampleNote: "Local wireframe · fixed 18:20 sample clock · illustrative balance.",
	},
};
