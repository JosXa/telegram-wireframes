// Widget lab: each Shipyard widget runs in a chat bubble with a mock bot behind it. The bot answers
// order requests, edits the widget's chat_data, finishes batches on the lab clock and posts the
// notification, the way the real bot would through answerWidgetQuery and editMessageWidgetData.
import { answer, caption, finishedText, initialData, type ShipyardData, settle } from "./widgets/data";

type Layout = "rows" | "tabs" | "timeline" | "mixes";
type Info = { layout: Layout; name: string; idea: string; works: string[]; costs: string[] };

const layouts: Info[] = [
	{
		layout: "rows",
		name: "Slider rows",
		idea: "A with sliders: every ship type has a row, a drag sets any amount and the hatched end of each track shows where the stock runs out.",
		works: [
			"The whole batch is visible and editable at once.",
			"A drag covers big amounts, − and + the last few ships.",
		],
		costs: ["Grows by one row per ship type.", "Shows no ship stats."],
	},
	{
		layout: "tabs",
		name: "Ship tabs",
		idea: "B and F in one bubble: a tab per type shows its amount, and the selected type shows its stats, a slider, steps and Max.",
		works: ["Stats sit beside the amount they affect.", "Keeps the same height whatever the catalog holds."],
		costs: ["Edits one type at a time.", "The draft shows only as amounts on the tabs."],
	},
	{
		layout: "timeline",
		name: "Build order",
		idea: "New: the batch as a timeline. Lines are as wide as their build time, list when their last ship is ready, and can move earlier or later.",
		works: [
			"Shows which ships arrive first, so a player can time a batch around an attack.",
			"Reordering makes the composed build order a deliberate choice.",
		],
		costs: ["The busiest layout, close to the size limit.", "Reordering adds a rule the yard must honor."],
	},
	{
		layout: "mixes",
		name: "Mixes",
		idea: "E in a bubble: the last batch and saved mixes, built in multiples. Saving needs a typed name, so the button under the message asks for it in a reply.",
		works: ["A routine batch takes two taps.", "Multiples scale a proven composition with the stock."],
		costs: ["Needs a settled term for saved mixes.", "Editing lines happens elsewhere."],
	},
];

const palettes = {
	light: {
		"bg-color": "#ffffff",
		"text-color": "#000000",
		"hint-color": "#707579",
		"link-color": "#3390ec",
		"button-color": "#3390ec",
		"button-text-color": "#ffffff",
		"secondary-bg-color": "#f1f1f4",
		"accent-text-color": "#3390ec",
		"subtitle-text-color": "#707579",
		"destructive-text-color": "#e53935",
		"section-separator-color": "#e7e7e7",
	},
	dark: {
		"bg-color": "#212121",
		"text-color": "#ffffff",
		"hint-color": "#aaaaaa",
		"link-color": "#8774e1",
		"button-color": "#8774e1",
		"button-text-color": "#ffffff",
		"secondary-bg-color": "#181818",
		"accent-text-color": "#8774e1",
		"subtitle-text-color": "#aaaaaa",
		"destructive-text-color": "#ff595a",
		"section-separator-color": "#100f10",
	},
};
type Theme = keyof typeof palettes;

// The lab's stand-in for Telegram's widget runtime: a shifted clock, chat_data and requests that
// travel to the mock bot in the page.
const shim = (data: string, offset: number) =>
	`(()=>{let off=${offset},seq=0;const pend={},hs={},RD=Date;class D extends RD{constructor(...a){a.length?super(...a):super(RD.now()+off)}static now(){return RD.now()+off}}window.Date=D;const W={chatData:${JSON.stringify(data)},publicData:null,isPreview:false,onEvent(t,f){(hs[t]=hs[t]||[]).push(f)},offEvent(){},ready(){},request(data){return new Promise((res,rej)=>{const id=++seq;pend[id]=[res,rej];parent.postMessage({q:id,data},"*")})},HapticFeedback:{impactOccurred(){},selectionChanged(){},notificationOccurred(){}}};window.TelegramWidget=W;addEventListener("message",e=>{const m=e.data||{};if("off"in m)off=m.off;if("cd"in m){W.chatData=m.cd;(hs.chatDataChanged||[]).forEach(f=>f())}if(m.a){const p=pend[m.a];delete pend[m.a];if(p)"err"in m?p[1]({code:m.err}):p[0]({result:m.result})}});addEventListener("load",()=>{const b=document.body,size=()=>{const s=getComputedStyle(b);parent.postMessage({h:Math.ceil(b.offsetHeight+parseFloat(s.marginTop)+parseFloat(s.marginBottom))},"*")};new ResizeObserver(size).observe(b);size()})})();`;

const documentFor = (html: string, data: ShipyardData, theme: Theme, offset: number) => {
	const vars = Object.entries(palettes[theme])
		.map(([key, value]) => `--tg-theme-${key}:${value}`)
		.join(";");
	return `<!doctype html><html><head><meta charset="utf-8"><style>:root{${vars};color-scheme:${theme}}body{margin:8px 12px;font:15px/1.35 system-ui,sans-serif;color:var(--tg-theme-text-color);background:var(--tg-theme-bg-color);overflow:hidden;user-select:none}button{font:inherit;border:0;border-radius:8px;padding:8px 14px;font-weight:500;background:var(--tg-theme-button-color);color:var(--tg-theme-button-text-color);cursor:pointer}button:active{filter:brightness(.92)}button[disabled]{background:var(--tg-theme-secondary-bg-color);color:var(--tg-theme-hint-color);cursor:default}</style><script>${shim(JSON.stringify(data), offset)}</script></head><body>${html}</body></html>`;
};

const html = (text: string) => text.replace(/&/g, "&amp;").replace(/</g, "&lt;");
const clock = (time: number) => new Date(time).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

let offset = 0;
const now = () => Date.now() + offset;
let theme: Theme = "light";
const sources = new Map<Layout, string>();

type Phone = {
	info: Info;
	data: ShipyardData;
	chat: HTMLElement;
	frame: HTMLIFrameElement;
	caption: HTMLElement;
};
const phones: Phone[] = [];

function toast(phone: Phone, text: string) {
	const element = phone.chat.parentElement?.querySelector(".toast") as HTMLElement;
	element.textContent = text;
	element.classList.add("shown");
	clearTimeout(Number(element.dataset.timer));
	element.dataset.timer = String(setTimeout(() => element.classList.remove("shown"), 2600));
}

function keyboard(phone: Phone, rows: [string, string][]) {
	const element = document.createElement("div");
	element.className = "kb";
	for (const [label, answer] of rows) {
		const button = document.createElement("button");
		button.textContent = label;
		button.onclick = () => toast(phone, answer);
		element.append(button);
	}
	return element;
}

function post(phone: Phone, message: object) {
	phone.frame.contentWindow?.postMessage(message, "*");
}

function edit(phone: Phone, data: ShipyardData) {
	phone.data = data;
	post(phone, { cd: JSON.stringify(data) });
	phone.caption.textContent = caption(data);
}

function mount(phone: Phone) {
	const source = sources.get(phone.info.layout) ?? "";
	phone.frame.srcdoc = documentFor(source, phone.data, theme, offset);
	phone.caption.textContent = caption(phone.data);
}

function create(info: Info, column: HTMLElement) {
	const chat = column.querySelector(".chat") as HTMLElement;
	chat.innerHTML = "";
	const bubble = document.createElement("div");
	bubble.className = "msg";
	const frame = document.createElement("iframe");
	frame.className = "widget";
	frame.setAttribute("sandbox", "allow-scripts");
	frame.title = `${info.name} widget`;
	const text = document.createElement("div");
	text.className = "caption";
	const time = document.createElement("time");
	time.textContent = clock(now());
	bubble.append(frame, text, time);
	const phone: Phone = {
		info,
		data: initialData(now(), info.layout === "mixes"),
		chat,
		frame,
		caption: text,
	};
	chat.append(bubble);
	const rows: [string, string][] = [];
	if (info.layout === "mixes")
		rows.push([
			"💾 Save a mix",
			"The bot asks for a name in a reply, then the drafted batch joins the mixes.",
		]);
	rows.push(["⬅️ Command Center", "This preview covers the Shipyard."]);
	chat.append(keyboard(phone, rows));
	mount(phone);
	return phone;
}

function notify(phone: Phone, text: string) {
	const [title, ...rest] = text.split("\n");
	const bubble = document.createElement("div");
	bubble.className = "msg text";
	bubble.innerHTML = `<b>${html(title)}</b><br>${html(rest.join("\n"))}<time>${clock(now())}</time>`;
	phone.chat.append(
		bubble,
		keyboard(phone, [["🚀 Shipyard", "Brings the Shipyard message back to the bottom of the chat."]]),
	);
	phone.chat.scrollTop = phone.chat.scrollHeight;
}

function tick() {
	for (const phone of phones) {
		const done = settle(phone.data, now());
		if (!done) continue;
		edit(phone, done.data);
		notify(phone, finishedText(done.data, done.finished));
	}
}

addEventListener("message", (event) => {
	const phone = phones.find((entry) => entry.frame.contentWindow === event.source);
	if (!phone) return;
	const message = event.data as { q?: number; data?: string; h?: number };
	if (message.h) phone.frame.style.height = `${Math.min(600, Math.max(50, message.h))}px`;
	if (message.q && typeof message.data === "string") {
		const request = message.data;
		setTimeout(() => {
			const reply = answer(phone.data, request, now());
			post(phone, { a: message.q, result: reply.result });
			if (reply.data !== phone.data) edit(phone, reply.data);
		}, 400);
	}
});

function start() {
	phones.length = 0;
	for (const info of layouts) {
		const column = document.querySelector(`[data-layout="${info.layout}"]`) as HTMLElement;
		phones.push(create(info, column));
	}
}

async function main() {
	const sizes = (await (await fetch("widgets/sizes.json")).json()) as Record<
		Layout,
		{ bytes: number; zlib: number }
	>;
	await Promise.all(
		layouts.map(async ({ layout }) =>
			sources.set(layout, await (await fetch(`widgets/${layout}.html`)).text()),
		),
	);
	const grid = document.querySelector("#phones") as HTMLElement;
	grid.innerHTML = layouts
		.map(
			(info) => `<article class="column" data-layout="${info.layout}">
	<header><h2>${html(info.name)}</h2><p>${html(info.idea)}</p>
	<p class="size">${(sizes[info.layout].bytes / 1024).toFixed(1)} KB document · ${sizes[info.layout].zlib.toLocaleString("en")} of 4,096 bytes compressed · <a href="/?preview=widget-${info.layout}#100?mockScenario=${encodeURIComponent(`wireframe:widget-${info.layout}`)}" target="_blank" title="Telegram Web A draws the widget on a fixed clock and leaves orders pending.">Open in Telegram ↗</a></p></header>
	<div class="screen"><div class="bar"><b>Space Emperors</b><small>bot</small></div><div class="chat"></div><div class="toast"></div></div>
	<div class="notes"><h3>Works</h3><ul>${info.works.map((line) => `<li>${html(line)}</li>`).join("")}</ul><h3>Costs</h3><ul>${info.costs.map((line) => `<li>${html(line)}</li>`).join("")}</ul></div>
</article>`,
		)
		.join("");
	start();
	setInterval(tick, 1000);
	const themeSelect = document.querySelector("#theme") as HTMLSelectElement;
	themeSelect.onchange = () => {
		theme = themeSelect.value as Theme;
		document.body.dataset.theme = theme;
		for (const phone of phones) mount(phone);
	};
	for (const button of document.querySelectorAll<HTMLButtonElement>("[data-minutes]"))
		button.onclick = () => {
			offset += Number(button.dataset.minutes) * 60_000;
			for (const phone of phones) post(phone, { off: offset });
			(document.querySelector("#clock") as HTMLElement).textContent = offset ? `+${offset / 60_000} min` : "";
			tick();
		};
	(document.querySelector("#reset") as HTMLButtonElement).onclick = () => {
		offset = 0;
		(document.querySelector("#clock") as HTMLElement).textContent = "";
		start();
	};
}

main();
