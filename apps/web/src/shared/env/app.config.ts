import { Config, Context, Effect, Layer, Redacted } from "effect";

/**
 * Server-only environment variable accessor.
 * Resolves from the Worker `env` binding or process.env — NEVER from
 * import.meta.env (client-side). Use this for secrets that must not
 * leak to the client bundle.
 */
const readFromGlobalEnv = (name: string): string | undefined => {
	if (typeof process !== "undefined" && process.env?.[name]) {
		return process.env[name];
	}
	const globalEnv = (globalThis as { __env__?: Record<string, unknown> })
		.__env__;
	if (globalEnv && typeof globalEnv === "object") {
		const v = globalEnv[name];
		if (typeof v === "string" && v !== "") {
			return v;
		}
	}
	const g = globalThis as Record<string, unknown>;
	if (typeof g[name] === "string" && g[name] !== "") {
		return g[name] as string;
	}
	return undefined;
};

/**
 * Binds the Cloudflare Worker environment for server-side config resolution.
 *
 * @param workerEnv the environment object provided to the Worker fetch handler.
 */
export const bindWorkerEnv = (workerEnv: unknown): void => {
	if (typeof workerEnv !== "object" || workerEnv === null) {
		return;
	}

	const runtimeGlobal = globalThis as typeof globalThis & {
		__env__?: Record<string, unknown>;
	};
	runtimeGlobal.__env__ = workerEnv as Record<string, unknown>;
};

const serverEnv = (name: string): Config.Config<string> => {
	let config = Config.string(name);
	config = config.pipe(
		Config.orElse(() => {
			const v = readFromGlobalEnv(name);
			return v !== undefined
				? Config.succeed(v)
				: Config.fail(`Missing server env var: ${name}`);
		}),
	);
	config = config.pipe(Config.orElse(() => Config.string(name)));
	return config;
};

/**
 * Hybrid environment variable accessor (client-safe only).
 * Checks (in order):
 *   1. globalThis.__env__ (Nitro's Cloudflare Workers shim).
 *   2. process.env (Node.js dev / local).
 *   3. import.meta.env (Vite client-side).
 *
 * IMPORTANT: Never prefix secrets with VITE_. Only non-sensitive
 * config (public URLs, client keys) should go through this accessor.
 */
const readFromGlobalEnvImported = (name: string): string | undefined => {
	const globalEnv = (globalThis as { __env__?: Record<string, unknown> })
		.__env__;
	if (globalEnv && typeof globalEnv === "object") {
		const v = globalEnv[name] ?? globalEnv[`VITE_${name}`];
		if (typeof v === "string") {
			return v;
		}
	}
	return undefined;
};

const env = (name: string, defaultValue?: string): Config.Config<string> => {
	let config = Config.string(name);

	if (!name.startsWith("VITE_")) {
		config = config.pipe(Config.orElse(() => Config.string(`VITE_${name}`)));
	}

	config = config.pipe(
		Config.orElse(() => {
			const v = readFromGlobalEnvImported(name);
			return v !== undefined
				? Config.succeed(v)
				: Config.fail(`Missing env var: ${name}`);
		}),
	);

	return config.pipe(
		Config.orElse(() => {
			const envs = (import.meta as unknown as { env: Record<string, string> })
				.env;
			const viteEnv = envs?.[name] || envs?.[`VITE_${name}`];
			return viteEnv
				? Config.succeed(viteEnv)
				: Config.fail(`Missing env var: ${name}`);
		}),
		defaultValue !== undefined ? Config.withDefault(defaultValue) : (c) => c,
	) as Config.Config<string>;
};

/**
 * Server-only configuration type and resolver.
 * These values are ONLY available on the server side, never in client bundles.
 */
export type TServerEnv = {
	readonly mcpSecretToken: string;
	readonly mcpBusinessId: string;
};

export const getServerEnv = (workerEnv: unknown): TServerEnv => {
	const envRecord = workerEnv as Record<string, string | undefined>;
	return {
		mcpSecretToken:
			envRecord?.MCP_SECRET_TOKEN ??
			readFromGlobalEnv("MCP_SECRET_TOKEN") ??
			"",
		mcpBusinessId:
			envRecord?.MCP_BUSINESS_ID ?? readFromGlobalEnv("MCP_BUSINESS_ID") ?? "",
	};
};

/**
 * 12-Factor App Configuration (Principle III: Config)
 *
 * Client-safe config — no VITE_ secrets here.
 * Server-only secrets are resolved via getServerEnv() from the Worker env binding.
 */
export const AppConfig = {
	publicBaseUrl: env("APP_PUBLIC_URL", "http://localhost:3000"),
	database: {
		dbUrl: serverEnv("DATABASE_URL").pipe(Config.withDefault("")),
	},
	email: {
		provider: Config.literal(
			"console",
			"resend",
			"ses",
			"kurir",
		)("EMAIL_PROVIDER").pipe(Config.withDefault("console")),
		apiKey: Config.redacted(
			serverEnv("EMAIL_API_KEY").pipe(Config.withDefault("")),
		),
		from: env("EMAIL_FROM", "Pet Store <no-reply@example.com>"),
	},
	kurir: {
		baseUrl: env("KURIR_BASE_URL", "https://api-kurir.treonstudio.workers.dev"),
		apiKey: Config.redacted(
			serverEnv("KURIR_API_KEY").pipe(Config.withDefault("")),
		),
		productId: env("KURIR_PRODUCT_ID", ""),
	},
	ember: {
		baseUrl: env("EMBER_BASE_URL", "https://ember.treonstudio.com"),
		apiKey: Config.redacted(
			serverEnv("EMBER_API_KEY").pipe(Config.withDefault("")),
		),
		bucket: env("EMBER_BUCKET", "pet-store"),
	},
	upstash: {
		redisUrl: serverEnv("UPSTASH_REDIS_REST_URL").pipe(Config.withDefault("")),
		redisToken: serverEnv("UPSTASH_REDIS_REST_TOKEN").pipe(
			Config.withDefault(""),
		),
	},
	mcp: {
		secretToken: serverEnv("MCP_SECRET_TOKEN").pipe(
			Config.withDefault(""),
		) as Config.Config<string>,
		businessId: serverEnv("MCP_BUSINESS_ID").pipe(
			Config.withDefault(""),
		) as Config.Config<string>,
	},
	midtrans: {
		clientKey: env("VITE_MIDTRANS_CLIENT_KEY", ""),
		serverKey: serverEnv("MIDTRANS_SERVER_KEY").pipe(Config.withDefault("")),
		isProduction: Config.boolean("VITE_MIDTRANS_IS_PRODUCTION").pipe(
			Config.orElse(() => Config.boolean("MIDTRANS_IS_PRODUCTION")),
			Config.withDefault(false),
		),
	},
	anisAi: {
		apiKey: serverEnv("ANIS_AI_API_KEY").pipe(Config.withDefault("")),
		baseUrl: env("ANIS_AI_BASE_URL", "https://api.anis.ai"),
	},
	storage: {
		publicUrlBase: env("STORAGE_PUBLIC_URL_BASE", ""),
	},
	session: {
		ttlMs: Config.integer("SESSION_TTL_MS").pipe(
			Config.withDefault(30 * 24 * 60 * 60 * 1000),
		),
	},
	environment: env("NODE_ENV", "development"),
} as const;

export type TResolvedConfig = {
	readonly publicBaseUrl: string;
	readonly database: {
		readonly dbUrl: string;
	};
	readonly email: {
		readonly provider: "console" | "resend" | "ses" | "kurir";
		readonly apiKey: Redacted.Redacted<string>;
		readonly from: string;
	};
	readonly kurir: {
		readonly baseUrl: string;
		readonly apiKey: Redacted.Redacted<string>;
		readonly productId: string;
	};
	readonly ember: {
		readonly baseUrl: string;
		readonly apiKey: Redacted.Redacted<string>;
		readonly bucket: string;
	};
	readonly upstash: {
		readonly redisUrl: string;
		readonly redisToken: string;
	};
	readonly mcp: {
		readonly secretToken: string;
		readonly businessId: string;
	};
	readonly midtrans: {
		readonly clientKey: string;
		readonly serverKey: string;
		readonly isProduction: boolean;
	};
	readonly anisAi: {
		readonly apiKey: string;
		readonly baseUrl: string;
	};
	readonly storage: {
		readonly publicUrlBase: string;
	};
	readonly session: {
		readonly ttlMs: number;
	};
	readonly environment: string;
};

/**
 * Lists configuration problems that would make the production API incomplete.
 *
 * @param config the resolved server configuration.
 * @returns production readiness issues, or an empty list when ready.
 */
export function getProductionConfigIssues(
	config: TResolvedConfig,
): readonly string[] {
	if (config.environment !== "production") {
		return [];
	}

	const issues: string[] = [];
	try {
		const publicUrl = new URL(config.publicBaseUrl);
		if (publicUrl.protocol !== "https:" || publicUrl.hostname === "localhost") {
			issues.push("APP_PUBLIC_URL must be an absolute HTTPS URL");
		}
	} catch {
		issues.push("APP_PUBLIC_URL must be an absolute HTTPS URL");
	}

	if (!config.database.dbUrl) {
		issues.push("DATABASE_URL is required");
	}
	if (config.email.provider === "console") {
		issues.push("EMAIL_PROVIDER=console is not permitted");
	} else if (config.email.provider === "resend") {
		if (!Redacted.value(config.email.apiKey)) {
			issues.push("EMAIL_API_KEY is required for EMAIL_PROVIDER=resend");
		}
	} else if (config.email.provider === "kurir") {
		if (!Redacted.value(config.kurir.apiKey)) {
			issues.push("KURIR_API_KEY is required for EMAIL_PROVIDER=kurir");
		}
		if (!config.kurir.productId) {
			issues.push("KURIR_PRODUCT_ID is required for EMAIL_PROVIDER=kurir");
		}
	} else {
		issues.push("EMAIL_PROVIDER=ses is not supported");
	}
	if (!Redacted.value(config.ember.apiKey)) {
		issues.push("EMBER_API_KEY is required");
	}
	if (!config.midtrans.serverKey) {
		issues.push("MIDTRANS_SERVER_KEY is required");
	}
	if (!config.midtrans.isProduction) {
		issues.push("MIDTRANS_IS_PRODUCTION must be true in production");
	}
	if (Boolean(config.upstash.redisUrl) !== Boolean(config.upstash.redisToken)) {
		issues.push(
			"UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN must be configured together",
		);
	}

	return issues;
}

export class IAppConfig extends Context.Tag("IAppConfig")<
	IAppConfig,
	TResolvedConfig
>() {}

export const AppConfigLive = Layer.effect(
	IAppConfig,
	Effect.all({
		publicBaseUrl: AppConfig.publicBaseUrl,
		database: Effect.all({
			dbUrl: AppConfig.database.dbUrl,
		}),
		email: Effect.all({
			provider: AppConfig.email.provider,
			apiKey: AppConfig.email.apiKey,
			from: AppConfig.email.from,
		}),
		kurir: Effect.all({
			baseUrl: AppConfig.kurir.baseUrl,
			apiKey: AppConfig.kurir.apiKey,
			productId: AppConfig.kurir.productId,
		}),
		ember: Effect.all({
			baseUrl: AppConfig.ember.baseUrl,
			apiKey: AppConfig.ember.apiKey,
			bucket: AppConfig.ember.bucket,
		}),
		upstash: Effect.all({
			redisUrl: AppConfig.upstash.redisUrl,
			redisToken: AppConfig.upstash.redisToken,
		}),
		mcp: Effect.all({
			secretToken: AppConfig.mcp.secretToken,
			businessId: AppConfig.mcp.businessId,
		}),
		midtrans: Effect.all({
			clientKey: AppConfig.midtrans.clientKey,
			serverKey: AppConfig.midtrans.serverKey,
			isProduction: AppConfig.midtrans.isProduction,
		}),
		anisAi: Effect.all({
			apiKey: AppConfig.anisAi.apiKey,
			baseUrl: AppConfig.anisAi.baseUrl,
		}),
		storage: Effect.all({
			publicUrlBase: AppConfig.storage.publicUrlBase,
		}),
		session: Effect.all({
			ttlMs: AppConfig.session.ttlMs,
		}),
		environment: AppConfig.environment,
	}).pipe(Effect.map((config) => IAppConfig.of(config))),
);

/**
 * Synchronously resolves the application config.
 * Use this only for initialization of external libraries that don't support Effect.
 */
export const getResolvedConfig = () =>
	Effect.runSync(Effect.provide(IAppConfig, AppConfigLive));
