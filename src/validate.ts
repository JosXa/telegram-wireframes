// Checks fixtures before rendering, so authoring mistakes fail with a message instead of a timeout.
import { dirname, resolve } from "node:path";
import { deflateSync } from "node:zlib";

import { type Fixture, type FixtureMessage, isWidgetHtmlPath, type MessageEntity } from "./fixture";

const WIDGET_HTML_MAX_BYTES = 32768;
const WIDGET_HTML_MAX_COMPRESSED_BYTES = 4096;
const WIDGET_DATA_MAX_BYTES = 1024;

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

async function checkWidget(where: string, message: FixtureMessage, path: string, errors: string[]) {
	const widget = message.widget;
	if (!widget) return;
	if (message.from !== "bot") errors.push(`${where}: only bot messages carry widgets`);
	if (message.text !== undefined || message.photo) errors.push(`${where} mixes widget with text or photo`);
	for (const side of ["width", "height"] as const) {
		const size = widget[side];
		if (size !== undefined && !(Number.isInteger(size) && size >= 0)) {
			errors.push(`${where}.widget.${side} must be a non-negative integer`);
		}
	}
	for (const field of ["chat_data", "public_data"] as const) {
		const data = widget[field];
		if (data === undefined) continue;
		if (typeof data !== "string") errors.push(`${where}.widget.${field} must be a string`);
		else if (Buffer.byteLength(data) > WIDGET_DATA_MAX_BYTES) {
			errors.push(`${where}.widget.${field} is over ${WIDGET_DATA_MAX_BYTES} bytes`);
		}
	}
	if (typeof widget.html !== "string" || !widget.html) {
		errors.push(`${where}.widget.html is required`);
		return;
	}
	let html = widget.html;
	if (isWidgetHtmlPath(html)) {
		const file = Bun.file(resolve(dirname(path), html));
		if (!(await file.exists())) {
			errors.push(`${where}.widget.html not found: ${html}`);
			return;
		}
		html = await file.text();
	}
	const bytes = Buffer.from(html);
	if (bytes.byteLength > WIDGET_HTML_MAX_BYTES) {
		errors.push(`${where}.widget.html is ${bytes.byteLength} bytes, over ${WIDGET_HTML_MAX_BYTES}`);
	}
	const compressed = deflateSync(bytes, { level: 9 }).byteLength;
	if (compressed > WIDGET_HTML_MAX_COMPRESSED_BYTES) {
		errors.push(
			`${where}.widget.html is ${compressed} bytes after zlib level 9, over ${WIDGET_HTML_MAX_COMPRESSED_BYTES}`,
		);
	}
}

export async function validateFixture(fixture: Fixture, path: string) {
	const errors: string[] = [];

	if (fixture.now !== undefined && Number.isNaN(Date.parse(fixture.now))) {
		errors.push("now must be an ISO 8601 date-time");
	}

	if (!fixture.bot?.first_name) errors.push("bot.first_name is required");
	if (!Array.isArray(fixture.messages) || fixture.messages.length === 0) {
		errors.push("messages must contain at least one message");
	}

	for (const [index, message] of (fixture.messages ?? []).entries()) {
		const where = `messages[${index}]`;
		if (message.from !== "bot" && message.from !== "user")
			errors.push(`${where}.from must be "bot" or "user"`);
		if (message.text === undefined && !message.photo && !message.widget) {
			errors.push(`${where} needs text, photo or widget`);
		}
		if (message.text !== undefined && (message.photo || message.caption !== undefined)) {
			errors.push(`${where} mixes text with photo or caption`);
		}

		checkEntities(`${where}.entities`, message.text ?? "", message.entities, errors);
		checkEntities(`${where}.caption_entities`, message.caption ?? "", message.caption_entities, errors);

		if (message.photo && !(await Bun.file(resolve(dirname(path), message.photo)).exists())) {
			errors.push(`${where}.photo not found: ${message.photo}`);
		}

		await checkWidget(where, message, path, errors);

		const markup = message.reply_markup;
		if (markup && !("inline_keyboard" in markup) && !("keyboard" in markup)) {
			errors.push(`${where}.reply_markup needs inline_keyboard or keyboard`);
		}
		if (markup && "inline_keyboard" in markup && message.from === "user") {
			errors.push(`${where}: only bot messages carry inline keyboards`);
		}
	}

	if (errors.length) throw new Error(`${path}:\n  ${errors.join("\n  ")}`);
	if (fixture.mini_app) {
		const hasButton = fixture.messages.some((message) => {
			const markup = message.reply_markup;
			return (
				markup &&
				"inline_keyboard" in markup &&
				markup.inline_keyboard
					.flat()
					.some((button) => button.text === fixture.mini_app?.button_text && button.web_app)
			);
		});
		if (!hasButton) throw new Error(`${path}: mini_app.button_text must match an inline web_app button`);
	}
}
