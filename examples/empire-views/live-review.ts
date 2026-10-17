import type { ReviewComment, ReviewTarget } from "../../src/review";
import type { Scene } from "./catalogue";

type Rect = Pick<ReviewComment, "x" | "y" | "width" | "height">;
export type ElementSelection = { target: ReviewTarget; rect: Rect; quote: string };

function selector(element: Element): string {
	const parts: string[] = [];
	for (let node: Element | null = element; node; node = node.parentElement) {
		if (node.id && node.ownerDocument.querySelectorAll(`#${CSS.escape(node.id)}`).length === 1) {
			parts.unshift(`#${CSS.escape(node.id)}`);
			break;
		}
		let part = node.localName;
		const siblings = node.parentElement
			? [...node.parentElement.children].filter((sibling) => sibling.localName === node?.localName)
			: [];
		if (siblings.length > 1) part += `:nth-of-type(${siblings.indexOf(node) + 1})`;
		parts.unshift(part);
	}
	return parts.join(" > ");
}

function waitFor<T>(read: () => T | null | undefined | false, signal: AbortSignal): Promise<T> {
	return new Promise((resolve, reject) => {
		const end = (error?: Error, value?: T) => {
			clearInterval(interval);
			clearTimeout(timeout);
			signal.removeEventListener("abort", abort);
			if (error) reject(error);
			else resolve(value as T);
		};
		const abort = () => end(new DOMException("Preview changed", "AbortError"));
		const check = () => {
			try {
				const value = read();
				if (value) end(undefined, value);
			} catch (error) {
				end(error as Error);
			}
		};
		const interval = setInterval(check, 100);
		const timeout = setTimeout(
			() => end(new Error("The live preview did not finish loading. Reload this screen.")),
			30000,
		);
		signal.addEventListener("abort", abort, { once: true });
		if (signal.aborted) abort();
		else check();
	});
}

export function createLivePreview(
	frame: HTMLIFrameElement,
	callbacks: {
		select: (selection: ElementSelection) => void;
		hover: (rect?: Rect) => void;
		change: () => void;
		selection: (rect?: Rect) => void;
		navigate: (scene: string) => void;
		cancel: () => void;
	},
) {
	let controller = new AbortController();
	let inspecting = false;
	let scene: Scene;
	let selectedRange: Range | undefined;
	const documents = new Map<Document, MutationObserver>();
	let redraw = 0;
	let loadId = 0;
	function changed() {
		cancelAnimationFrame(redraw);
		redraw = requestAnimationFrame(callbacks.change);
	}
	function clearSelection() {
		selectedRange = undefined;
		for (const doc of documents.keys()) doc.getSelection()?.removeAllRanges();
		callbacks.selection();
	}
	function inspect(active: boolean) {
		inspecting = active;
		for (const doc of documents.keys()) {
			doc.documentElement.toggleAttribute("data-review-selecting", active);
		}
		if (active) clearSelection();
		callbacks.hover();
	}
	function bounds(element: Element, range?: Range): Rect {
		const rect = (range || element).getBoundingClientRect();
		let x = rect.x;
		let y = rect.y;
		let doc = element.ownerDocument;
		while (doc !== frame.contentDocument) {
			const parent = doc.defaultView?.frameElement;
			if (!parent) break;
			const offset = parent.getBoundingClientRect();
			x += offset.x + parent.clientLeft;
			y += offset.y + parent.clientTop;
			doc = parent.ownerDocument;
		}
		const left = Math.max(0, Math.round(x));
		const top = Math.max(0, Math.round(y));
		return {
			x: left,
			y: top,
			width: Math.max(0, Math.min(420, Math.round(x + rect.width)) - left),
			height: Math.max(0, Math.min(900, Math.round(y + rect.height)) - top),
		};
	}
	function capture(element: Element, range?: Range): ElementSelection {
		const doc = element.ownerDocument;
		const frames: string[] = [];
		// Closing Telegram's permission dialog moves its sibling portals; derive the frame path at selection.
		for (let owner = doc; owner !== frame.contentDocument; ) {
			const parent = owner.defaultView?.frameElement;
			if (!parent) break;
			frames.unshift(selector(parent));
			owner = parent.ownerDocument;
		}
		const urls: string[] = [];
		let owner: Document | null = frame.contentDocument;
		for (const path of [undefined, ...frames]) {
			if (path) owner = owner?.querySelector<HTMLIFrameElement>(path)?.contentDocument || null;
			if (owner) urls.push(owner.location.pathname + owner.location.search + owner.location.hash);
		}
		// Web A removes mockScenario from the hash after boot; retain the actual fixture entry point.
		urls[0] = `/#100?mockScenario=${encodeURIComponent(`wireframe:${scene.id}`)}`;
		const target: ReviewTarget = {
			selector: selector(element),
			frames,
			urls,
			tag: element.localName,
			text: (element.textContent || "").slice(0, 8000),
			html: element.outerHTML.slice(0, 12000),
			viewport: { width: 420, height: 900 },
		};
		if (range) {
			const before = doc.createRange();
			before.selectNodeContents(element);
			before.setEnd(range.startContainer, range.startOffset);
			target.selection = {
				start: before.toString().length,
				end: before.toString().length + range.toString().length,
			};
		}
		return {
			target,
			rect: bounds(element, range),
			quote: (
				range?.toString() ||
				(element as HTMLElement).innerText ||
				element.getAttribute("aria-label") ||
				element.getAttribute("alt") ||
				""
			).slice(0, 8000),
		};
	}
	function commentSelection(range = selectedRange) {
		if (!range || range.collapsed) return;
		const node = range.commonAncestorContainer;
		const element = node.nodeType === Node.ELEMENT_NODE ? (node as Element) : node.parentElement;
		if (element) callbacks.select(capture(element, range));
	}
	function attach(doc: Document) {
		if (!doc.body || documents.has(doc)) return;
		const style = doc.createElement("style");
		// Fixture switches reload the iframe; Telegram's document transitions cannot span those previews.
		style.textContent =
			"@view-transition { navigation: none; }\nhtml[data-review-selecting] * { cursor: crosshair !important; user-select: text !important; -webkit-user-select: text !important; }";
		doc.head.append(style);
		const signal = controller.signal;
		let swallowClick = false;
		let dragging = false;
		function updateSelection() {
			const selection = doc.getSelection();
			selectedRange =
				selection?.rangeCount && !selection.isCollapsed && selection.toString().trim()
					? selection.getRangeAt(0).cloneRange()
					: undefined;
			const node = selectedRange?.commonAncestorContainer;
			const element = node?.nodeType === Node.ELEMENT_NODE ? (node as Element) : node?.parentElement;
			callbacks.selection(selectedRange && element && !dragging ? bounds(element, selectedRange) : undefined);
		}
		function target(event: Event) {
			const node = event.target as Element;
			return node.closest("button, a, input, textarea, select, [role=button]") || node;
		}
		function navigateButton(event: Event) {
			if (doc !== frame.contentDocument) return;
			const button = (event.target as Element).closest("button");
			if (!button) return;
			// Web A renders emoji as images; include their alt text when matching the Bot API label.
			const copy = button.cloneNode(true) as Element;
			for (const emoji of copy.querySelectorAll("img.emoji"))
				emoji.replaceWith(emoji.getAttribute("alt") || "");
			const label = copy.textContent?.replaceAll("\u00a0", " ").trim();
			for (const message of scene.fixture.messages) {
				const markup = message.reply_markup;
				if (!markup || !("inline_keyboard" in markup)) continue;
				const action = markup.inline_keyboard.flat().find((item) => item.text === label);
				const destination = action?.callback_data && scene.fixture.navigation?.[action.callback_data];
				if (destination) {
					event.preventDefault();
					event.stopImmediatePropagation();
					callbacks.navigate(destination);
					break;
				}
			}
		}
		// Web A activates desktop buttons on mousedown and touch buttons on click.
		doc.addEventListener(
			"mousedown",
			(event) => {
				if (inspecting || swallowClick) {
					if (target(event).matches("button, a, input, textarea, select, [role=button]"))
						event.preventDefault();
					event.stopImmediatePropagation();
				} else navigateButton(event);
			},
			{ capture: true, signal },
		);
		doc.addEventListener(
			"pointermove",
			(event) => {
				if (inspecting) callbacks.hover(bounds(target(event)));
			},
			{ capture: true, signal },
		);
		doc.addEventListener(
			"pointerdown",
			(event) => {
				dragging = true;
				callbacks.selection();
				if (!inspecting) return;
				swallowClick = true;
				event.stopImmediatePropagation();
				if ((event.target as Element).closest("button, input, select, textarea, a, [role=button]"))
					event.preventDefault();
			},
			{ capture: true, signal },
		);
		doc.addEventListener(
			"pointerup",
			(event) => {
				dragging = false;
				if (doc.getSelection()?.toString().trim()) swallowClick = true;
				updateSelection();
				if (!inspecting) return;
				event.stopImmediatePropagation();
				if (doc.getSelection()?.toString()) commentSelection(doc.getSelection()?.getRangeAt(0));
			},
			{ capture: true, signal },
		);
		doc.addEventListener(
			"pointercancel",
			() => {
				dragging = false;
				updateSelection();
			},
			{ signal },
		);
		doc.addEventListener(
			"click",
			(event) => {
				if (inspecting || swallowClick) {
					event.preventDefault();
					event.stopImmediatePropagation();
					swallowClick = false;
					if (inspecting) {
						if (doc.getSelection()?.toString()) commentSelection(doc.getSelection()?.getRangeAt(0));
						else callbacks.select(capture(target(event)));
					}
					return;
				}
				navigateButton(event);
			},
			{ capture: true, signal },
		);
		doc.addEventListener("selectionchange", updateSelection, { signal });
		doc.addEventListener(
			"keydown",
			(event) => {
				if (event.key === "Escape" && (inspecting || selectedRange)) {
					event.preventDefault();
					event.stopImmediatePropagation();
					clearSelection();
					callbacks.cancel();
				} else if (event.key === "Enter" && inspecting) {
					event.preventDefault();
					event.stopImmediatePropagation();
					callbacks.select(capture(target(event)));
				}
			},
			{ capture: true, signal },
		);
		doc.addEventListener("scroll", changed, { capture: true, passive: true, signal });
		doc.addEventListener("load", scan, { capture: true, signal });
		function scan() {
			for (const child of doc.querySelectorAll<HTMLIFrameElement>("iframe")) {
				if (child.contentDocument) attach(child.contentDocument);
			}
			changed();
		}
		const observer = new MutationObserver(scan);
		documents.set(doc, observer);
		doc.documentElement.toggleAttribute("data-review-selecting", inspecting);
		observer.observe(doc.body, { childList: true, subtree: true, attributes: true, characterData: true });
		scan();
	}
	function find(value: ReviewTarget) {
		let doc = frame.contentDocument;
		for (const path of value.frames)
			doc = doc?.querySelector<HTMLIFrameElement>(path)?.contentDocument || null;
		const element = doc?.querySelector(value.selector);
		if (!element) return;
		if ((element.textContent || "").slice(0, 8000) !== value.text) {
			// Telegram rebuilds message timestamps on reload; that must not detach copy feedback.
			const original = document.createElement("template");
			original.innerHTML = value.html;
			const text = (node: Element) => {
				const copy = node.cloneNode(true) as Element;
				for (const metadata of copy.querySelectorAll(".MessageMeta, [data-ignore-on-paste]"))
					metadata.remove();
				return copy.textContent;
			};
			if (!original.content.firstElementChild || text(original.content.firstElementChild) !== text(element))
				return;
		}
		let range: Range | undefined;
		if (value.selection && doc) {
			range = doc.createRange();
			const walker = doc.createTreeWalker(element, NodeFilter.SHOW_TEXT);
			let offset = 0;
			let started = false;
			for (let node = walker.nextNode(); node; node = walker.nextNode()) {
				const end = offset + (node.textContent?.length || 0);
				if (!started && value.selection.start <= end) {
					range.setStart(node, value.selection.start - offset);
					started = true;
				}
				if (value.selection.end <= end) {
					range.setEnd(node, value.selection.end - offset);
					break;
				}
				offset = end;
			}
		}
		return { element, range };
	}
	return {
		inspect,
		commentSelection,
		clearSelection,
		rect(value: ReviewTarget) {
			const found = find(value);
			if (!found) return;
			const box = bounds(found.element, found.range);
			return box.width > 0 && box.height > 0 ? box : undefined;
		},
		async reveal(value: ReviewTarget) {
			let doc = frame.contentDocument;
			for (const [index, path] of value.frames.entries()) {
				const child = doc?.querySelector<HTMLIFrameElement>(path);
				if (!child) return false;
				const url = value.urls[index + 1];
				if (child.contentDocument?.location.href !== new URL(url, location.origin).href) {
					child.src = url;
					await waitFor(
						() =>
							child.contentDocument?.location.href === new URL(url, location.origin).href &&
							child.contentDocument.querySelector(value.selector),
						controller.signal,
					);
				}
				doc = child.contentDocument;
			}
			const found = find(value);
			found?.element.scrollIntoView({ block: "nearest", behavior: "instant" });
			changed();
			return Boolean(found);
		},
		async load(next: Scene, theme: string) {
			controller.abort();
			controller = new AbortController();
			for (const observer of documents.values()) observer.disconnect();
			documents.clear();
			selectedRange = undefined;
			callbacks.selection();
			scene = next;
			frame.style.colorScheme = theme;
			const signal = controller.signal;
			await new Promise<void>((resolve, reject) => {
				frame.addEventListener("load", () => resolve(), { once: true, signal });
				signal.addEventListener("abort", () => reject(new DOMException("Preview changed", "AbortError")), {
					once: true,
				});
				// Fixtures initialize at document load; changing only the hash leaves the previous app running.
				frame.src = `/?review=${++loadId}#100?mockScenario=${encodeURIComponent(`wireframe:${next.id}`)}`;
			});
			const doc = await waitFor(() => {
				const doc = frame.contentDocument;
				return (
					doc &&
					doc.querySelectorAll(".Message").length >= next.fixture.messages.length &&
					doc.querySelector(".Message") &&
					doc
				);
			}, signal);
			// Use Web A's own settings action so its colors and Mini App theme stay in sync.
			const telegram = doc.defaultView as unknown as {
				getActions(): {
					setSharedSettingOption(value: { theme: string; shouldUseSystemTheme: boolean }): void;
				};
			};
			telegram.getActions().setSharedSettingOption({ theme, shouldUseSystemTheme: false });
			await waitFor(
				() =>
					doc.documentElement.classList.contains(`theme-${theme}`) &&
					!doc.documentElement.classList.contains("no-animations"),
				signal,
			);
			attach(doc);
			if (next.fixture.mini_app) {
				const activate = (button: HTMLButtonElement) => {
					for (const type of ["mousedown", "mouseup", "click"]) {
						button.dispatchEvent(new MouseEvent(type, { bubbles: true, cancelable: true, button: 0 }));
					}
				};
				const launch = next.fixture.mini_app;
				const button = [...doc.querySelectorAll<HTMLButtonElement>("button")].find(
					(node) => node.textContent?.trim() === launch.button_text,
				);
				if (!button) throw new Error("Mini App launch button is missing");
				activate(button);
				const permission = await waitFor(
					() => doc.querySelector<HTMLButtonElement>(".Modal.confirm .confirm-dialog-button"),
					signal,
				);
				activate(permission);
				await waitFor(() => !doc.querySelector(".Modal.confirm[open]"), signal);
				await waitFor(
					() =>
						doc
							.querySelector<HTMLIFrameElement>("iframe")
							?.contentDocument?.querySelector(launch.ready_selector || "body"),
					signal,
				);
			}
		},
	};
}
