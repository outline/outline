import { scryptAsync } from "@noble/hashes/scrypt.js";

// N=2^15 (32768) is the OWASP-recommended minimum work factor for scrypt as
// of 2023; r=8, p=1 are the standard companion parameters. dkLen=32 (256-bit
// derived key) matches common practice for password hashes.
const SCRYPT_PARAMS = { N: 2 ** 15, r: 8, p: 1, dkLen: 32 };
const SALT_BYTES = 16;

function toHex(bytes: Uint8Array): string {
	return Array.from(bytes)
		.map((b) => b.toString(16).padStart(2, "0"))
		.join("");
}

function fromHex(hex: string): Uint8Array {
	const bytes = new Uint8Array(hex.length / 2);
	for (let i = 0; i < bytes.length; i++) {
		bytes[i] = Number.parseInt(hex.slice(i * 2, i * 2 + 2), 16);
	}
	return bytes;
}

// Constant-time comparison — avoids leaking hash-match position via timing.
function timingSafeEqual(a: Uint8Array, b: Uint8Array): boolean {
	if (a.length !== b.length) return false;
	let diff = 0;
	for (let i = 0; i < a.length; i++) {
		diff |= (a[i] ?? 0) ^ (b[i] ?? 0);
	}
	return diff === 0;
}

/**
 * Hashes a password with scrypt and a random salt.
 * Returns "saltHex:hashHex" — both fields are needed to verify later.
 */
export async function hashPassword(password: string): Promise<string> {
	const salt = crypto.getRandomValues(new Uint8Array(SALT_BYTES));
	const derived = await scryptAsync(password, salt, SCRYPT_PARAMS);
	return `${toHex(salt)}:${toHex(derived)}`;
}

/**
 * Verifies a password against a "saltHex:hashHex" string produced by
 * hashPassword. Never throws on malformed input — returns false instead,
 * since a corrupt/tampered stored hash should never crash the login flow.
 */
export async function verifyPassword(
	password: string,
	stored: string,
): Promise<boolean> {
	const [saltHex, hashHex] = stored.split(":");
	if (!saltHex || !hashHex) return false;

	const salt = fromHex(saltHex);
	const expected = fromHex(hashHex);
	const derived = await scryptAsync(password, salt, SCRYPT_PARAMS);
	return timingSafeEqual(derived, expected);
}
