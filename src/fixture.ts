// Fixture format: one bot chat, written with Telegram Bot API field names so that bot code can emit
// fixtures from the same objects it sends. This file is also copied into Web A, so it has no imports.

export type Fixture = {
	bot: FixtureBot;
	user?: FixtureUser;
	messages: FixtureMessage[];
};

export type FixtureBot = {
	first_name: string;
	username?: string;
	/** Shown in the bot's profile. */
	description?: string;
	/** Fill the command menu next to the input field. */
	commands?: BotCommand[];
	/** Telegram peer color index (0-6) for the avatar placeholder. */
	color?: number;
};

export type FixtureUser = {
	first_name: string;
	last_name?: string;
};

export type FixtureMessage = {
	from: "bot" | "user";
	text?: string;
	entities?: MessageEntity[];
	/** Image path, relative to the fixture file. */
	photo?: string;
	caption?: string;
	caption_entities?: MessageEntity[];
	show_caption_above_media?: boolean;
	reply_markup?: InlineKeyboardMarkup | ReplyKeyboardMarkup;
};

export type BotCommand = {
	command: string;
	description: string;
};

export type MessageEntity = {
	type:
		| "mention"
		| "hashtag"
		| "cashtag"
		| "bot_command"
		| "url"
		| "email"
		| "phone_number"
		| "bold"
		| "italic"
		| "underline"
		| "strikethrough"
		| "spoiler"
		| "blockquote"
		| "expandable_blockquote"
		| "code"
		| "pre"
		| "text_link"
		| "custom_emoji";
	offset: number;
	length: number;
	url?: string;
	language?: string;
	custom_emoji_id?: string;
};

export type ButtonStyle = "primary" | "success" | "danger";

export type InlineKeyboardButton = {
	text: string;
	style?: ButtonStyle;
	icon_custom_emoji_id?: string;
	callback_data?: string;
	url?: string;
	web_app?: { url: string };
	login_url?: { url: string };
	switch_inline_query?: string;
	switch_inline_query_current_chat?: string;
	copy_text?: { text: string };
	callback_game?: Record<string, never>;
	pay?: boolean;
	disabled?: Record<string, never>;
};

export type KeyboardButton =
	| string
	| {
			text: string;
			style?: ButtonStyle;
			icon_custom_emoji_id?: string;
			request_contact?: boolean;
			request_location?: boolean;
			request_poll?: { type?: "quiz" | "regular" };
			web_app?: { url: string };
	  };

export type InlineKeyboardMarkup = {
	inline_keyboard: InlineKeyboardButton[][];
};

export type ReplyKeyboardMarkup = {
	keyboard: KeyboardButton[][];
	resize_keyboard?: boolean;
	one_time_keyboard?: boolean;
	is_persistent?: boolean;
	input_field_placeholder?: string;
};
