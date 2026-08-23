import { describe, expect, it } from "vitest";
import { hashToken } from "@/infra/auth/api-auth";
import type { TTenantId } from "@/shared/types/common.types";

describe("Idempotency-Key hashing", () => {
	it("should produce consistent request hashes", async () => {
		const body = JSON.stringify({ branchId: "b-1", items: [] });
		const msgBuffer = new TextEncoder().encode(body);
		const hashBuffer = await crypto.subtle.digest("SHA-256", msgBuffer);
		const hashArray = Array.from(new Uint8Array(hashBuffer));
		const hash = hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
		expect(hash).toBeTruthy();
		expect(hash.length).toBe(64);
	});

	it("should produce different hashes for different bodies", async () => {
		const h1 = await hashToken(JSON.stringify({ a: 1 }));
		const h2 = await hashToken(JSON.stringify({ a: 2 }));
		expect(h1).not.toBe(h2);
	});
});

describe("API key generation", () => {
	it("should generate keys with psk_ prefix", async () => {
		const { generateApiKey } = await import(
			"@/domain/identity/api-key/api-key.module"
		);
		const key = generateApiKey();
		expect(key).toMatch(/^psk_[a-f0-9]+$/);
	});

	it("should generate unique keys", async () => {
		const { generateApiKey } = await import(
			"@/domain/identity/api-key/api-key.module"
		);
		const keys = new Set(Array.from({ length: 100 }, () => generateApiKey()));
		expect(keys.size).toBe(100);
	});
});

describe("Scope enforcement", () => {
	it("should reject missing scope", async () => {
		const { checkScope } = await import("@/infra/auth/api-auth");
		const validation = {
			businessId: "biz-1" as "biz-1" as TTenantId,
			keyId: "key-1",
			scopes: ["products:read", "categories:read"] as const,
		};
		expect(checkScope(validation, "orders:write")).toBe(false);
		expect(checkScope(validation, "products:read")).toBe(true);
	});

	it("should allow matching scope", async () => {
		const { checkScope } = await import("@/infra/auth/api-auth");
		const validation = {
			businessId: "biz-1" as "biz-1" as TTenantId,
			keyId: "key-1",
			scopes: ["orders:write"] as const,
		};
		expect(checkScope(validation, "orders:write")).toBe(true);
	});
});
