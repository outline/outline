import { Effect, Layer, Redacted } from "effect";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { IAppConfig, type TResolvedConfig } from "@/shared/env/app.config";
import { IPaymentProvider } from "@/shared/ports/payment.port";
import { MidtransPaymentAdapterLive } from "./midtrans.adapter";

const config: TResolvedConfig = {
	publicBaseUrl: "https://petso.test",
	database: { dbUrl: "" },
	email: {
		provider: "console",
		apiKey: Redacted.make(""),
		from: "Pet Store <no-reply@example.com>",
	},
	kurir: { baseUrl: "", apiKey: Redacted.make(""), productId: "" },
	ember: {
		baseUrl: "https://ember.test",
		apiKey: Redacted.make(""),
		bucket: "pet-store",
	},
	upstash: { redisUrl: "", redisToken: "" },
	mcp: { secretToken: "", businessId: "" },
	midtrans: { clientKey: "", serverKey: "server-key", isProduction: true },
	anisAi: { apiKey: "", baseUrl: "https://api.anis.ai" },
	storage: { publicUrlBase: "" },
	session: { ttlMs: 1_000 },
	environment: "production",
};

describe("MidtransPaymentAdapterLive", () => {
	beforeEach(() => {
		vi.stubGlobal(
			"fetch",
			vi.fn().mockResolvedValue({
				ok: true,
				json: async () => ({
					token: "snap-token",
					redirect_url: "https://midtrans.test",
				}),
			}),
		);
	});

	afterEach(() => {
		vi.unstubAllGlobals();
	});

	it("uses APP_PUBLIC_URL for the absolute finish callback", async () => {
		const layer = Layer.provide(
			MidtransPaymentAdapterLive,
			Layer.succeed(IAppConfig, config),
		);

		await Effect.flatMap(IPaymentProvider, (provider) =>
			provider.createTransaction({
				orderId: "order-1",
				amount: 100_000,
				customer: { name: "Alice", email: "alice@petso.test" },
			}),
		).pipe(Effect.provide(layer), Effect.runPromise);

		const [, options] = (fetch as ReturnType<typeof vi.fn>).mock.calls[0] as [
			string,
			RequestInit,
		];
		const body: unknown = JSON.parse(String(options.body));

		expect(body).toMatchObject({
			callbacks: { finish: "https://petso.test/settings/billing" },
		});
	});
});
