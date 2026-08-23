/**
 * Pure FP string utilities
 */
export const StringUtils = {
	/**
	 * Strips HTML tags from a string and cleans up whitespace
	 */
	stripHtml: (html: string): string => {
		if (!html) return "";
		return html
			.replace(/<\/(p|div|li|h[1-6])>/gi, " ")
			.replace(/<br\s*\/?>/gi, " ")
			.replace(/<[^>]*>?/gm, "")
			.replace(/\s+/g, " ")
			.trim();
	},

	/**
	 * Truncates a string to a specific length with ellipsis
	 */
	truncate: (str: string, length: number): string => {
		if (str.length <= length) return str;
		return `${str.slice(0, length)}...`;
	},

	/**
	 * Capitalizes the first letter of a string
	 */
	capitalize: (str: string): string => {
		if (!str) return "";
		return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
	},
};
