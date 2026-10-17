import { expect, test } from "bun:test";
import { count } from "../examples/galaxy/app/numbers.js";

test("large quantities change notation at six digits without overstating the value", () => {
	for (const [value, expected] of [
		[0, "0"],
		[12_400, "12 400"],
		[99_999, "99 999"],
		[100_000, "100K"],
		[123_456, "123.4K"],
		[999_999, "999.9K"],
		[1_000_000, "1M"],
		[1_250_000, "1.2M"],
		[999_999_999, "999.9M"],
		[1e9, "1B"],
		[1e12, "1T"],
		[1e15, "1Qa"],
		[1e18, "1Qi"],
		[-123_456, "-123.4K"],
	] as const)
		expect(count(value)).toBe(expected);
});
