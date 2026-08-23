/**
 * Pure FP date utilities for common operations in the app.
 */
export const DateUtils = {
	now: () => new Date(),

	formatISO: (date: Date = new Date()) => date.toISOString(),

	/**
	 * Returns date part only (YYYY-MM-DD)
	 */
	toShortDate: (date: Date | string | number = new Date()) => {
		const d = new Date(date);
		if (Number.isNaN(d.getTime())) return "";
		return d.toISOString().split("T")[0] || "";
	},

	startOfDay: (date: Date = new Date()) => {
		const d = new Date(date);
		d.setHours(0, 0, 0, 0);
		return d;
	},

	endOfDay: (date: Date = new Date()) => {
		const d = new Date(date);
		d.setHours(23, 59, 59, 999);
		return d;
	},

	startOfMonth: (date: Date = new Date()) => {
		const d = new Date(date);
		return new Date(d.getFullYear(), d.getMonth(), 1);
	},

	endOfMonth: (date: Date = new Date()) => {
		const d = new Date(date);
		return new Date(d.getFullYear(), d.getMonth() + 1, 0);
	},

	addDays: (date: Date | string | number, days: number) => {
		const d = new Date(date);
		d.setDate(d.getDate() + days);
		return d;
	},

	isPast: (date: Date | string | number) => {
		return new Date(date).getTime() < Date.now();
	},

	isFuture: (date: Date | string | number) => {
		return new Date(date).getTime() > Date.now();
	},
} as const;
