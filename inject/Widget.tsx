import type { ThemeKey } from "../../../../types";
import { requestMutation } from "../../../fasterdom/fasterdom";
import type { FC } from "../../../teact/teact";
import { memo, useEffect, useMemo, useRef, useState } from "../../../teact/teact";
import type { Widget } from "./fixture";

export type WireframeWidget = {
	widget: Widget;
	now: number;
	viewer: string;
};

const PALETTES: Record<ThemeKey, Record<string, string>> = {
	light: {
		"bg-color": "#ffffff",
		"secondary-bg-color": "#f1f1f4",
		"text-color": "#000000",
		"hint-color": "#707579",
		"link-color": "#3390ec",
		"button-color": "#3390ec",
		"button-text-color": "#ffffff",
		"accent-text-color": "#3390ec",
		"subtitle-text-color": "#707579",
		"destructive-text-color": "#e53935",
		"section-bg-color": "#ffffff",
		"section-header-text-color": "#3390ec",
		"section-separator-color": "#e7e7e7",
	},
	dark: {
		"bg-color": "#212121",
		"secondary-bg-color": "#181818",
		"text-color": "#ffffff",
		"hint-color": "#aaaaaa",
		"link-color": "#8774e1",
		"button-color": "#8774e1",
		"button-text-color": "#ffffff",
		"accent-text-color": "#8774e1",
		"subtitle-text-color": "#aaaaaa",
		"destructive-text-color": "#ff595a",
		"section-bg-color": "#212121",
		"section-header-text-color": "#8774e1",
		"section-separator-color": "#100f10",
	},
};

const MIN_WIDTH = 200;
const MIN_HEIGHT = 50;
const MAX_SIZE = 600;
const TIME_BAND = 22;
const TIME_CORNER = 56;

function clamp(value: number, min: number, max: number) {
	return Math.min(max, Math.max(min, value));
}

function json(value: unknown) {
	return JSON.stringify(value).replaceAll("<", "\\u003c");
}

export function buildWidgetDocument(
	{ widget, now, viewer }: WireframeWidget,
	theme: ThemeKey,
	hasCaptionBelow: boolean,
) {
	const vars = PALETTES[theme];
	const themeParams = Object.fromEntries(
		Object.entries(vars).map(([key, value]) => [key.replaceAll("-", "_"), value]),
	);
	const band = hasCaptionBelow ? 0 : TIME_BAND;
	const corner = band ? TIME_CORNER : 0;
	const root = Object.entries(vars)
		.map(([key, value]) => `--tg-theme-${key}:${value};`)
		.join("");
	const html = widget.html.replace(
		/env\(\s*safe-area-inset-(top|right|bottom|left)/g,
		"var(--tg-content-safe-area-inset-$1",
	);
	return `<!doctype html><html><head><meta charset="utf-8"><style>
:root{${root}--tg-color-scheme:${theme};--tg-content-safe-area-inset-top:0px;--tg-content-safe-area-inset-right:0px;--tg-content-safe-area-inset-bottom:${band}px;--tg-content-safe-area-inset-left:0px;--tg-content-safe-area-corner-right:${corner}px;--tg-content-safe-area-corner-left:0px;--tg-text-font-size:15px;--tg-text-line-height:1.35;color-scheme:${theme}}
html{background:transparent;display:flow-root}
body{margin:8px 12px;padding-bottom:${band}px;font:15px/1.35 system-ui,sans-serif;color:var(--tg-theme-text-color);-webkit-user-select:none;user-select:none;overflow:hidden}
:where(button){background:var(--tg-theme-button-color);color:var(--tg-theme-button-text-color);border:0;border-radius:8px;padding:8px 14px;font:inherit;font-weight:500;cursor:pointer}
:where(button:disabled){background:var(--tg-theme-secondary-bg-color);color:var(--tg-theme-hint-color)}
:where(hr){border:0;border-top:1px solid var(--tg-theme-section-separator-color)}
:where(a){color:var(--tg-theme-link-color)}
*,::before,::after{animation-delay:0s!important;animation-play-state:paused!important;transition:none!important}
</style><script>
(()=>{const RD=Date,now=${now};class D extends RD{constructor(...a){a.length?super(...a):super(now)}static now(){return now}}window.Date=D;})();
(()=>{const post=m=>parent.postMessage({wireframeWidget:1,...m},'*'),handlers={},log=t=>console.info('[wireframes] widget '+t);
const measure=()=>post({height:Math.ceil(document.documentElement.getBoundingClientRect().height)});
addEventListener('DOMContentLoaded',()=>new ResizeObserver(measure).observe(document.documentElement));
addEventListener('load',()=>post({loaded:1}));
window.TelegramWidget={profile:1,isProfileAtLeast:n=>n<=1,colorScheme:${json(theme)},themeParams:${json(themeParams)},isActive:true,
isPreview:false,isForward:false,chatType:'private',viewer:{id:1,first_name:${json(viewer)}},
chatData:${json(widget.chat_data ?? null)},publicData:${json(widget.public_data ?? null)},wallet:null,
contentSafeAreaInset:{top:0,right:0,bottom:${band},left:0,cornerLeft:0,cornerRight:${corner}},
HapticFeedback:{impactOccurred(){return this},notificationOccurred(){return this},selectionChanged(){return this}},
onEvent(t,f){(handlers[t]??=[]).push(f)},offEvent(t,f){handlers[t]=(handlers[t]||[]).filter(x=>x!==f)},
ready(){post({ready:1})},setResizeAnchor(){},watchPublicData(){},unwatchPublicData(){},
openLink:u=>log('openLink '+u),openTelegramLink:u=>log('openTelegramLink '+u),copyText:t=>log('copyText '+t),
request(d){log('request '+d);return new Promise(()=>{})}};})();
</script></head><body>${html}</body></html>`;
}

type OwnProps = {
	content: WireframeWidget;
	theme: ThemeKey;
	hasCaptionBelow: boolean;
};

function hash(text: string) {
	let value = 5381;
	for (let index = 0; index < text.length; index++) value = (value * 33) ^ text.charCodeAt(index);
	return (value >>> 0).toString(36);
}

const WidgetFrame: FC<OwnProps> = ({ content, theme, hasCaptionBelow }) => {
	const ref = useRef<HTMLIFrameElement>();
	const [contentHeight, setContentHeight] = useState(MIN_HEIGHT);
	const widgetDocument = useMemo(
		() => buildWidgetDocument(content, theme, hasCaptionBelow),
		[content, theme, hasCaptionBelow],
	);

	useEffect(() => {
		const handleMessage = (event: MessageEvent) => {
			const frame = ref.current;
			if (!frame || event.source !== frame.contentWindow) return;
			if (event.data?.wireframeWidgetHost) {
				frame.contentWindow?.postMessage({ wireframeWidgetDocument: widgetDocument }, "*");
				return;
			}
			if (!event.data?.wireframeWidget) return;
			if (typeof event.data.height === "number") setContentHeight(event.data.height);
			if (event.data.loaded || event.data.ready)
				requestMutation(() => {
					if (event.data.loaded) frame.dataset.loaded = "";
					if (event.data.ready) frame.dataset.ready = "";
				});
		};
		window.addEventListener("message", handleMessage);
		return () => window.removeEventListener("message", handleMessage);
	}, [widgetDocument]);

	const { width, height } = content.widget;
	const style = [
		`width: ${width ? `${clamp(width, MIN_WIDTH, MAX_SIZE)}px` : "var(--max-width)"}`,
		"max-width: 100%",
		`height: ${clamp(height || contentHeight, MIN_HEIGHT, MAX_SIZE)}px`,
	].join("; ");

	return (
		<div className="media-inner wireframe-widget" style={style}>
			<iframe
				ref={ref}
				src={`/__wireframes__/widget.html?${hash(widgetDocument)}`}
				className="wireframe-widget"
				sandbox="allow-scripts"
				title="Widget"
				style="display: block; width: 100%; height: 100%; border: 0"
			/>
		</div>
	);
};

export default memo(WidgetFrame);
