// Converts Bot API shaped fixture objects into the MTProto (TL) objects that Telegram's servers
// deliver to clients. Runs inside Web A's worker, next to the mock client.

import Api from "../../tl/api";
import type {
	ButtonStyle,
	InlineKeyboardButton,
	InlineKeyboardMarkup,
	KeyboardButton,
	MessageEntity,
	ReplyKeyboardMarkup,
} from "./fixture";

const encoder = new TextEncoder();

function buildStyle(style?: ButtonStyle, iconCustomEmojiId?: string) {
	if (!style && !iconCustomEmojiId) return undefined;

	return new Api.KeyboardButtonStyle({
		bgPrimary: style === "primary" || undefined,
		bgSuccess: style === "success" || undefined,
		bgDanger: style === "danger" || undefined,
		icon: iconCustomEmojiId ? BigInt(iconCustomEmojiId) : undefined,
	});
}

function buildInlineButtonType(button: InlineKeyboardButton): Api.TypeInlineButtonType {
	if (button.disabled) return new Api.InlineButtonTypeDisabled();
	if (button.url !== undefined) return new Api.InlineButtonTypeUrl({ url: button.url });
	if (button.web_app) return new Api.InlineButtonTypeWebView({ url: button.web_app.url });
	if (button.login_url) {
		return new Api.InlineButtonTypeUrlAuth({ url: button.login_url.url, buttonId: 0 });
	}
	if (button.copy_text) return new Api.InlineButtonTypeCopy({ copyText: button.copy_text.text });
	if (button.switch_inline_query !== undefined) {
		return new Api.InlineButtonTypeSwitchInline({ query: button.switch_inline_query });
	}
	if (button.switch_inline_query_current_chat !== undefined) {
		return new Api.InlineButtonTypeSwitchInline({
			samePeer: true,
			query: button.switch_inline_query_current_chat,
		});
	}
	if (button.callback_game) return new Api.InlineButtonTypeGame();
	if (button.pay) return new Api.InlineButtonTypeBuy();

	return new Api.InlineButtonTypeCallback({ data: encoder.encode(button.callback_data ?? "") });
}

function buildReplyButtonType(button: KeyboardButton): Api.TypeButtonType {
	if (typeof button === "string") return new Api.ButtonTypeDefault();
	if (button.request_contact) return new Api.ButtonTypeRequestPhone();
	if (button.request_location) return new Api.ButtonTypeRequestGeoLocation();
	if (button.request_poll) {
		return new Api.ButtonTypeRequestPoll({
			quiz: button.request_poll.type === undefined ? undefined : button.request_poll.type === "quiz",
		});
	}
	if (button.web_app) return new Api.ButtonTypeSimpleWebView({ url: button.web_app.url });

	return new Api.ButtonTypeDefault();
}

export function buildReplyMarkup(markup: InlineKeyboardMarkup | ReplyKeyboardMarkup) {
	if ("inline_keyboard" in markup) {
		return new Api.ReplyInlineMarkup({
			rows: markup.inline_keyboard.map(
				(row) =>
					new Api.KeyboardInlineButtonRow({
						buttons: row.map(
							(button) =>
								new Api.KeyboardInlineButton({
									text: button.text,
									style: buildStyle(button.style, button.icon_custom_emoji_id),
									type: buildInlineButtonType(button),
								}),
						),
					}),
			),
		});
	}

	return new Api.ReplyKeyboardMarkup({
		resize: markup.resize_keyboard || undefined,
		singleUse: markup.one_time_keyboard || undefined,
		persistent: markup.is_persistent || undefined,
		placeholder: markup.input_field_placeholder,
		rows: markup.keyboard.map(
			(row) =>
				new Api.KeyboardButtonRow({
					buttons: row.map((button) =>
						typeof button === "string"
							? new Api.KeyboardButton({ text: button, type: buildReplyButtonType(button) })
							: new Api.KeyboardButton({
									text: button.text,
									style: buildStyle(button.style, button.icon_custom_emoji_id),
									type: buildReplyButtonType(button),
								}),
					),
				}),
		),
	});
}

export function buildEntities(entities: MessageEntity[] = []): Api.TypeMessageEntity[] {
	return entities.map((entity) => {
		const { offset, length } = entity;

		switch (entity.type) {
			case "mention":
				return new Api.MessageEntityMention({ offset, length });
			case "hashtag":
				return new Api.MessageEntityHashtag({ offset, length });
			case "cashtag":
				return new Api.MessageEntityCashtag({ offset, length });
			case "bot_command":
				return new Api.MessageEntityBotCommand({ offset, length });
			case "url":
				return new Api.MessageEntityUrl({ offset, length });
			case "email":
				return new Api.MessageEntityEmail({ offset, length });
			case "phone_number":
				return new Api.MessageEntityPhone({ offset, length });
			case "bold":
				return new Api.MessageEntityBold({ offset, length });
			case "italic":
				return new Api.MessageEntityItalic({ offset, length });
			case "underline":
				return new Api.MessageEntityUnderline({ offset, length });
			case "strikethrough":
				return new Api.MessageEntityStrike({ offset, length });
			case "spoiler":
				return new Api.MessageEntitySpoiler({ offset, length });
			case "blockquote":
				return new Api.MessageEntityBlockquote({ offset, length });
			case "expandable_blockquote":
				return new Api.MessageEntityBlockquote({ offset, length, collapsed: true });
			case "code":
				return new Api.MessageEntityCode({ offset, length });
			case "pre":
				return new Api.MessageEntityPre({ offset, length, language: entity.language ?? "" });
			case "text_link":
				return new Api.MessageEntityTextUrl({ offset, length, url: entity.url ?? "" });
			case "custom_emoji":
				return new Api.MessageEntityCustomEmoji({
					offset,
					length,
					documentId: BigInt(entity.custom_emoji_id ?? "0"),
				});
			default:
				return new Api.MessageEntityUnknown({ offset, length });
		}
	});
}
