/**
 * Case- and whitespace-insensitive email identity: always compare/store
 * lowercased and trimmed, so "Owner@Shop.com" and "owner@shop.com " resolve
 * to the same account. Must be replicated explicitly in the DIY auth system.
 */
export function normalizeEmail(email: string): string {
	return email.trim().toLowerCase();
}
