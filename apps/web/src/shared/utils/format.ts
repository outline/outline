import type { TLanguage } from "../types/i18n.types";

/**
 * Standardized Currency Formatter (Pure FP)
 */
export const formatCurrency = (
	amount: number,
	lang: TLanguage = "id",
): string => {
	const currencyMap: Record<TLanguage, { code: string; locale: string }> = {
		id: { code: "IDR", locale: "id-ID" },
		en: { code: "USD", locale: "en-US" },
		jv: { code: "IDR", locale: "id-ID" },
		bjn: { code: "IDR", locale: "id-ID" },
	};

	const { code, locale } = currencyMap[lang] || currencyMap.id;

	return new Intl.NumberFormat(locale, {
		style: "currency",
		currency: code,
		minimumFractionDigits: code === "IDR" ? 0 : 2,
	}).format(amount);
};

/**
 * Standardized Date Formatter (Pure FP)
 */
export const formatDate = (
	date: Date | string | number,
	lang: TLanguage = "id",
	options?: Intl.DateTimeFormatOptions,
): string => {
	const localeMap: Record<TLanguage, string> = {
		id: "id-ID",
		en: "en-US",
		jv: "id-ID",
		bjn: "id-ID",
	};

	const locale = localeMap[lang] || localeMap.id;
	const d = new Date(date);

	return new Intl.DateTimeFormat(
		locale,
		options || {
			day: "numeric",
			month: "long",
			year: "numeric",
		},
	).format(d);
};

/**
 * Standardized Number Formatter (Pure FP)
 */
export const formatNumber = (value: number, lang: TLanguage = "id"): string => {
	const localeMap: Record<TLanguage, string> = {
		id: "id-ID",
		en: "en-US",
		jv: "id-ID",
		bjn: "id-ID",
	};

	const locale = localeMap[lang] || localeMap.id;

	return new Intl.NumberFormat(locale).format(value);
};

/**
 * Compact Number Formatter (e.g., 45k, 2.4jt, 1.5M)
 * Uses Intl.NumberFormat with notation: "compact" when available,
 * falls back to manual formatting for Indonesian suffixes.
 */
export const formatCompactNumber = (
	value: number,
	lang: TLanguage = "id",
): string => {
	if (lang === "id" || lang === "jv" || lang === "bjn") {
		if (value >= 1_000_000_000) {
			return `${(value / 1_000_000_000).toFixed(1).replace(".0", "")}M`;
		}
		if (value >= 1_000_000) {
			return `${(value / 1_000_000).toFixed(1).replace(".0", "")}jt`;
		}
		if (value >= 1_000) {
			return `${(value / 1_000).toFixed(1).replace(".0", "")}rb`;
		}
		return formatNumber(value, lang);
	}

	return new Intl.NumberFormat("en-US", {
		notation: "compact",
		maximumFractionDigits: 1,
	}).format(value);
};

/**
 * Compact Currency Formatter (e.g., Rp 45rb, Rp 2.4jt, $1.5M)
 */
export const formatCompactCurrency = (
	amount: number,
	lang: TLanguage = "id",
): string => {
	const currencyMap: Record<TLanguage, { code: string; prefix: string }> = {
		id: { code: "IDR", prefix: "Rp" },
		en: { code: "USD", prefix: "$" },
		jv: { code: "IDR", prefix: "Rp" },
		bjn: { code: "IDR", prefix: "Rp" },
	};

	const { prefix } = currencyMap[lang] || currencyMap.id;

	if (lang === "id" || lang === "jv" || lang === "bjn") {
		if (amount >= 1_000_000_000) {
			return `${prefix} ${(amount / 1_000_000_000).toFixed(1).replace(".0", "")}M`;
		}
		if (amount >= 1_000_000) {
			return `${prefix} ${(amount / 1_000_000).toFixed(1).replace(".0", "")}jt`;
		}
		if (amount >= 1_000) {
			return `${prefix} ${(amount / 1_000).toFixed(1).replace(".0", "")}rb`;
		}
		return formatCurrency(amount, lang);
	}

	return new Intl.NumberFormat("en-US", {
		style: "currency",
		currency: "USD",
		notation: "compact",
		maximumFractionDigits: 1,
	}).format(amount);
};
