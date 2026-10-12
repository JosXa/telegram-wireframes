import type { ReviewComment, ReviewSnapshot, ReviewTarget } from "../../src/review";
import type { Scene } from "./catalogue";
import { createLivePreview, type ElementSelection } from "./live-review";

const api = "/__wireframes__/review";
const el = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;
type Rect = Pick<ReviewComment, "x" | "y" | "width" | "height">;
type Draft = Rect & {
	snapshot?: ReviewSnapshot;
	target?: ReviewTarget;
	text: string;
	quote: string;
	replacement: string;
};
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

export function createReview(navigate: (scene: string, theme: string, comment?: number) => void) {
	const image = el<HTMLImageElement>("screenshot");
	const frame = el<HTMLIFrameElement>("review-frame");
	const canvas = el("review-canvas");
	const stage = el("review-stage");
	const form = el<HTMLFormElement>("review-form");
	const mode = el<HTMLButtonElement>("comment-mode");
	const fields = ["text", "quote", "replacement"] as const;
	const coordinates = ["x", "y", "width", "height"] as const;
	let scene: Scene;
	let theme = "dark";
	let snapshot: ReviewSnapshot | undefined;
	let target: ReviewTarget | undefined;
	let comments: ReviewComment[] = [];
	let selected: number | undefined;
	let editing: number | undefined;
	let rect: Rect | undefined;
	let generation = 0;
	let saving = false;
	let showing = "";
	const live = createLivePreview(frame, {
		select: (value: ElementSelection) =>
			begin(value.rect, {
				...value.rect,
				...(form.hidden ? { text: "", replacement: "" } : values()),
				target: value.target,
				quote: value.quote,
			}),
		hover: (box) => {
			const highlight = el("review-highlight");
			highlight.hidden = !box;
			if (box) position(highlight, box);
		},
		change: draw,
		selection: (available) => {
			el<HTMLButtonElement>("review-use-quote").disabled = !available;
		},
		navigate: (id) => navigate(id, theme),
		cancel: () => setMode(false),
	});
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
		if (!form.hidden && rect && (snapshot || target) && !editing) {
			sessionStorage.setItem(draftKey(), JSON.stringify({ ...rect, ...values(), snapshot, target }));
		}
	}
	function setMode(active: boolean) {
		mode.setAttribute("aria-pressed", String(active));
		mode.textContent = active ? "Stop selecting" : "Add comment";
		canvas.classList.toggle("selecting", active);
		live.inspect(active);
		el("review-hint").textContent = active
			? "Hover to highlight an element, then click to comment. Drag across words to quote just that text. Esc exits."
			: "Use the live preview, or choose Add comment to select an element. You can also select text and comment on it.";
		if (active && innerWidth < 1100) canvas.scrollIntoView({ block: "start", behavior: "instant" });
	}
	function zoom() {
		const value = el<HTMLSelectElement>("review-zoom").value;
		const width = snapshot?.width || 420;
		const height = snapshot?.height || 900;
		const available = canvas.parentElement?.clientWidth || width;
		const scale = value === "fit" ? Math.min(1, (available - 32) / width) : Number(value);
		canvas.style.width = `${width * scale}px`;
		canvas.style.height = `${height * scale}px`;
		stage.style.width = `${width}px`;
		stage.style.height = `${height}px`;
		stage.style.transform = `scale(${scale})`;
	}
	function showSnapshot(value: ReviewSnapshot) {
		snapshot = value;
		mode.disabled = true;
		frame.hidden = true;
		image.hidden = false;
		image.src = value.url;
		el("review-dimensions").textContent = `${value.width} × ${value.height} px`;
		el("review-current").hidden = false;
		zoom();
	}
	function showLive() {
		snapshot = undefined;
		frame.hidden = false;
		image.hidden = true;
		mode.disabled = false;
		el("review-current").hidden = true;
		el("review-dimensions").textContent = "Live HTML · 420 × 900";
		zoom();
	}
	function position(node: HTMLElement, box: Rect) {
		node.style.left = `${box.x}px`;
		node.style.top = `${box.y}px`;
		if (box.width || box.height) {
			node.style.width = `${box.width}px`;
			node.style.height = `${box.height}px`;
		}
	}
	function draw() {
		const pins = el("review-pins");
		pins.replaceChildren();
		for (const comment of comments.filter(
			(item) =>
				item.scene === scene.id &&
				item.theme === theme &&
				(snapshot ? item.snapshot?.id === snapshot.id : Boolean(item.target)) &&
				(!item.resolved || el<HTMLInputElement>("review-resolved").checked),
		)) {
			const box = comment.target ? live.rect(comment.target) : comment;
			if (!box) continue;
			if (box.width || box.height) {
				const region = document.createElement("div");
				region.className = `review-region${comment.id === selected ? " selected" : ""}`;
				position(region, box);
				pins.append(region);
			}
			const pin = document.createElement("button");
			pin.type = "button";
			pin.className = "review-pin";
			pin.textContent = String(comment.id);
			pin.setAttribute("aria-label", `Comment ${comment.id}: ${comment.text}`);
			pin.setAttribute("aria-pressed", String(comment.id === selected));
			position(pin, { ...box, width: 0, height: 0 });
			pin.addEventListener("click", () => open(comment));
			pins.append(pin);
		}
		if (rect) {
			const box = target ? live.rect(target) : rect;
			if (!box) return;
			const mark = document.createElement("div");
			mark.className = rect.width || rect.height ? "review-region draft" : "review-crosshair";
			position(mark, box);
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
		target = draft?.target;
		el("review-target").textContent = target
			? `${target.tag} · ${target.selector}`
			: "Original screenshot anchor";
		form.hidden = false;
		el("review-form-title").textContent = "New comment";
		for (const key of fields) el<HTMLTextAreaElement>(`review-${key}`).value = draft?.[key] || "";
		for (const key of coordinates) el<HTMLInputElement>(`review-${key}`).disabled = Boolean(target);
		setRect(value);
		setMode(false);
		saveDraft();
		el("review-text").focus({ preventScroll: true });
		if (innerWidth < 1100) form.scrollIntoView({ block: "nearest", behavior: "instant" });
	}
	function close() {
		form.hidden = true;
		rect = undefined;
		target = undefined;
		editing = undefined;
		draw();
	}
	async function open(comment: ReviewComment) {
		saveDraft();
		close();
		selected = comment.id;
		if (comment.snapshot) showSnapshot(comment.snapshot);
		else showLive();
		setMode(false);
		render();
		el(`review-comment-${comment.id}`)?.scrollIntoView({ block: "nearest" });
		if (comment.target) {
			try {
				const found = await live.reveal(comment.target);
				status(
					found
						? `Comment #${comment.id} selected on the live element.`
						: `The element has changed. Comment #${comment.id} retains its original text and HTML.`,
				);
			} catch (error) {
				status(String(error), true);
			}
		} else status(`Comment #${comment.id} shows its original screenshot.`);
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
				? "No open feedback. Pick a screen and select an element or text."
				: "No open comments for this screen and theme.";
			list.append(empty);
		}
		for (const item of visible) {
			const entry = document.createElement("article");
			entry.id = `review-comment-${item.id}`;
			entry.className = `review-comment${selected === item.id ? " selected" : ""}`;
			const link = button(
				`#${item.id} · ${item.title} · ${item.theme}${item.resolved ? " · Resolved" : ""}`,
				() => {
					if (scene.id !== item.scene || theme !== item.theme) navigate(item.scene, item.theme, item.id);
					else open(item);
				},
			);
			const text = document.createElement("p");
			text.textContent = item.text;
			const location = document.createElement("small");
			location.textContent = item.target
				? `${item.target.tag} · ${item.target.selection ? "Text selection" : "Element"}`
				: `x ${item.x}, y ${item.y} · Original screenshot`;
			entry.append(link, location, text);
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
				button("Edit", async () => {
					if (scene.id !== item.scene || theme !== item.theme) {
						navigate(item.scene, item.theme, item.id);
						return;
					}
					await open(item);
					editing = item.id;
					target = item.target;
					el("review-target").textContent = item.target?.selector || "Original screenshot anchor";
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
	mode.addEventListener("click", () => {
		if (snapshot || saving) return;
		saveDraft();
		setMode(mode.getAttribute("aria-pressed") !== "true");
	});
	document.addEventListener("keydown", (event) => {
		if (event.key === "Escape") setMode(false);
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
		if (saving || !rect || (!snapshot && !target)) return;
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
					: {
							...values(),
							...rect,
							snapshotId: snapshot?.id,
							target,
							scene: scene.id,
							title: scene.title,
							theme,
						},
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
	new ResizeObserver(zoom).observe(canvas.parentElement as HTMLElement);
	el("review-filter").addEventListener("change", render);
	el("review-resolved").addEventListener("change", render);
	el("review-current").addEventListener("click", () => {
		saveDraft();
		close();
		selected = undefined;
		showLive();
		render();
		status("Live HTML preview.");
	});
	el("review-use-quote").addEventListener("click", () => live.commentSelection());
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
				"Live comments include DOM selectors, frame URLs, selected text, and HTML captured when the comment was made.",
				...comments.map(
					(item) =>
						`## #${item.id} · ${item.title} (${item.theme}) · ${item.resolved ? "Resolved" : "Open"}\n\n[Review screen](${linkFor(item)})${item.snapshot ? ` · [Original screenshot](${location.origin}${item.snapshot.url})` : ""}\n\nScene: ${item.scene}\nAnchor: x=${item.x}, y=${item.y}, width=${item.width}, height=${item.height}${item.target ? `\nElement: ${item.target.selector}\nFrames: ${item.target.frames.join(" → ") || "Telegram chat"}\nURLs: ${item.target.urls.join(" → ")}\n\n\`\`\`html\n${item.target.html}\n\`\`\`` : ""}\n\n${item.text}${
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
		async show(next: Scene, nextTheme: string) {
			const key = `${next.id}:${nextTheme}:${new URL(location.href).searchParams.get("comment") || ""}`;
			if (showing === key) return;
			showing = key;
			if (scene) saveDraft();
			const version = ++generation;
			scene = next;
			theme = nextTheme;
			snapshot = undefined;
			selected = undefined;
			close();
			setMode(false);
			mode.disabled = true;
			image.hidden = true;
			frame.hidden = false;
			el("review-current").hidden = true;
			el("review-dimensions").textContent = "";
			zoom();
			status("Loading live Telegram preview…");
			try {
				const [, saved] = await Promise.all([live.load(next, theme), request<ReviewComment[]>("comments")]);
				if (generation !== version) return;
				comments = saved;
				showLive();
				status("Select elements or text in the live preview. Feedback is saved on this server.");
				const id = Number(new URL(location.href).searchParams.get("comment"));
				const linked = comments.find(
					(item) => item.id === id && item.scene === scene.id && item.theme === theme,
				);
				if (linked) {
					if (linked.resolved) el<HTMLInputElement>("review-resolved").checked = true;
					await open(linked);
				} else {
					const draft = sessionStorage.getItem(draftKey());
					if (draft) {
						const value = JSON.parse(draft) as Draft;
						if (value.snapshot) showSnapshot(value.snapshot);
						if (value.target) await live.reveal(value.target);
						begin(value, value);
						status("Your unsaved draft has been restored.");
					}
				}
				render();
			} catch (error) {
				if (version === generation) {
					showing = "";
					status(String(error), true);
					el("review-comments").replaceChildren();
				}
			}
		},
	};
}
