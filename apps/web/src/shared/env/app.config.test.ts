import { Redacted } from "effect";
import { describe, expect, it } from "vitest";
import { getProductionConfigIssues, type TResolvedConfig } from "./app.config";

const productionConfig = (): TResolvedConfig => ({
	publicBaseUrl: "https://petso.test",
	database: { dbUrl: "postgres://database.test/petso" },
	email: {
		provider: "resend",
		apiKey: Redacted.make("email-key"),
		from: "Petso <hello@petso.test>",
	},
	kurir: {
		baseUrl: "https://kurir.test",
		apiKey: Redacted.make(""),
		productId: "",
	},
	ember: {
		baseUrl: "https://ember.test",
		apiKey: Redacted.make("ember-key"),
		bucket: "pet-store",
	},
	upstash: { redisUrl: "", redisToken: "" },
	mcp: { secretToken: "", businessId: "" },
	midtrans: {
		clientKey: "",
		serverKey: "midtrans-key",
		isProduction: true,
	},
	anisAi: { apiKey: "", baseUrl: "https://api.anis.ai" },
	storage: { publicUrlBase: "" },
	session: { ttlMs: 2_592_000_000 },
	environment: "production",
});

describe("production config preflight", () => {
	it("accepts complete production configuration", () => {
		expect(getProductionConfigIssues(productionConfig())).toEqual([]);
	});

	it("reports missing core services and invalid production email", () => {
		const config = productionConfig();
		const issues = getProductionConfigIssues({
			...config,
			publicBaseUrl: "http://localhost:3000",
			database: { dbUrl: "" },
			email: { ...config.email, provider: "console" },
			ember: { ...config.ember, apiKey: Redacted.make("") },
			midtrans: { ...config.midtrans, serverKey: "" },
			upstash: { redisUrl: "https://redis.test", redisToken: "" },
		});

		expect(issues).toEqual([
			"APP_PUBLIC_URL must be an absolute HTTPS URL",
			"DATABASE_URL is required",
			"EMAIL_PROVIDER=console is not permitted",
			"EMBER_API_KEY is required",
			"MIDTRANS_SERVER_KEY is required",
			"UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN must be configured together",
		]);
	});

	it("rejects Midtrans sandbox mode in production", () => {
		const config = productionConfig();

		expect(
			getProductionConfigIssues({
				...config,
				midtrans: { ...config.midtrans, isProduction: false },
			}),
		).toContain("MIDTRANS_IS_PRODUCTION must be true in production");
	});

	it("does not enforce production services during development", () => {
		const config = productionConfig();
		expect(
			getProductionConfigIssues({
				...config,
				environment: "development",
				database: { dbUrl: "" },
			}),
		).toEqual([]);
	});
});
