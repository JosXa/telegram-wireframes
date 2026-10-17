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
		facts: "Nacre · 🌐 1:214:6 · Your home planet\nStarter protection: 5 days",
		lines: {
			calder:
				"Nacre is your home planet for this season. Every few months the Tide brings a new galaxy within reach, and anyone with a planet and a fleet calls themselves an emperor. Your throne is a folding chair for now.",
			voss: "Nacre is your home planet for this season. Every few months the Tide brings a new galaxy within reach, and anyone with a planet and a fleet calls themselves an emperor. Your throne is a folding chair for now.",
		},
		action: "Choose nickname",
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
			calder: "Choose the nickname other players will see.",
			voss: "Choose the nickname other players will see.",
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
			"Command Center · Nacre 🌐 1:214:6\n🏝 Tropical · Home planet\n💠 500 · 🔥 250\nMineral Mine · Level 1\nBuildings: 0 / 2 running",
		lines: {
			calder: "Nacre's Mineral Mine is working. Your first Challenge is to upgrade it.",
			voss: "Nacre's Mineral Mine is working. Your first Challenge is to upgrade it.",
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
			"Mineral Mine · 1 → 2\nNacre · 🌐 1:214:6\nCost: 💠 50 · 🔥 0\nDuration: 3 seconds\nChallenge reward: 💠 150 · 🔥 50",
		lines: {
			calder: "Upgrade your Mineral Mine to level 2.",
			voss: "Upgrade your Mineral Mine to level 2.",
		},
		action: "Queue upgrade",
		note: "The three-second upgrade edits the active screen. It does not create a separate unsolicited completion message.",
	},
	{
		id: "mine-ready",
		title: "Work completes",
		phase: "First command",
		art: "construction",
		milestone: false,
		facts: "✓ Mineral Mine reached level 2\nNacre · 🌐 1:214:6\nChallenge reward delivered: 💠 150 · 🔥 50",
		lines: {
			calder: "Your mine upgrade is complete. Next, build an Orbital Shipyard.",
			voss: "Your mine upgrade is complete. Next, build an Orbital Shipyard.",
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
		facts: "Orbital Shipyard · Level 1\nCost: 💠 300 · 🔥 100\nDuration: 4 min",
		lines: {
			calder: "Build an Orbital Shipyard to start building ships at Nacre.",
			voss: "Build an Orbital Shipyard to start building ships at Nacre.",
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
				"Your first four Scout Fighters are ready. The hangar's ceremonial ribbon is being reused for the other two.",
			voss: "Your first four Scout Fighters are ready. The hangar's ceremonial ribbon is being reused for the other two.",
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
		facts: "Ash · 🌐 1:214:8 · Abandoned world\nYour home system\nScout Fighters ready: 6",
		lines: {
			calder: "Ash is abandoned, and its defense ships remain in orbit. Prepare your first attack.",
			voss: "Ash is abandoned, and its defense ships remain in orbit. Prepare your first attack.",
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
			"Attack · Nacre 🌐 1:214:6 → Ash 🌐 1:214:8\nScout Fighter × 6\nTravel time: 45 min\nArrival: 19:05\nTravel gas: 🔥 80",
		lines: {
			calder: "Your six Scout Fighters are ready to attack Ash. Check the fleet before you send it.",
			voss: "Your six Scout Fighters are ready to attack Ash. Check the fleet before you send it.",
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
		facts: "✓ Attack dispatched\nNacre 🌐 1:214:6 → Ash 🌐 1:214:8\nArrival: 19:05",
		lines: {
			calder:
				"Six Scout Fighters are heading for Ash, and Nacre keeps producing. The send-off band is already packing up.",
			voss: "Six Scout Fighters are heading for Ash, and Nacre keeps producing. The send-off band is already packing up.",
		},
		action: "⬅️ Command Center",
		note: "An admiral can grant permission to leave. This line must never turn into pressure to return at the arrival time.",
	},
	{
		id: "victory",
		title: "Your first battle report",
		phase: "First command",
		art: "victory",
		milestone: true,
		facts:
			"Victory · Ash 🌐 1:214:8\n⚔️ You · 6 Scout Fighters sent · 5 survived\n🛡️ Ash · Abandoned world\nReturning loot: 💠 80 · 🔥 20\nSalvage at Ash: 💠 120 · 🔥 30",
		lines: {
			calder:
				"You won at Ash, and five Scout Fighters are returning. The victory speech is longer than the battle report.",
			voss: "You won at Ash, and five Scout Fighters are returning. The victory speech is longer than the battle report.",
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
			"✓ Fleet returned to Nacre · 🌐 1:214:6\n5 Scout Fighters stationed\n💠 80 · 🔥 20 delivered\nFirst command Challenge complete\nReward delivered",
		lines: {
			calder:
				"All five surviving Scout Fighters are home. I'll be in the Advisor when you want a second opinion.",
			voss: "The surviving ships are home. I'll be in the Advisor when you want to talk through an attack.",
		},
		action: "Set notifications",
		note: "A clear handover lets the advisor recede after onboarding. No repeated challenge reward can be claimed.",
	},
	{
		id: "incoming",
		title: "An unknown incoming fleet",
		phase: "Later situations",
		art: "incoming",
		milestone: false,
		facts:
			"⚠ Incoming fleet · Nacre 🌐 1:214:6\nSender: Mira · alliance member\nArrival: 20:40\nMission and ship composition unknown",
		lines: {
			calder:
				"Mira's fleet is approaching Nacre, and its mission is unknown. The welcome committee has left the banner rolled up.",
			voss: "Mira's fleet is approaching Nacre, and its mission is unknown. The welcome committee has left the banner rolled up.",
		},
		action: "Spy on fleet",
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
			"Defeat · Cairn 🌐 1:228:5\n⚔️ You · 6 Scout Fighters lost\n🛡️ Cairn · Defenders held\nReturning loot: 💠 0 · 🔥 0",
		lines: {
			calder: "We lost the fleet at Cairn. Let's read the losses before we plan another attack.",
			voss: "We lost the fleet at Cairn. Read the report with me before we send more crews.",
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
			"Activity Summary · Since your last order\n3 building upgrades completed\n6 ships finished at Nacre\n1 transport delivered\n💠 2 000 · 🔥 500",
		lines: {
			calder: "Three upgrades are complete and six ships are ready. A transport has delivered its cargo.",
			voss: "Three upgrades are complete and six ships are ready. A transport has delivered its cargo.",
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
			"Buildings · Nacre 🌐 1:214:6\n💠 12 400 · 🔥 6 100\n\nRunning · 2 / 2\nMineral Mine → 13 · 18 min\nAtmospheric Harvester → 9 · 32 min\n\nWaiting\nResearch Lab → 5",
		lines: {
			calder: "Two upgrades are running at Nacre, and the Research Lab upgrade is waiting.",
			voss: "Two upgrades are running at Nacre, and the Research Lab upgrade is waiting.",
		},
		action: "Manage upgrades",
		note: "Likely a poor place for a repeated large portrait. This state makes the space and attention cost visible.",
	},
	{
		id: "preferences",
		title: "Choose when the game speaks",
		phase: "Later situations",
		art: "welcome",
		milestone: false,
		facts:
			"Notifications\nRoutine completions: on\nCritical fleet notifications: on\nQuiet hours: 22:00–08:00\nCritical override: off\nReminders: off",
		lines: {
			calder: "Choose which notifications you receive and when they stay quiet.",
			voss: "Choose which notifications you receive and when they stay quiet.",
		},
		action: "Save preferences",
		note: "Character presence should support the player's control. Reminders stay off unless explicitly enabled.",
	},
];

export const words = {
	game: "Space Emperors",
	appTitle: "First fleet · Space Emperors",
	appBadge: "Nacre · 🌐 1:214:6",
	admiral: "Admiral {name}",
	commandCenter: "Command Center",
	advisor: "Advisor",
	origin: "Nacre · 🌐 1:214:6",
	chooseAdmiral: "Choose your admiral",
	chooseAdmiralNote: "Choose who you turn to for advice as you build your first fleet.",
	continueOnboarding: "Continue",
	miniApp: {
		incoming: "Incoming fleet",
		sent: "Fleet dispatched",
		review: "Review dispatch",
		prepare: "Prepare your first fleet",
		unknown: "⚠ Mission unknown",
		incomingRoute: "Mira · Beacon 🌐 1:219:3 → Nacre 🌐 1:214:6",
		incomingTime: "Arrival: 20:40",
		unknownCargo: "Its ships and cargo are unknown.",
		investigationNote: "A fleet from Mira is approaching. Her orders aren't on the welcome card.",
		outbound: "✓ {count} Scout Fighters are outbound",
		route: "Nacre 🌐 1:214:6 → Ash 🌐 1:214:8",
		sector: "Sector",
		system: "System",
		orbit: "Orbit",
		targetCoordinates: "Target coordinates",
		coordinateNote: "First launch target: Ash · 🌐 1:214:8",
		coordinateError: "Use sector 1, system 214, orbit 8 for this first launch.",
		attackArrival: "Attack · Arrival {arrival}",
		reservedGas: "Travel gas",
		sentNote:
			"Your ships are heading for Ash, and Nacre keeps producing. The send-off band is already packing up.",
		attackMission: "Attack mission",
		abandoned: "Abandoned world · home system",
		availableShips: "Scout Fighters · 6 available",
		speed: "Travel speed",
		slowerNote: "Travel gas and arrival",
		ships: "Ships",
		shipCount: "{count} Scout Fighters",
		travelTime: "Travel time",
		minutes: "{minutes} min",
		arrival: "Arrival",
		bothLegs: "Gas for outward and return",
		departureNote: "The fleet is ready to leave.",
		edit: "Edit fleet",
		dispatch: "Send fleet",
		sampleNote: "",
	},
};
