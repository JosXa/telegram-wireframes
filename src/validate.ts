// Checks fixtures before rendering, so authoring mistakes fail with a message instead of a timeout.
import { dirname, resolve } from "node:path";

import type { Fixture, MessageEntity } from "./fixture";

function checkEntities(where: string, text: string, entities: MessageEntity[] | undefined, errors: string[]) {
	for (const entity of entities ?? []) {
		if (entity.offset < 0 || entity.length <= 0 || entity.offset + entity.length > text.length) {
			errors.push(
				`${where}: ${entity.type} entity ${entity.offset}+${entity.length} is outside the text ` +
					`(${text.length} UTF-16 code units)`,
			);
		}
	}
}

export async function validateFixture(fixture: Fixture, path: string) {
	const errors: string[] = [];

	if (!fixture.bot?.first_name) errors.push("bot.first_name is required");
	if (!Array.isArray(fixture.messages) || fixture.messages.length === 0) {
		errors.push("messages must contain at least one message");
	}

	for (const [index, message] of (fixture.messages ?? []).entries()) {
		const where = `messages[${index}]`;
		if (message.from !== "bot" && message.from !== "user")
			errors.push(`${where}.from must be "bot" or "user"`);
		if (message.text === undefined && !message.photo) errors.push(`${where} needs text or photo`);
		if (message.text !== undefined && (message.photo || message.caption !== undefined)) {
			errors.push(`${where} mixes text with photo or caption`);
		}

		checkEntities(`${where}.entities`, message.text ?? "", message.entities, errors);
		checkEntities(`${where}.caption_entities`, message.caption ?? "", message.caption_entities, errors);

		if (message.photo && !(await Bun.file(resolve(dirname(path), message.photo)).exists())) {
			errors.push(`${where}.photo not found: ${message.photo}`);
		}

		const markup = message.reply_markup;
		if (markup && !("inline_keyboard" in markup) && !("keyboard" in markup)) {
			errors.push(`${where}.reply_markup needs inline_keyboard or keyboard`);
		}
		if (markup && "inline_keyboard" in markup && message.from === "user") {
			errors.push(`${where}: only bot messages carry inline keyboards`);
		}
	}

	if (errors.length) throw new Error(`${path}:\n  ${errors.join("\n  ")}`);
}
