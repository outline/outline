/**
 * Simple utility for managing browser cookies.
 */
export const Cookie = {
	get: (name: string): string | null => {
		if (typeof document === "undefined") return null;
		const nameEQ = `${name}=`;
		const ca = document.cookie.split(";");
		for (let i = 0; i < ca.length; i++) {
			let c = ca[i];
			if (!c) continue;
			while (c.charAt(0) === " ") c = c.substring(1, c.length);
			if (c.indexOf(nameEQ) === 0) return c.substring(nameEQ.length, c.length);
		}
		return null;
	},

	set: (name: string, value: string, days = 365): void => {
		if (typeof document === "undefined") return;
		let expires = "";
		if (days) {
			const date = new Date();
			date.setTime(date.getTime() + days * 24 * 60 * 60 * 1000);
			expires = `; expires=${date.toUTCString()}`;
		}
		document.cookie = `${name}=${value || ""}${expires}; path=/; SameSite=Lax`;
	},

	remove: (name: string): void => {
		if (typeof document === "undefined") return;
		document.cookie = `${name}=; Max-Age=-99999999; path=/;`;
	},
};
