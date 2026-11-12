// Each Shipyard widget as a Telegram Web A chat. Web A shows the widget on a fixed clock and leaves
// its requests pending, so these chats show how a widget looks in the bubble; the lab runs the orders.
import type { Fixture } from "../../../src/fixture";
import { type Layout, layouts, widgetHtml } from "./build";
import { answer, caption, initialData } from "./data";

export const widgetNow = Date.UTC(2026, 10, 12, 9, 0);

/** `widget-<layout>` shows a new batch, `widget-<layout>-production` a batch 13 minutes in. */
export async function widgetFixture(name: string): Promise<Fixture | undefined> {
	const [, layout, production] = /^widget-(\w+?)(-production)?$/.exec(name) ?? [];
	if (!layouts.includes(layout as Layout)) return undefined;
	let data = initialData(widgetNow, layout === "mixes");
	if (production) data = answer(data, "b:0*12,1*4,3*2", widgetNow - 13 * 60_000).data;
	return {
		bot: { first_name: "Space Emperors", username: "space_emperors_bot", color: 5 },
		user: { first_name: "Joscha" },
		now: new Date(widgetNow).toISOString(),
		messages: [
			{
				from: "bot",
				widget: { html: await widgetHtml(layout as Layout), width: 320, chat_data: JSON.stringify(data) },
				caption: caption(data),
				reply_markup: { inline_keyboard: [[{ text: "⬅️ Command Center", callback_data: "center" }]] },
			},
		],
		answers: { center: { text: "This preview covers the Shipyard." } },
	};
}
