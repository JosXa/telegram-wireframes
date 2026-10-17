import type { Fixture, InlineKeyboardButton } from "../../src/fixture";
import { type Admiral, admirals, type Beat, beats, words } from "./copy";
import feedbackData from "./feedback.json";

export { type Admiral, admirals, type Beat, beats, words };
export const styles = [
	{ id: "07c", name: "Painted animation · richer color" },
	{ id: "07", name: "Painted animation · original" },
	{ id: "01", name: "Soft painted realism" },
] as const;
export type Style = (typeof styles)[number]["id"];
export type Presence = "frequent" | "milestones" | "none" | "reviewed";
export type Decision = { vote: "use" | "maybe" | "skip"; note: string };
export const feedback = feedbackData as Record<string, Decision>;
export const format = (template: string, values: Record<string, string | number>) =>
	template.replace(/\{(\w+)\}/g, (_, key: string) => String(values[key]));

export function displayMode(beat: Beat, presence: Presence, experienced = false): "art" | "voice" | "plain" {
	if (presence === "none") return "plain";
	if (presence === "reviewed") {
		if (feedback[beat.id]?.vote === "skip" || (beat.id === "review" && experienced)) return "plain";
		return "art"; // Maybe remains visible for comparison until the user decides.
	}
	return presence === "milestones" && !beat.milestone ? "voice" : "art";
}
export function variantName(
	style: Style,
	admiral: Admiral,
	beat: Beat,
	presence: Presence,
	experienced = false,
) {
	const mode = displayMode(beat, presence, experienced);
	if (mode === "plain") return `plain-${beat.id}`;
	if (mode === "voice") return `voice-${admiral}-${beat.id}`;
	return `${style}-${admiral}-${beat.id}`;
}
export function makeFixture(
	style: Style,
	admiral: Admiral,
	beat: Beat,
	mode: "art" | "voice" | "plain",
): Fixture {
	const guide = admirals.find((person) => person.id === admiral);
	if (!guide) throw new Error("Unknown admiral");
	const dialogue = beat.id === "returned" || beat.id === "loss";
	const prose = dialogue
		? mode === "plain"
			? ""
			: `${format(words.admiral, { name: guide.name })}\n“${beat.lines[admiral]}”\n\n`
		: `${beat.lines[admiral]}\n\n`;
	const title = beat.id === "queue" ? "Building upgrades" : beat.title;
	const text = `${title}\n\n${prose}${beat.facts}`;
	const main: InlineKeyboardButton = beat.app
		? {
				text: beat.action,
				web_app: {
					url: `fleet.html?view=${beat.id === "review" ? "review" : beat.app}&style=${style}&admiral=${admiral}&mode=${mode}`,
				},
				style: "primary",
			}
		: { text: beat.action, callback_data: `onboarding:${beat.id}`, style: "primary" };
	return {
		bot: { first_name: words.game, username: "spaceemperorsbot", color: 5 },
		user: { first_name: "Joscha" },
		messages: [
			{
				from: "bot",
				...(mode === "art"
					? {
							photo: `art/${style}-${admiral}-${beat.art}.jpg`,
							caption: text,
							caption_entities: [{ type: "bold" as const, offset: 0, length: title.length }],
						}
					: { text, entities: [{ type: "bold" as const, offset: 0, length: title.length }] }),
				reply_markup: {
					inline_keyboard: [
						[main],
						[
							{ text: words.commandCenter, callback_data: "command-center" },
							{ text: words.advisor, callback_data: "advisor" },
						],
					],
				},
			},
		],
	};
}
