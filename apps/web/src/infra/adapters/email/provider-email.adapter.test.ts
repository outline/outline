import { Effect, Layer, Redacted } from "effect";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { IAppConfig, type TResolvedConfig } from "@/shared/env/app.config";
import { IEmailPort } from "@/shared/ports/email.port";
import { ProviderEmailAdapterLive } from "./provider-email.adapter";

const baseConfig: TResolvedConfig = {
	publicBaseUrl: "https://app.example.com",
	database: { dbUrl: "" },
	email: {
		provider: "kurir",
		apiKey: Redacted.make(""),
		from: "Pet Store <no-reply@example.com>",
	},
	kurir: {
		baseUrl: "https://api-kurir.treonstudio.workers.dev",
		apiKey: Redacted.make("live_test-key"),
		productId: "prod-test-123",
	},
	ember: {
		baseUrl: "https://ember.treonstudio.com",
		apiKey: Redacted.make(""),
		bucket: "pet-store",
	},
	upstash: { redisUrl: "", redisToken: "" },
	mcp: { secretToken: "", businessId: "" },
	midtrans: { clientKey: "", serverKey: "", isProduction: false },
	anisAi: { apiKey: "", baseUrl: "https://api.anis.ai" },
	storage: { publicUrlBase: "" },
	session: { ttlMs: 1000 },
	environment: "test",
};

const runWithConfig = (config: TResolvedConfig) => {
	const layer = Layer.provide(
		ProviderEmailAdapterLive,
		Layer.succeed(IAppConfig, config),
	);
	return Effect.gen(function* () {
		const port = yield* IEmailPort;
		return yield* port.sendEmail({
			to: "user@example.com",
			subject: "Reset Password",
			text: "Click here",
			html: "<p>Click here</p>",
		});
	}).pipe(Effect.provide(layer), Effect.runPromise);
};

describe("ProviderEmailAdapterLive — kurir provider", () => {
	beforeEach(() => {
		vi.stubGlobal("fetch", vi.fn());
	});

	afterEach(() => {
		vi.unstubAllGlobals();
	});

	it("posts to kurir's /v1/emails with the productId, Bearer key, and an Idempotency-Key", async () => {
		(fetch as ReturnType<typeof vi.fn>).mockResolvedValue({ ok: true });

		await runWithConfig(baseConfig);

		expect(fetch).toHaveBeenCalledTimes(1);
		const [url, options] = (fetch as ReturnType<typeof vi.fn>).mock
			.calls[0] as [string, RequestInit];
		expect(url).toBe("https://api-kurir.treonstudio.workers.dev/v1/emails");
		expect(options.method).toBe("POST");
		expect((options.headers as Record<string, string>).Authorization).toBe(
			"Bearer live_test-key",
		);
		expect(
			(options.headers as Record<string, string>)["Idempotency-Key"],
		).toBeTruthy();
		const body = JSON.parse(options.body as string);
		expect(body).toEqual({
			productId: "prod-test-123",
			to: "user@example.com",
			subject: "Reset Password",
			html: "<p>Click here</p>",
		});
	});

	it("fails the effect when KURIR_API_KEY is missing", async () => {
		(fetch as ReturnType<typeof vi.fn>).mockResolvedValue({ ok: true });

		await expect(
			runWithConfig({
				...baseConfig,
				kurir: { ...baseConfig.kurir, apiKey: Redacted.make("") },
			}),
		).rejects.toThrow();
		expect(fetch).not.toHaveBeenCalled();
	});

	it("fails the effect when KURIR_PRODUCT_ID is missing", async () => {
		(fetch as ReturnType<typeof vi.fn>).mockResolvedValue({ ok: true });

		await expect(
			runWithConfig({
				...baseConfig,
				kurir: { ...baseConfig.kurir, productId: "" },
			}),
		).rejects.toThrow();
		expect(fetch).not.toHaveBeenCalled();
	});

	it("fails the effect when kurir responds with a non-ok status", async () => {
		(fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
			ok: false,
			status: 403,
		});

		await expect(runWithConfig(baseConfig)).rejects.toThrow();
	});

	it("passes the payload's idempotencyKey as the Idempotency-Key header when provided", async () => {
		(fetch as ReturnType<typeof vi.fn>).mockResolvedValue({ ok: true });

		const layer = Layer.provide(
			ProviderEmailAdapterLive,
			Layer.succeed(IAppConfig, baseConfig),
		);
		await Effect.gen(function* () {
			const port = yield* IEmailPort;
			return yield* port.sendEmail({
				to: "user@example.com",
				subject: "Test",
				text: "Body",
				idempotencyKey: "my-custom-key-123",
			});
		}).pipe(Effect.provide(layer), Effect.runPromise);

		expect(fetch).toHaveBeenCalledTimes(1);
		const [, options] = (fetch as ReturnType<typeof vi.fn>).mock.calls[0] as [
			string,
			RequestInit,
		];
		expect((options.headers as Record<string, string>)["Idempotency-Key"]).toBe(
			"my-custom-key-123",
		);
	});

	it("falls back to a random Idempotency-Key when the payload doesn't provide one", async () => {
		(fetch as ReturnType<typeof vi.fn>).mockResolvedValue({ ok: true });

		await runWithConfig(baseConfig);

		expect(fetch).toHaveBeenCalledTimes(1);
		const [, options] = (fetch as ReturnType<typeof vi.fn>).mock.calls[0] as [
			string,
			RequestInit,
		];
		expect(
			(options.headers as Record<string, string>)["Idempotency-Key"],
		).toBeTruthy();
	});

	it("treats a 422 suppression response as success, not a thrown error", async () => {
		(fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
			ok: false,
			status: 422,
		});

		await expect(runWithConfig(baseConfig)).resolves.toBeUndefined();
	});

	it("retries a transient failure (500) up to 3 total attempts before failing", async () => {
		(fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
			ok: false,
			status: 500,
		});

		await expect(runWithConfig(baseConfig)).rejects.toThrow();
		expect(fetch).toHaveBeenCalledTimes(3);
	});

	it("does not retry a 403 (non-transient) failure", async () => {
		(fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
			ok: false,
			status: 403,
		});

		await expect(runWithConfig(baseConfig)).rejects.toThrow();
		expect(fetch).toHaveBeenCalledTimes(1);
	});

	it("REGRESSION: a non-transient failure stays a catchable failure, not an uncaught defect", async () => {
		// Domain programs (boarding/staff/password-reset) wrap sendEmail in
		// `.pipe(Effect.catchAll(() => Effect.void))` so an email failure never
		// blocks the triggering business operation. Effect.catchAll only
		// catches the normal failure channel - if the adapter ever converts a
		// non-transient error to an Effect.die defect (to stop it being
		// retried), catchAll silently fails to catch it and the whole calling
		// program crashes instead of degrading gracefully.
		(fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
			ok: false,
			status: 403,
		});

		const layer = Layer.provide(
			ProviderEmailAdapterLive,
			Layer.succeed(IAppConfig, baseConfig),
		);

		const survived = await Effect.gen(function* () {
			const port = yield* IEmailPort;
			yield* port
				.sendEmail({
					to: "user@example.com",
					subject: "Reset Password",
					text: "Click here",
					html: "<p>Click here</p>",
				})
				.pipe(Effect.catchAll(() => Effect.void));
			return "SURVIVED";
		}).pipe(Effect.provide(layer), Effect.runPromise);

		expect(survived).toBe("SURVIVED");
	});
});
