// Loads a fixture from the telegram-wireframes server and turns it into Web A mock client data:
// one private chat between the current user and the bot. Also answers the requests Web A needs
// to boot that the stock mock client leaves unanswered.

import Api from "../../tl/api";
import type TelegramClient from "../MockClient";
import createMockedMessage from "../mockUtils/createMockedMessage";
import createMockedUser from "../mockUtils/createMockedUser";
import type { MockDocument, MockMessage, MockTypes } from "../mockUtils/MockTypes";
import { buildEntities, buildReplyMarkup } from "./convert";
import type { Fixture, FixtureMessage } from "./fixture";
import { buildLangPack } from "./langpack";

export const WIREFRAME_SCENARIO_PREFIX = "wireframe:";

const SELF_ID = "1";
const BOT_ID = "100";
const DEFAULT_BOT_COLOR = 4;
const MESSAGE_INTERVAL_SECONDS = 60;

// Telegram's seven standard peer colors (light, dark). Web A takes avatar and name colors from the
// server, so without these every placeholder avatar falls back to the text color.
const PEER_COLORS: [number, number][] = [
	[0xcc5049, 0xff8e86],
	[0xd67722, 0xffa357],
	[0x955cdb, 0xb18fff],
	[0x40a920, 0xa0de7e],
	[0x309eba, 0x4fd7ff],
	[0x368ad1, 0x78c1ff],
	[0xc7508b, 0xff7fd5],
];

type WireframeConfig = { debug?: boolean };

export type WireframeMiddleware = (
	client: TelegramClient,
	request: Api.Request<unknown, unknown>,
) => Promise<unknown>;

async function fetchJson<T>(url: string): Promise<T> {
	const response = await fetch(url);
	if (!response.ok) throw new Error(`[wireframes] ${url}: HTTP ${response.status}`);
	return (await response.json()) as T;
}

async function loadPhoto(url: string, id: number) {
	const response = await fetch(url);
	if (!response.ok) throw new Error(`[wireframes] ${url}: HTTP ${response.status}`);

	const blob = await response.blob();
	const bitmap = await createImageBitmap(blob);
	const bytes = new Uint8Array(await blob.arrayBuffer());
	const document = {
		id,
		url,
		mimeType: blob.type || "image/jpeg",
		size: BigInt(bytes.byteLength),
		bytes,
		w: bitmap.width,
		h: bitmap.height,
	};
	bitmap.close();

	return document as unknown as MockDocument;
}

async function buildMessage(
	message: FixtureMessage,
	id: number,
	date: number,
	fixtureRoot: string,
	documents: MockDocument[],
): Promise<MockMessage> {
	const result: MockMessage = {
		id,
		date,
		out: message.from === "user" || undefined,
		message: message.text ?? message.caption ?? "",
		entities: buildEntities(message.text === undefined ? message.caption_entities : message.entities),
		replyMarkup: message.reply_markup ? buildReplyMarkup(message.reply_markup) : undefined,
		invertMedia: message.show_caption_above_media || undefined,
	};

	if (message.photo) {
		documents.push(await loadPhoto(`${fixtureRoot}/files/${encodeURI(message.photo)}`, id));
		result.media = { type: "photo", id } as MockMessage["media"];
	}

	return result;
}

function buildFullUser(request: Api.users.GetFullUser, fixture: Fixture, client: TelegramClient) {
	const isBot = request.id instanceof Api.InputUser && String(request.id.userId) === BOT_ID;
	const userId = isBot ? BOT_ID : SELF_ID;

	return new Api.users.UserFull({
		fullUser: new Api.UserFull({
			id: BigInt(userId),
			about: isBot ? fixture.bot.description : undefined,
			settings: new Api.PeerSettings({}),
			notifySettings: new Api.PeerNotifySettings({}),
			commonChatsCount: 0,
			botInfo: isBot
				? new Api.BotInfo({
						userId: BigInt(BOT_ID),
						description: fixture.bot.description,
						commands: fixture.bot.commands?.map((command) => new Api.BotCommand(command)),
						menuButton: fixture.bot.commands?.length ? new Api.BotMenuButtonCommands() : undefined,
					})
				: undefined,
		}),
		chats: [],
		users: [createMockedUser(userId, client.mockData)],
	});
}

function createMiddleware(
	fixture: Fixture,
	config: WireframeConfig,
	fixtureRoot: string,
): WireframeMiddleware {
	// Requests handed back to the stock mock logic in debug mode. Tracked per request, because
	// requests run concurrently.
	const forwarded = new WeakSet<object>();
	let messageId = fixture.messages.length;
	let pts = 1;

	async function navigate(client: TelegramClient, target: string, sent?: string) {
		const root = `${self.location.origin}/__wireframes__/fixtures/${encodeURIComponent(target)}`;
		const next = await fetchJson<Fixture>(`${root}/fixture.json`);
		const date = Math.floor(Date.now() / 1000);
		const documents: MockDocument[] = [];
		const source: FixtureMessage[] = sent ? [{ from: "user", text: sent }, ...next.messages] : next.messages;
		const messages = await Promise.all(
			source.map((message) => buildMessage(message, ++messageId, date, root, documents)),
		);
		const previous = client.mockData.messages[BOT_ID];
		const edit = previous.length === 1 && messages.length === 1 && !previous[0].out && !messages[0].out;
		// Edit a single bot screen in place; conversation examples replace the complete sample.
		// Media retain their newly allocated IDs so Telegram cannot reuse a previous scene's photo.
		if (edit) messages[0].id = previous[0].id;
		client.mockData.messages[BOT_ID] = messages;
		client.mockData.documents.push(...documents);
		client.mockData.dialogs.active[0].topMessage = messages[messages.length - 1].id;
		fixture = next;
		fixtureRoot = root;
		if (edit)
			return [
				new Api.UpdateEditMessage({
					message: createMockedMessage(BOT_ID, messages[0].id, client.mockData),
					pts: ++pts,
					ptsCount: 1,
				}),
			];
		pts += previous.length;
		return [
			new Api.UpdateDeleteMessages({
				messages: previous.map((message) => message.id),
				pts,
				ptsCount: previous.length,
			}),
			...messages.map(
				(message) =>
					new Api.UpdateNewMessage({
						message: createMockedMessage(BOT_ID, message.id, client.mockData),
						pts: ++pts,
						ptsCount: 1,
					}),
			),
		];
	}

	return async (client, request) => {
		if (forwarded.has(request)) return "pass";
		if (request instanceof Api.messages.GetBotCallbackAnswer && fixture.navigation) {
			const target = fixture.navigation[new TextDecoder().decode(request.data)];
			if (!target)
				return new Api.messages.BotCallbackAnswer({
					cacheTime: 0,
					message: "This action is a sample preview.",
				});
			for (const update of await navigate(client, target)) client.fireUpdate(update);
			return new Api.messages.BotCallbackAnswer({ cacheTime: 0 });
		}
		if (request instanceof Api.messages.SendMessage && fixture.navigation) {
			const target = fixture.navigation[request.message.trim()];
			if (target) {
				const updates = await navigate(client, target, request.message);
				return new Api.Updates({
					updates: [
						new Api.UpdateMessageID({
							id: client.mockData.messages[BOT_ID][0].id,
							randomId: request.randomId,
						}),
						...updates,
					],
					users: [],
					chats: [],
					date: Math.floor(Date.now() / 1000),
					seq: ++pts,
				});
			}
		}

		if (
			request instanceof Api.messages.RequestWebView ||
			request instanceof Api.messages.RequestSimpleWebView
		) {
			if (!request.url) throw new Error("[wireframes] Mini App buttons need a web_app.url");
			// Local pages stay next to the fixture. Absolute URLs can point at a separate app dev server.
			const url = new URL(request.url, `${fixtureRoot}/files/`);
			const params = new URLSearchParams(url.hash.slice(1));
			params.set("tgWebAppVersion", "9.0");
			params.set("tgWebAppPlatform", request.platform);
			params.set("tgWebAppThemeParams", request.themeParams?.data ?? "{}");
			// This is a wireframe, not authenticated initData. Real app APIs must mock authentication.
			params.set("tgWebAppData", "");
			if (request.startParam) params.set("tgWebAppStartParam", request.startParam);
			url.hash = params.toString();
			return new Api.WebViewResultUrl({ url: url.href, queryId: BigInt(1) });
		}
		if (request instanceof Api.messages.ProlongWebView) return true;

		if (request instanceof Api.users.GetFullUser) return buildFullUser(request, fixture, client);
		if (request instanceof Api.langpack.GetLangPack) return buildLangPack(request.langCode);
		if (request instanceof Api.help.GetPeerColors) {
			return new Api.help.PeerColors({
				hash: 1,
				colors: PEER_COLORS.map(
					([light, dark], colorId) =>
						new Api.help.PeerColorOption({
							colorId,
							colors: new Api.help.PeerColorSet({ colors: [light] }),
							darkColors: new Api.help.PeerColorSet({ colors: [dark] }),
						}),
				),
			});
		}
		if (request instanceof Api.updates.GetState) {
			return new Api.updates.State({
				pts: 1,
				qts: 1,
				seq: 1,
				date: Math.floor(Date.now() / 1000),
				unreadCount: 0,
			});
		}
		if (request instanceof Api.messages.GetDialogFilters) {
			return new Api.messages.DialogFilters({ filters: [new Api.DialogFilterDefault()] });
		}
		if (request instanceof Api.updates.GetDifference) {
			return new Api.updates.DifferenceEmpty({ date: Math.floor(Date.now() / 1000), seq: 1 });
		}

		if (!config.debug) return "pass";

		// Debug mode: run the stock mock logic and report requests that nothing answers. After a Web A
		// update, a hang during boot usually traces back to one of these.
		forwarded.add(request);
		const result = await client.invoke(request);
		if (result === undefined) console.warn("[wireframes] unanswered request", request.className);
		return result;
	};
}

export async function loadWireframe(name: string) {
	const origin = self.location.origin;
	const fixtureRoot = `${origin}/__wireframes__/fixtures/${encodeURIComponent(name)}`;
	const [fixture, config] = await Promise.all([
		fetchJson<Fixture>(`${fixtureRoot}/fixture.json`),
		fetchJson<WireframeConfig>(`${origin}/__wireframes__/config.json`),
	]);

	const documents: MockDocument[] = [];
	const now = Math.floor(Date.now() / 1000);
	const count = fixture.messages.length;
	const messages = await Promise.all(
		fixture.messages.map((message, index) =>
			buildMessage(
				message,
				index + 1,
				now - (count - index) * MESSAGE_INTERVAL_SECONDS,
				fixtureRoot,
				documents,
			),
		),
	);

	const mockData: MockTypes = {
		// MockUser intersects a string id with Api.User's bigint id, so the literal needs a cast.
		users: [
			{
				id: SELF_ID,
				self: true,
				firstName: fixture.user?.first_name ?? "You",
				lastName: fixture.user?.last_name ?? "",
			},
			{
				id: BOT_ID,
				bot: true,
				botInfoVersion: 1,
				firstName: fixture.bot.first_name,
				lastName: "",
				username: fixture.bot.username,
				color: new Api.PeerColor({ color: fixture.bot.color ?? DEFAULT_BOT_COLOR }),
			},
		] as unknown as MockTypes["users"],
		chats: [],
		channels: [],
		dialogs: {
			active: [
				{
					id: BOT_ID,
					topMessage: count,
					readInboxMaxId: count,
					readOutboxMaxId: count,
				},
			],
			archived: [],
		},
		messages: { [BOT_ID]: messages },
		availableReactions: [],
		documents,
		dialogFilters: [],
		topPeers: [],
	};

	return { mockData, invokeMiddleware: createMiddleware(fixture, config, fixtureRoot) };
}
