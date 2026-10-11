import type { ReviewComment, ReviewSnapshot } from "../../src/review";
import type { Scene } from "./catalogue";

const api = "/__wireframes__/review";
const el = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;
type Rect = Pick<ReviewComment, "x" | "y" | "width" | "height">;
type Draft = Rect & { snapshot: ReviewSnapshot; text: string; quote: string; replacement: string };
async function request<T>(path: string, body?: unknown, method = "POST"): Promise<T> {
	const response = await fetch(
		`${api}/${path}`,
		body
			? { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }
			: undefined,
	);
	const value = await response.json();
	if (!response.ok) throw new Error(value.error || "Could not save feedback");
	return value;
}
function download(name: string, content: string, type: string) {
	const url = URL.createObjectURL(new Blob([content], { type }));
	const link = document.createElement("a");
	link.href = url;
	link.download = name;
	link.click();
	URL.revokeObjectURL(url);
}

export function createReview(navigate: (scene: string, theme: string, comment: number) => void) {
	const image = el<HTMLImageElement>("screenshot");
	const canvas = el("review-canvas");
	const overlay = el("review-overlay");
	const form = el<HTMLFormElement>("review-form");
	const mode = el<HTMLButtonElement>("comment-mode");
	const fields = ["text", "quote", "replacement"] as const;
	const coordinates = ["x", "y", "width", "height"] as const;
	let scene: Scene;
	let theme = "dark";
	let current: ReviewSnapshot | undefined;
	let snapshot: ReviewSnapshot | undefined;
	let comments: ReviewComment[] = [];
	let selected: number | undefined;
	let editing: number | undefined;
	let rect: Rect | undefined;
	let start: { x: number; y: number } | undefined;
	let generation = 0;
	let saving = false;
	let showing = "";
	let copySelection = "";
	const status = (text: string, error = false) => {
		el("review-status").textContent = text;
		el("review-status").dataset.error = String(error);
	};
	const draftKey = () => `wireframe-review:${scene.id}:${theme}`;
	const values = () =>
		Object.fromEntries(fields.map((key) => [key, el<HTMLTextAreaElement>(`review-${key}`).value])) as Pick<
			Draft,
			"text" | "quote" | "replacement"
		>;
	function saveDraft() {
		if (!form.hidden && rect && snapshot && !editing) {
			sessionStorage.setItem(draftKey(), JSON.stringify({ ...rect, ...values(), snapshot }));
		}
	}
	function setMode(active: boolean) {
		mode.setAttribute("aria-pressed", String(active));
		overlay.classList.toggle("active", active);
		overlay.tabIndex = active ? 0 : -1;
		el("review-hint").textContent = active
			? "Click to pin, or drag to mark an area. Arrow keys move 1 px; Shift moves 10 px; Enter places a pin."
			: "Click Add comment, then click a point or drag over an area.";
	}
	function zoom() {
		const value = el<HTMLSelectElement>("review-zoom").value;
		canvas.style.width =
			value === "fit" ? "380px" : `${(snapshot?.width || image.naturalWidth) * Number(value)}px`;
		canvas.style.maxWidth = value === "fit" ? "100%" : "none";
	}
	function showSnapshot(value: ReviewSnapshot) {
		snapshot = value;
		mode.disabled = true;
		image.src = value.url;
		el("review-dimensions").textContent = `${value.width} × ${value.height} px`;
		el("review-current").hidden = value.id === current?.id;
		zoom();
	}
	image.addEventListener("load", () => {
		if (snapshot && image.src === new URL(snapshot.url, location.href).href) {
			mode.disabled = false;
			image.hidden = false;
			el("pending").hidden = true;
		}
	});
	function position(node: HTMLElement, box: Rect) {
		if (!snapshot) return;
		node.style.left = `${(box.x / snapshot.width) * 100}%`;
		node.style.top = `${(box.y / snapshot.height) * 100}%`;
		if (box.width || box.height) {
			node.style.width = `${(box.width / snapshot.width) * 100}%`;
			node.style.height = `${(box.height / snapshot.height) * 100}%`;
		}
	}
	function draw() {
		const pins = el("review-pins");
		pins.replaceChildren();
		for (const comment of comments.filter(
			(item) =>
				item.scene === scene.id &&
				item.theme === theme &&
				item.snapshot.id === snapshot?.id &&
				(!item.resolved || el<HTMLInputElement>("review-resolved").checked),
		)) {
			if (comment.width || comment.height) {
				const region = document.createElement("div");
				region.className = `review-region${comment.id === selected ? " selected" : ""}`;
				position(region, comment);
				pins.append(region);
			}
			const pin = document.createElement("button");
			pin.type = "button";
			pin.className = "review-pin";
			pin.textContent = String(comment.id);
			pin.setAttribute("aria-label", `Comment ${comment.id}: ${comment.text}`);
			pin.setAttribute("aria-pressed", String(comment.id === selected));
			position(pin, { ...comment, width: 0, height: 0 });
			pin.addEventListener("click", () => open(comment));
			pins.append(pin);
		}
		if (rect) {
			const mark = document.createElement("div");
			mark.className = rect.width || rect.height ? "review-region draft" : "review-crosshair";
			position(mark, rect);
			pins.append(mark);
		}
	}
	function setRect(value: Rect) {
		rect = value;
		for (const key of coordinates) el<HTMLInputElement>(`review-${key}`).value = String(value[key]);
		draw();
	}
	function begin(value: Rect, draft?: Draft) {
		if (saving) return;
		editing = undefined;
		selected = undefined;
		form.hidden = false;
		el("review-form-title").textContent = "New comment";
		for (const key of fields) el<HTMLTextAreaElement>(`review-${key}`).value = draft?.[key] || "";
		for (const key of coordinates) el<HTMLInputElement>(`review-${key}`).disabled = false;
		setRect(value);
		setMode(false);
		saveDraft();
		el("review-text").focus({ preventScroll: true });
		if (innerWidth < 1100) form.scrollIntoView({ block: "nearest", behavior: "instant" });
	}
	function close() {
		form.hidden = true;
		rect = undefined;
		editing = undefined;
		draw();
	}
	function open(comment: ReviewComment) {
		saveDraft();
		close();
		selected = comment.id;
		showSnapshot(comment.snapshot);
		setMode(false);
		render();
		el(`review-comment-${comment.id}`)?.scrollIntoView({ block: "nearest" });
		status(
			comment.snapshot.id === current?.id
				? `Comment #${comment.id} selected.`
				: `Comment #${comment.id} shows its original screenshot. The current screen has changed.`,
		);
	}
	function button(label: string, action: () => void) {
		const node = document.createElement("button");
		node.type = "button";
		node.textContent = label;
		node.addEventListener("click", action);
		return node;
	}
	function render() {
		const list = el("review-comments");
		list.replaceChildren();
		const all = el<HTMLSelectElement>("review-filter").value === "all";
		const visible = comments.filter(
			(item) =>
				(all || (item.scene === scene.id && item.theme === theme)) &&
				(!item.resolved || el<HTMLInputElement>("review-resolved").checked),
		);
		el("review-count").textContent = String(visible.length);
		if (!visible.length) {
			const empty = document.createElement("p");
			empty.textContent = all
				? "No open feedback. Pick a screen and mark a point or area."
				: "No open comments for this screen and theme.";
			list.append(empty);
		}
		for (const item of visible) {
			const entry = document.createElement("article");
			entry.id = `review-comment-${item.id}`;
			entry.className = `review-comment${selected === item.id ? " selected" : ""}`;
			const target = button(
				`#${item.id} · ${item.title} · ${item.theme}${item.resolved ? " · Resolved" : ""}`,
				() => {
					if (scene.id !== item.scene || theme !== item.theme) navigate(item.scene, item.theme, item.id);
					else open(item);
				},
			);
			const text = document.createElement("p");
			text.textContent = item.text;
			const location = document.createElement("small");
			location.textContent = `x ${item.x}, y ${item.y}${item.width || item.height ? ` · ${item.width} × ${item.height} px` : " · point"}`;
			entry.append(target, location, text);
			for (const [label, content] of [
				["Copy", item.quote],
				["Suggested wording", item.replacement],
			]) {
				if (!content) continue;
				const quote = document.createElement("blockquote");
				const title = document.createElement("strong");
				title.textContent = label;
				quote.append(title, document.createTextNode(`\n${content}`));
				entry.append(quote);
			}
			const actions = document.createElement("div");
			actions.className = "review-actions";
			actions.append(
				button("Edit", () => {
					if (scene.id !== item.scene || theme !== item.theme) {
						navigate(item.scene, item.theme, item.id);
						return;
					}
					open(item);
					editing = item.id;
					form.hidden = false;
					el("review-form-title").textContent = `Edit comment #${item.id}`;
					setRect(item);
					for (const key of fields) el<HTMLTextAreaElement>(`review-${key}`).value = item[key];
					for (const key of coordinates) el<HTMLInputElement>(`review-${key}`).disabled = true;
					el("review-text").focus();
				}),
				button(item.resolved ? "Reopen" : "Resolve", async () => {
					try {
						await request(`comments/${item.id}`, { ...item, resolved: !item.resolved }, "PATCH");
						comments = await request("comments");
						render();
						status(item.resolved ? "Comment reopened." : "Comment resolved. Use Include resolved to see it.");
					} catch (error) {
						status(String(error), true);
					}
				}),
			);
			entry.append(actions);
			list.append(entry);
		}
		draw();
	}
	function point(event: PointerEvent) {
		const bounds = image.getBoundingClientRect();
		return {
			x: Math.max(
				0,
				Math.min(
					(snapshot?.width || 1) - 1,
					Math.round(((event.clientX - bounds.left) / bounds.width) * (snapshot?.width || 1)),
				),
			),
			y: Math.max(
				0,
				Math.min(
					(snapshot?.height || 1) - 1,
					Math.round(((event.clientY - bounds.top) / bounds.height) * (snapshot?.height || 1)),
				),
			),
		};
	}
	mode.addEventListener("click", () => {
		if (!snapshot || saving) return;
		saveDraft();
		setMode(mode.getAttribute("aria-pressed") !== "true");
		if (mode.getAttribute("aria-pressed") === "true") overlay.focus({ preventScroll: true });
	});
	overlay.addEventListener("pointerdown", (event) => {
		if (event.button !== 0 || !snapshot || saving) return;
		start = point(event);
		overlay.setPointerCapture(event.pointerId);
		setRect({ ...start, width: 0, height: 0 });
	});
	overlay.addEventListener("pointermove", (event) => {
		if (!start) return;
		const end = point(event);
		setRect({
			x: Math.min(start.x, end.x),
			y: Math.min(start.y, end.y),
			width: Math.abs(start.x - end.x),
			height: Math.abs(start.y - end.y),
		});
	});
	overlay.addEventListener("pointerup", () => {
		if (start && rect)
			begin(rect, form.hidden ? undefined : { ...rect, ...values(), snapshot: snapshot as ReviewSnapshot });
		start = undefined;
	});
	overlay.addEventListener("pointercancel", () => {
		start = undefined;
		rect = undefined;
		draw();
	});
	overlay.addEventListener("keydown", (event) => {
		if (!snapshot) return;
		const key = event.key;
		if (key === "Escape") {
			setMode(false);
			return;
		}
		if (key === "Enter" || key === " ") {
			event.preventDefault();
			begin(
				rect || {
					x: Math.floor(snapshot.width / 2),
					y: Math.floor(snapshot.height / 2),
					width: 0,
					height: 0,
				},
			);
			return;
		}
		if (!key.startsWith("Arrow")) return;
		event.preventDefault();
		const step = event.shiftKey ? 10 : 1;
		const origin = rect || {
			x: Math.floor(snapshot.width / 2),
			y: Math.floor(snapshot.height / 2),
			width: 0,
			height: 0,
		};
		setRect({
			x: Math.max(
				0,
				Math.min(
					snapshot.width - 1,
					origin.x + (key === "ArrowRight" ? step : key === "ArrowLeft" ? -step : 0),
				),
			),
			y: Math.max(
				0,
				Math.min(
					snapshot.height - 1,
					origin.y + (key === "ArrowDown" ? step : key === "ArrowUp" ? -step : 0),
				),
			),
			width: 0,
			height: 0,
		});
	});
	for (const key of coordinates)
		el(`review-${key}`).addEventListener("input", () => {
			rect = Object.fromEntries(
				coordinates.map((name) => [name, Number(el<HTMLInputElement>(`review-${name}`).value)]),
			) as Rect;
			draw();
			saveDraft();
		});
	for (const key of fields) el(`review-${key}`).addEventListener("input", saveDraft);
	el("review-cancel").addEventListener("click", () => {
		if (!editing) sessionStorage.removeItem(draftKey());
		close();
	});
	form.addEventListener("submit", async (event) => {
		event.preventDefault();
		if (saving || !rect || !snapshot) return;
		const key = draftKey();
		const version = generation;
		const existing = comments.find((item) => item.id === editing);
		const wasEditing = editing !== undefined;
		saving = true;
		el<HTMLButtonElement>("review-save").disabled = true;
		status("Saving…");
		try {
			const comment = await request<ReviewComment>(
				editing ? `comments/${editing}` : "comments",
				editing
					? { ...values(), resolved: existing?.resolved || false }
					: { ...values(), ...rect, snapshotId: snapshot.id, scene: scene.id, title: scene.title, theme },
				editing ? "PATCH" : "POST",
			);
			if (!wasEditing) sessionStorage.removeItem(key);
			comments = await request("comments");
			if (generation === version) {
				selected = comment.id;
				close();
				status(`Comment #${comment.id} saved on this server.`);
			}
			render();
		} catch (error) {
			status(`${String(error)}. Your draft is still here.`, true);
		} finally {
			saving = false;
			el<HTMLButtonElement>("review-save").disabled = false;
		}
	});
	el("review-zoom").addEventListener("change", zoom);
	el("review-filter").addEventListener("change", render);
	el("review-resolved").addEventListener("change", render);
	el("review-current").addEventListener("click", () => {
		saveDraft();
		close();
		selected = undefined;
		if (current) showSnapshot(current);
		render();
		status("Current screenshot.");
	});
	document.addEventListener("selectionchange", () => {
		const selection = getSelection();
		if (selection?.anchorNode && el("review-copy-text").contains(selection.anchorNode))
			copySelection = selection.toString();
	});
	el("review-use-quote").addEventListener("click", () => {
		if (!copySelection) {
			status("Select wording in Screen copy first.");
			return;
		}
		if (form.hidden) {
			setMode(true);
			status("Mark its location on the screenshot, then choose Quote selection again.");
			return;
		}
		el<HTMLTextAreaElement>("review-quote").value = copySelection;
		saveDraft();
		status("Selected wording added to your comment.");
	});
	function linkFor(item: ReviewComment) {
		const url = new URL(location.href);
		url.search = new URLSearchParams({ theme: item.theme, comment: String(item.id) }).toString();
		url.hash = item.scene;
		return url.href;
	}
	el("review-export").addEventListener("click", async () => {
		try {
			comments = await request("comments");
			const output = [
				"# Space Emperors feedback",
				"Coordinates use original screenshot pixels, measured from the top left.",
				...comments.map(
					(item) =>
						`## #${item.id} · ${item.title} (${item.theme}) · ${item.resolved ? "Resolved" : "Open"}\n\n[Review screen](${linkFor(item)}) · [Original screenshot](${location.origin}${item.snapshot.url})\n\nScene: ${item.scene}\nAnchor: x=${item.x}, y=${item.y}, width=${item.width}, height=${item.height}; screenshot ${item.snapshot.width}×${item.snapshot.height}\n\n${item.text}${
							item.quote
								? `\n\nQuoted copy:\n${item.quote
										.split("\n")
										.map((line) => `> ${line}`)
										.join("\n")}`
								: ""
						}${
							item.replacement
								? `\n\nSuggested wording:\n${item.replacement
										.split("\n")
										.map((line) => `> ${line}`)
										.join("\n")}`
								: ""
						}`,
				),
			].join("\n\n");
			download("space-emperors-feedback.md", output, "text/markdown");
			status("Exported all feedback, including resolved comments.");
		} catch (error) {
			status(String(error), true);
		}
	});
	el("review-json").addEventListener("click", async () => {
		try {
			download(
				"space-emperors-feedback.json",
				JSON.stringify(await request("comments"), null, 2),
				"application/json",
			);
		} catch (error) {
			status(String(error), true);
		}
	});
	return {
		async show(next: Scene, nextTheme: string, filename: string) {
			const key = `${next.id}:${nextTheme}:${new URL(location.href).searchParams.get("comment") || ""}`;
			if (showing === key) return;
			showing = key;
			if (scene) saveDraft();
			const version = ++generation;
			scene = next;
			theme = nextTheme;
			current = undefined;
			snapshot = undefined;
			selected = undefined;
			copySelection = "";
			start = undefined;
			close();
			setMode(false);
			mode.disabled = true;
			image.src = `/__wireframes__/fixtures/${next.id}/files/screenshots/${filename}`;
			el("review-current").hidden = true;
			el("review-dimensions").textContent = "";
			const copy = next.fixture.messages
				.flatMap((message) => [
					message.text,
					message.caption,
					...(message.reply_markup && "inline_keyboard" in message.reply_markup
						? message.reply_markup.inline_keyboard.flat().map((item) => item.text)
						: []),
				])
				.filter(Boolean)
				.join("\n\n");
			el("review-copy-text").textContent =
				copy || "No chat copy for this screen. Type visible Mini App wording in Quoted copy.";
			status("Loading saved comments…");
			try {
				const [loaded, saved] = await Promise.all([
					request<ReviewSnapshot>(`screen?${new URLSearchParams({ scene: scene.id, image: filename })}`),
					request<ReviewComment[]>("comments"),
				]);
				if (generation !== version) return;
				current = loaded;
				comments = saved;
				showSnapshot(loaded);
				status("Saved on this server. Exports include every screen.");
				const id = Number(new URL(location.href).searchParams.get("comment"));
				const linked = comments.find(
					(item) => item.id === id && item.scene === scene.id && item.theme === theme,
				);
				if (linked) {
					if (linked.resolved) el<HTMLInputElement>("review-resolved").checked = true;
					open(linked);
				} else {
					const draft = sessionStorage.getItem(draftKey());
					if (draft) {
						const value = JSON.parse(draft) as Draft;
						showSnapshot(value.snapshot);
						begin(value, value);
						status("Your unsaved draft has been restored.");
					}
				}
				render();
			} catch (error) {
				if (version === generation) {
					status(String(error), true);
					el("review-comments").replaceChildren();
				}
			}
		},
	};
}
