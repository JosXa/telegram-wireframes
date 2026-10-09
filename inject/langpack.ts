// Serves Web A's bundled English fallback strings as the server language pack, so the interface
// text is localized without a network connection.

import fallbackStrings from "../../../../assets/localization/fallback.strings?raw";
import Api from "../../tl/api";

const PLURAL_FORMS = ["zero", "one", "two", "few", "many", "other"] as const;
type PluralForm = (typeof PLURAL_FORMS)[number];

const LINE = /^"((?:[^"\\]|\\.)*)"\s*=\s*"((?:[^"\\]|\\.)*)";/gm;
const PLURAL_KEY = /^(.*)_(zero|one|two|few|many|other)$/;

function unescapeString(value: string) {
	return value.replace(/\\(.)/g, (_, char: string) => (char === "n" ? "\n" : char));
}

let cached: Api.TypeLangPackString[] | undefined;

function parseStrings() {
	const plain = new Map<string, string>();
	const plural = new Map<string, Partial<Record<PluralForm, string>>>();

	for (const [, rawKey, rawValue] of fallbackStrings.matchAll(LINE)) {
		const key = unescapeString(rawKey);
		const value = unescapeString(rawValue);
		const match = key.match(PLURAL_KEY);
		if (match) {
			const forms = plural.get(match[1]) ?? {};
			forms[match[2] as PluralForm] = value;
			plural.set(match[1], forms);
		} else {
			plain.set(key, value);
		}
	}

	return [
		...[...plain].map(([key, value]) => new Api.LangPackString({ key, value })),
		...[...plural].map(
			([key, forms]) =>
				new Api.LangPackStringPluralized({
					key,
					zeroValue: forms.zero,
					oneValue: forms.one,
					twoValue: forms.two,
					fewValue: forms.few,
					manyValue: forms.many,
					otherValue: forms.other ?? forms.one ?? "",
				}),
		),
	];
}

export function buildLangPack(langCode: string) {
	cached ??= parseStrings();

	return new Api.LangPackDifference({ langCode, fromVersion: 0, version: 1, strings: cached });
}
