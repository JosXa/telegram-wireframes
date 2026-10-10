import { spectralClasses } from "./astronomy.js";

// Cache the visible part of a sector, with enough overscan to pan using only a compositor transform.
// Ownership, selection, intelligence and fleets remain live SVG overlays in app.js.
export function createSectorMap(canvas, systems, hexSize) {
	const byHex = new Map(systems.map((system) => [`${system.q},${system.r}`, system]));
	const radius = Math.max(...systems.map(({ q, r }) => Math.max(Math.abs(q), Math.abs(r), Math.abs(q + r))));
	const extentX = (radius * 1.5 + 1) * hexSize;
	const extentY = (radius + 0.5) * hexSize * Math.sqrt(3);
	const padding = 192;
	const sprites = new Map();
	let cached;
	let pixelRatio;
	canvas.dataset.systems = systems.length;

	function sprite(component, detailed) {
		const spectral = component.kind === "star" ? spectralClasses[component.spectral] : null;
		const color = spectral?.color || "#b1d6e8";
		const radius = spectral
			? component.luminosity === "I"
				? 2.8
				: component.luminosity === "III"
					? 2.2
					: spectral.radius
			: 0.9;
		const key = `${component.kind}:${color}:${radius}:${!!component.pulsar}:${detailed}`;
		if (sprites.has(key)) return sprites.get(key);
		const image = document.createElement("canvas");
		image.width = image.height = 32 * pixelRatio;
		const ctx = image.getContext("2d");
		ctx.scale(pixelRatio, pixelRatio);
		ctx.translate(16, 16);
		ctx.scale(1.3, 1.3);
		const circle = (r, fill, alpha) => {
			ctx.globalAlpha = alpha;
			ctx.fillStyle = fill;
			ctx.beginPath();
			ctx.arc(0, 0, r, 0, Math.PI * 2);
			ctx.fill();
		};
		if (component.kind === "black-hole") {
			ctx.globalAlpha = 0.55;
			ctx.strokeStyle = "#dca774";
			ctx.lineWidth = 0.8;
			ctx.beginPath();
			ctx.ellipse(0, 0, 4, 1.8, (-28 * Math.PI) / 180, 0, Math.PI * 2);
			ctx.stroke();
			circle(1.8, "#050911", 1);
		} else {
			if (detailed) {
				circle(radius * 2.8, color, 0.065);
				circle(radius * 1.65, color, 0.12);
			}
			circle(radius, color, 0.65);
			if (component.pulsar) {
				ctx.globalAlpha = 0.4;
				ctx.strokeStyle = color;
				ctx.lineWidth = 0.7;
				ctx.beginPath();
				ctx.moveTo(-2, 5);
				ctx.lineTo(2, -5);
				ctx.stroke();
			}
		}
		sprites.set(key, image);
		return image;
	}

	function render(camera, width, height) {
		const ratio = window.devicePixelRatio || 1;
		if (pixelRatio !== ratio) {
			pixelRatio = ratio;
			sprites.clear();
			cached = undefined;
		}
		if (
			!cached ||
			cached.scale !== camera.scale ||
			cached.width !== width ||
			cached.height !== height ||
			(!cached.whole && (Math.abs(camera.x - cached.x) > padding || Math.abs(camera.y - cached.y) > padding))
		) {
			const scale = camera.scale;
			const sectorWidth = Math.ceil(extentX * scale * 2 + 32);
			const sectorHeight = Math.ceil(extentY * scale * 2 + 32);
			// At overview scale the entire sector fits this budget, so any pan can reuse the same bitmap.
			const whole = sectorWidth <= width + padding * 2 && sectorHeight <= height + padding * 2;
			const w = whole ? sectorWidth : width + padding * 2;
			const h = whole ? sectorHeight : height + padding * 2;
			if (canvas.width !== Math.ceil(w * ratio)) canvas.width = Math.ceil(w * ratio);
			if (canvas.height !== Math.ceil(h * ratio)) canvas.height = Math.ceil(h * ratio);
			canvas.style.width = `${w}px`;
			canvas.style.height = `${h}px`;
			const ctx = canvas.getContext("2d");
			// Reuse the backing store when crossing the margin instead of reallocating a DPR-sized surface.
			ctx.setTransform(1, 0, 0, 1, 0, 0);
			ctx.clearRect(0, 0, canvas.width, canvas.height);
			ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
			const symbol = Math.min(1, Math.max(0.28, scale / 0.42));
			const x = whole ? w / 2 : camera.x + padding;
			const y = whole ? h / 2 : camera.y + padding;
			// Query axial rows within the buffered viewport instead of scanning every system on a drag.
			const left = -x / scale - hexSize - 24;
			const right = (w - x) / scale + hexSize + 24;
			const top = -y / scale - hexSize - 24;
			const bottom = (h - y) / scale + hexSize + 24;
			const firstQ = Math.max(-radius, Math.ceil(left / (hexSize * 1.5)));
			const lastQ = Math.min(radius, Math.floor(right / (hexSize * 1.5)));
			const visible = [];
			ctx.fillStyle = "oklch(30% 0.035 245 / 0.015)";
			ctx.strokeStyle = "oklch(68% 0.035 245 / 0.09)";
			ctx.lineWidth = scale;
			for (let q = firstQ; q <= lastQ; q++) {
				const firstR = Math.max(-radius, -q - radius, Math.ceil(top / (hexSize * Math.sqrt(3)) - q / 2));
				const lastR = Math.min(radius, -q + radius, Math.floor(bottom / (hexSize * Math.sqrt(3)) - q / 2));
				for (let r = firstR; r <= lastR; r++) {
					const system = byHex.get(`${q},${r}`);
					if (!system) continue;
					visible.push(system);
					const cx = x + hexSize * 1.5 * q * scale;
					const cy = y + hexSize * Math.sqrt(3) * (r + q / 2) * scale;
					ctx.beginPath();
					for (let i = 0; i < 6; i++) {
						const px = cx + Math.cos((i * Math.PI) / 3) * hexSize * scale;
						const py = cy + Math.sin((i * Math.PI) / 3) * hexSize * scale;
						if (i) ctx.lineTo(px, py);
						else ctx.moveTo(px, py);
					}
					ctx.closePath();
					ctx.fill();
					ctx.stroke();
				}
			}
			for (const system of visible) {
				const positions =
					system.components.length === 1
						? [[0, 0]]
						: system.components.length === 2
							? [
									[-3, 0],
									[3, 1.5],
								]
							: [
									[-3, -1],
									[3, 1],
									[0, 5],
								];
				for (const [i, component] of system.components.entries()) {
					const [dx, dy] = positions[i];
					ctx.drawImage(
						sprite(component, scale >= 0.12),
						x + system.x * scale + dx * 1.3 * symbol - 16 * symbol,
						y + system.y * scale + dy * 1.3 * symbol - 16 * symbol,
						32 * symbol,
						32 * symbol,
					);
				}
			}
			cached = { ...camera, width, height, whole, originX: x, originY: y };
		}
		canvas.style.transform = `translate3d(${camera.x - cached.originX}px, ${camera.y - cached.originY}px, 0)`;
	}
	return { render, getSystem: (q, r) => byHex.get(`${q},${r}`) };
}
