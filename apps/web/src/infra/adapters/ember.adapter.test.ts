import { Effect, Layer, Redacted } from "effect";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { IAppConfig, type TResolvedConfig } from "@/shared/env/app.config";
import { IStorage, type TBucket } from "@/shared/ports/storage.port";
import { EmberStorageAdapterLive } from "./ember.adapter";

const baseConfig: TResolvedConfig = {
	publicBaseUrl: "https://app.example.com",
	database: { dbUrl: "" },
	email: {
		provider: "console",
		apiKey: Redacted.make(""),
		from: "Pet Store <no-reply@example.com>",
	},
	kurir: { baseUrl: "", apiKey: Redacted.make(""), productId: "" },
	upstash: { redisUrl: "", redisToken: "" },
	mcp: { secretToken: "", businessId: "" },
	midtrans: { clientKey: "", serverKey: "", isProduction: false },
	anisAi: { apiKey: "", baseUrl: "https://api.anis.ai" },
	storage: { publicUrlBase: "" },
	session: { ttlMs: 1000 },
	ember: {
		baseUrl: "https://ember.treonstudio.com",
		apiKey: Redacted.make("test-ember-key"),
		bucket: "pet-store",
	},
	environment: "test",
};

const runWithConfig = <A>(
	config: TResolvedConfig,
	program: Effect.Effect<A, unknown, IStorage>,
) => {
	const layer = Layer.provide(
		EmberStorageAdapterLive,
		Layer.succeed(IAppConfig, config),
	);
	return Effect.provide(program, layer).pipe(Effect.runPromise);
};

describe("EmberStorageAdapterLive — put", () => {
	beforeEach(() => {
		vi.stubGlobal("fetch", vi.fn());
	});

	afterEach(() => {
		vi.unstubAllGlobals();
	});

	it("uploads via Ember's multipart endpoint with Bearer auth and the Origin/Referer workaround", async () => {
		(fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
			ok: true,
			status: 201,
			json: async () => ({
				data: {
					key: "org-1/pet-photos/tenant-1/pet-1/photo.jpg",
					bucket: "pet-store",
					url: "https://ember.treonstudio.com/o/org-1/pet-photos/tenant-1/pet-1/photo.jpg",
					size: 3,
					checksum: "abc",
					content_type: "image/jpeg",
					uploaded_at: "2026-07-22T00:00:00.000Z",
				},
			}),
		});

		const result = await runWithConfig(
			baseConfig,
			Effect.flatMap(IStorage, (s) =>
				s.put({
					bucket: "pet-photos",
					key: "tenant-1/pet-1/photo.jpg",
					body: new Uint8Array([1, 2, 3]),
					contentType: "image/jpeg",
				}),
			),
		);

		expect(result.url).toBe(
			"https://ember.treonstudio.com/o/org-1/pet-photos/tenant-1/pet-1/photo.jpg",
		);

		expect(fetch).toHaveBeenCalledTimes(1);
		const [url, options] = (fetch as ReturnType<typeof vi.fn>).mock
			.calls[0] as [string, RequestInit];
		expect(url).toBe(
			"https://ember.treonstudio.com/api/v1/buckets/pet-store/objects/upload",
		);
		expect(options.method).toBe("POST");
		const headers = options.headers as Record<string, string>;
		expect(headers.Authorization).toBe("Bearer test-ember-key");
		expect(headers.Origin).toBe("https://ember.treonstudio.com");
		expect(headers.Referer).toBe("https://ember.treonstudio.com/");

		const body = options.body as FormData;
		expect(body.get("key")).toBe("pet-photos/tenant-1/pet-1/photo.jpg");
		expect(body.get("file")).toBeInstanceOf(Blob);
	});

	it("rejects an unknown bucket without calling fetch", async () => {
		await expect(
			runWithConfig(
				baseConfig,
				Effect.flatMap(IStorage, (s) =>
					s.put({
						bucket: "unknown" as TBucket,
						key: "x.jpg",
						body: new Uint8Array(),
						contentType: "image/jpeg",
					}),
				),
			),
		).rejects.toThrow();
		expect(fetch).not.toHaveBeenCalled();
	});

	it("rejects a path-traversal key without calling fetch", async () => {
		await expect(
			runWithConfig(
				baseConfig,
				Effect.flatMap(IStorage, (s) =>
					s.put({
						bucket: "pet-photos",
						key: "../other-tenant/secret.jpg",
						body: new Uint8Array(),
						contentType: "image/jpeg",
					}),
				),
			),
		).rejects.toThrow();
		expect(fetch).not.toHaveBeenCalled();
	});

	it("fails when EMBER_API_KEY is not configured", async () => {
		await expect(
			runWithConfig(
				{
					...baseConfig,
					ember: { ...baseConfig.ember, apiKey: Redacted.make("") },
				},
				Effect.flatMap(IStorage, (s) =>
					s.put({
						bucket: "pet-photos",
						key: "tenant-1/pet-1/photo.jpg",
						body: new Uint8Array([1]),
						contentType: "image/jpeg",
					}),
				),
			),
		).rejects.toThrow();
		expect(fetch).not.toHaveBeenCalled();
	});

	it("fails the effect when Ember responds with a non-ok status", async () => {
		(fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
			ok: false,
			status: 415,
		});

		await expect(
			runWithConfig(
				baseConfig,
				Effect.flatMap(IStorage, (s) =>
					s.put({
						bucket: "pet-photos",
						key: "tenant-1/pet-1/photo.jpg",
						body: new Uint8Array([1]),
						contentType: "image/jpeg",
					}),
				),
			),
		).rejects.toThrow();
	});
});

describe("EmberStorageAdapterLive — delete", () => {
	beforeEach(() => {
		vi.stubGlobal("fetch", vi.fn());
	});

	afterEach(() => {
		vi.unstubAllGlobals();
	});

	it("deletes via Ember's DELETE endpoint with the Origin/Referer workaround", async () => {
		(fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
			ok: true,
			status: 200,
		});

		await runWithConfig(
			baseConfig,
			Effect.flatMap(IStorage, (s) =>
				s.delete("pet-photos", "tenant-1/pet-1/photo.jpg"),
			),
		);

		expect(fetch).toHaveBeenCalledTimes(1);
		const [, options] = (fetch as ReturnType<typeof vi.fn>).mock.calls[0] as [
			string,
			RequestInit,
		];
		expect(options.method).toBe("DELETE");
		const headers = options.headers as Record<string, string>;
		expect(headers.Origin).toBe("https://ember.treonstudio.com");
	});

	it("treats a 404 on delete as success (Ember's nested-key routing limitation)", async () => {
		(fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
			ok: false,
			status: 404,
		});

		await expect(
			runWithConfig(
				baseConfig,
				Effect.flatMap(IStorage, (s) =>
					s.delete("pet-photos", "tenant-1/pet-1/photo.jpg"),
				),
			),
		).resolves.toBeUndefined();
	});

	it("fails the effect on a non-404 error status", async () => {
		(fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
			ok: false,
			status: 500,
		});

		await expect(
			runWithConfig(
				baseConfig,
				Effect.flatMap(IStorage, (s) =>
					s.delete("pet-photos", "tenant-1/pet-1/photo.jpg"),
				),
			),
		).rejects.toThrow();
	});
});
