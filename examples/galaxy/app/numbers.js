// Shared display rule for the Space Emperors chat fixtures and Mini Apps.
const suffixes = ["K", "M", "B", "T", "Qa", "Qi"];

/** @param {number} value */
export function count(value) {
	if (Math.abs(value) < 100_000) return value.toLocaleString("en-GB").replaceAll(",", " ");
	const unit = Math.min(Math.floor(Math.log10(Math.abs(value)) / 3) - 1, suffixes.length - 1);
	// Truncate to one decimal so the display never overstates resources or ship counts.
	return `${Math.trunc(value / (1000 ** (unit + 1) / 10)) / 10}${suffixes[unit]}`;
}
