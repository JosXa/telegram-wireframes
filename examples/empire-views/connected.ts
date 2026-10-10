import { admirals, beats, displayMode, makeFixture, variantName, words } from "../admiral-onboarding/journey";
import { journeys as originalJourneys, scenes as originalScenes, type Scene, views } from "./catalogue";

export { views } from "./catalogue";

const button = (text: string, target: string) => ({ text, callback_data: target });
const sceneById = new Map(originalScenes.map((scene) => [scene.id, scene]));
const entries = views.map((view) => originalScenes.find((scene) => scene.view === view) as Scene);
const menu: Scene = {
	...originalScenes[0],
	id: "menu",
	title: "All bot views",
	note: "Connected local prototype. Choose a view, follow its native Telegram buttons, and close a Mini App to return to chat.",
	related: entries.map((scene) => scene.id),
	fixture: {
		bot: originalScenes[0].fixture.bot,
		user: originalScenes[0].fixture.user,
		messages: [
			{
				from: "bot",
				text: "🧭 Space Emperors\nAll bot views · connected wireframe\n\nChoose a view to explore. Actions open sample states; prices and timers are illustrative.",
				reply_markup: {
					inline_keyboard: [
						[button("Start onboarding", "choose-admiral")],
						...Array.from({ length: Math.ceil(entries.length / 2) }, (_, index) =>
							entries.slice(index * 2, index * 2 + 2).map((scene) => button(scene.view, scene.id)),
						),
					],
				},
			},
		],
	},
};
const choose: Scene = {
	...(originalScenes.find((scene) => scene.id === "advisor") as Scene),
	id: "choose-admiral",
	title: "Choose your admiral",
	note: "Both guides use the richer painted-animation refinement and the imported scene ratings.",
	related: admirals.map((person) => `journey-${person.id}-welcome`),
	fixture: {
		bot: menu.fixture.bot,
		user: menu.fixture.user,
		messages: [
			{
				from: "bot",
				text: `${words.chooseAdmiral}\n${words.chooseAdmiralNote}`,
				reply_markup: {
					inline_keyboard: admirals.map((person) => [button(person.name, `journey-${person.id}-welcome`)]),
				},
			},
		],
	},
};

const onboarding: Scene[] = [];
for (const person of admirals) {
	for (const [index, beat] of beats.slice(0, 12).entries()) {
		const id = variantName("07c", person.id, beat, "reviewed");
		// Shared factual screens retain the guide chosen at the start of this journey.
		const name = `journey-${person.id}-${beat.id}`;
		const fixture = makeFixture("07c", person.id, beat, displayMode(beat, "reviewed"));
		const message = fixture.messages[0];
		const rows =
			message.reply_markup && "inline_keyboard" in message.reply_markup
				? message.reply_markup.inline_keyboard
				: [];
		const next = index < 11 ? `journey-${person.id}-${beats[index + 1].id}` : "preferences";
		const action = beat.id === "departed" ? "command-center" : beat.id === "victory" ? "battle-report" : next;
		for (const row of rows)
			for (const item of row) {
				if (item.callback_data === `onboarding:${beat.id}`) item.callback_data = action;
				if (item.callback_data === "advisor") item.callback_data = `journey-${person.id}-welcome`;
			}
		// Mini App actions open the existing interactive fleet view; the storyboard can continue afterward.
		if (beat.app || action !== next) rows.push([button(words.continueOnboarding, next)]);
		if (beat.id === "review")
			fixture.mini_app = { button_text: beat.action, ready_selector: "[data-ready='true']" };
		onboarding.push({
			id: name,
			view: "Advisor",
			title: `${person.name.split(" ")[1]} · ${beat.title}`,
			group: "Getting started",
			surface: beat.id === "review" ? "Mini App" : "Chat",
			status: "Proposal",
			source: "telegram-interface.md",
			note: `${beat.note} Character presence follows your imported ratings.`,
			related: [next, "menu"],
			fixture,
			assets: "admirals",
			preview: id,
		});
	}
}

export const scenes: Scene[] = [menu, choose, ...originalScenes, ...onboarding].map((source) => {
	const scene = structuredClone(source);
	const message = scene.fixture.messages.findLast((message) => message.from === "bot");
	if (!message) throw new Error(`No bot screen: ${scene.id}`);
	const rows =
		message.reply_markup && "inline_keyboard" in message.reply_markup
			? message.reply_markup.inline_keyboard
			: [];
	const existing = new Set(rows.flat().map((item) => item.callback_data));
	if (scene.id !== "menu") {
		rows.push([
			button("All views", "menu"),
			...(scene.id === "command-center" || existing.has("command-center")
				? []
				: [button("Command Center", "command-center")]),
		]);
		existing.add("menu");
		existing.add("command-center");
	}
	const related = scene.related
		.filter((id) => !existing.has(id))
		.map((id) => button(sceneById.get(id)?.title || (id === "menu" ? "All views" : "Next scene"), id));
	if (related.length && !scene.assets && scene.id !== "menu" && scene.id !== "choose-admiral")
		rows.push(...related.map((item) => [item]));
	message.reply_markup = { inline_keyboard: rows };
	scene.fixture.navigation = Object.fromEntries(
		scene.fixture.messages.flatMap((message) =>
			message.reply_markup && "inline_keyboard" in message.reply_markup
				? message.reply_markup.inline_keyboard
						.flat()
						.filter((item) => item.callback_data)
						.map((item) => [item.callback_data as string, item.callback_data as string])
				: [],
		),
	);
	Object.assign(scene.fixture.navigation, {
		"/start": "choose-admiral",
		"/menu": "menu",
		"/colony": "command-center",
		"/empire": "empire",
		"/advisor": "choose-admiral",
	});
	return scene;
});

export const journeys = [
	...admirals.map((person) => ({
		title: `First launch · ${person.name.split(" ")[1]}`,
		ids: [
			...beats.slice(0, 12).map((beat) => `journey-${person.id}-${beat.id}`),
			"preferences",
			"command-center",
			"menu",
		],
	})),
	...originalJourneys,
];
