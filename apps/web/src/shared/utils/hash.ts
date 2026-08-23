export const hashToken = async (token: string): Promise<string> => {
	const msgBuffer = new TextEncoder().encode(token);
	const hashBuffer = await crypto.subtle.digest("SHA-256", msgBuffer);
	const hashArray = Array.from(new Uint8Array(hashBuffer));
	return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
};
