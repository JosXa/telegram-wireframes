// What each ship batch layout tries, and which states the gallery shows. Browser-safe data only.
export type VariantInfo = {
	id: string;
	name: string;
	between?: string;
	idea: string;
	strengths: string[];
	costs: string[];
	shots: { alias: string; label: string }[];
};

export const variants: VariantInfo[] = [
	{
		id: "A",
		name: "Paired buttons",
		idea: "Every ship type gets ➖ and ➕ on the draft itself. One shared step size sets how far a tap moves.",
		strengths: ["A whole batch without leaving the screen.", "Every count stays visible in one message."],
		costs: [
			"The tallest keyboard, and it grows with each ship type.",
			"No ship stats, and large amounts take many taps.",
		],
		shots: [{ alias: "batches-A-compose", label: "Draft with step ±10" }],
	},
	{
		id: "B",
		name: "One stepper",
		idea: "Pick a type, and one stepper sets its amount. The draft shows the selected type's stats.",
		strengths: ["The keyboard keeps its size as the catalog grows.", "Stats sit beside the amount."],
		costs: ["Switching types costs a tap each time.", "Stats are a text line, without the painting."],
		shots: [
			{ alias: "batches-B-compose", label: "Raiding ship selected" },
			{ alias: "batches-B-amount", label: "✏️ Type amount" },
		],
	},
	{
		id: "C",
		name: "Ship pages",
		idea: "The draft lists the types. Each type opens its painted page with stats and a stepper.",
		strengths: [
			"Reuses today's ship page and paintings, which teaches ship roles.",
			"The draft stays short.",
		],
		costs: ["Every type is a round trip to its page.", "Text and photo screens alternate."],
		shots: [
			{ alias: "batches-C-compose", label: "Draft" },
			{ alias: "batches-C-ship", label: "Raiding ship page" },
		],
	},
	{
		id: "D",
		name: "Written order",
		idea: "The player writes one reply, such as 12 starter, 4 raid, 2 line, and checks the draft.",
		strengths: ["The fastest path for experienced players.", "No keyboard to learn."],
		costs: [
			"Ship words must parse in English and German while the names are held.",
			"Typos turn into problems the bot must explain.",
		],
		shots: [
			{ alias: "batches-D-order", label: "Order prompt" },
			{ alias: "batches-D-reply", label: "Reply and draft" },
		],
	},
	{
		id: "E",
		name: "Compositions",
		idea: "Saved mixes such as Raid wing, built at a multiple. New batches use ship pages and can be saved.",
		strengths: ["Standard fleet compositions without unattended building.", "A repeat order takes two taps."],
		costs: ["Needs a glossary term, a naming flow and a way to remove mixes.", "More screens to maintain."],
		shots: [
			{ alias: "batches-E-home", label: "Shipyard with compositions" },
			{ alias: "batches-E-preset", label: "Raid wing × 3" },
			{ alias: "batches-E-compose", label: "Draft with 💾 Save" },
		],
	},
	{
		id: "F",
		name: "Painted selector",
		between: "Between B and C",
		idea: "B's one-screen stepper inside a photo message. The painting changes to the selected type.",
		strengths: ["Art and stats without page round trips.", "The keyboard keeps its size, like B."],
		costs: [
			"Painting, draft and keyboard together outgrow a phone screen.",
			"Each selection replaces the photo, and the caption limit of 1024 characters bounds the draft.",
		],
		shots: [
			{ alias: "batches-F-compose", label: "Raiding ship selected" },
			{ alias: "batches-F-line", label: "Line ship selected" },
		],
	},
	{
		id: "G",
		name: "Typed amounts",
		between: "Between C and D",
		idea: "Tap a type and reply with a number. No steppers, and no ship words to parse.",
		strengths: [
			"Exact amounts in one reply, and numbers read the same in every language.",
			"A small keyboard.",
		],
		costs: ["Every type costs a prompt and a reply in the chat.", "No painting on the way."],
		shots: [
			{ alias: "batches-G-compose", label: "Draft" },
			{ alias: "batches-G-amount", label: "Amount prompt" },
			{ alias: "batches-G-reply", label: "Reply and draft" },
		],
	},
];

export const shared: VariantInfo["shots"] = [
	{ alias: "batches-production", label: "Batch in production" },
	{ alias: "batches-add", label: "➕ Add ships" },
	{ alias: "batches-finished", label: "Finished batch" },
];
