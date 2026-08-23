import { Effect, Layer, Redacted, Schedule } from "effect";
import { IAppConfig } from "@/shared/env/app.config";
import {
	IEmailPort,
	type TEmailPayload,
	TEmailSendError,
} from "@/shared/ports/email.port";

class NonTransientError extends Error {
	readonly _tag = "NonTransientError";
	constructor(message: string) {
		super(message);
		this.name = "NonTransientError";
	}
}

const sendConsoleEmail = (payload: TEmailPayload): void => {
	console.log("[Email] To:", payload.to);
	console.log("[Email] Subject:", payload.subject);
	console.log("[Email] Body:", payload.text);
	if (payload.html) {
		console.log(`[Email] HTML: ${payload.html.slice(0, 200)}...`);
	}
};

const sendResendEmail = async (
	payload: TEmailPayload,
	apiKey: string,
	from: string,
): Promise<void> => {
	if (!apiKey) {
		throw new Error("EMAIL_API_KEY is required for EMAIL_PROVIDER=resend");
	}

	const response = await fetch("https://api.resend.com/emails", {
		method: "POST",
		headers: {
			Authorization: `Bearer ${apiKey}`,
			"Content-Type": "application/json",
		},
		body: JSON.stringify({
			from,
			to: payload.to,
			subject: payload.subject,
			text: payload.text,
			html: payload.html,
		}),
	});

	if (!response.ok) {
		throw new Error(
			`Resend email request failed with status ${response.status}`,
		);
	}
};

const escapeHtml = (value: string): string =>
	value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

const sendKurirEmail = async (
	payload: TEmailPayload,
	apiKey: string,
	baseUrl: string,
	productId: string,
): Promise<void> => {
	if (!apiKey) {
		throw new NonTransientError(
			"KURIR_API_KEY is required for EMAIL_PROVIDER=kurir",
		);
	}
	if (!productId) {
		throw new NonTransientError(
			"KURIR_PRODUCT_ID is required for EMAIL_PROVIDER=kurir",
		);
	}

	if (!payload.to) {
		console.log("[Email Kurir] Skipping send: no recipient email");
		return;
	}

	const response = await fetch(`${baseUrl.replace(/\/+$/, "")}/v1/emails`, {
		method: "POST",
		headers: {
			Authorization: `Bearer ${apiKey}`,
			"Content-Type": "application/json",
			// A stable, event-derived key (when the caller provides one) makes
			// a retried Effect idempotent at kurir's side; falling back to a
			// fresh UUID preserves today's behavior for callers that don't.
			"Idempotency-Key": payload.idempotencyKey ?? crypto.randomUUID(),
		},
		body: JSON.stringify({
			productId,
			to: payload.to,
			subject: payload.subject,
			// kurir requires html; TEmailPayload only guarantees text, so
			// synthesize a minimal html body when the caller didn't supply one.
			html: payload.html ?? `<p>${escapeHtml(payload.text)}</p>`,
		}),
	});

	if (response.ok) return;

	// kurir rejects with 422 when the recipient is on its suppression list
	// (previous bounce/complaint) - this is kurir's own delivery policy
	// working as intended, not a failure on our side. Retrying it would be
	// pointless and noisy, so it resolves normally instead of throwing.
	if (response.status === 422) return;

	// Server errors (5xx) are transient - they'll be retried by the
	// Effect-level retry policy. Client errors (4xx except 422) are
	// non-transient and must not be retried.
	if (response.status >= 500) {
		throw new Error(
			`Kurir email request failed with status ${response.status}`,
		);
	}

	throw new NonTransientError(
		`Kurir email request failed with status ${response.status}`,
	);
};

export const ProviderEmailAdapterLive = Layer.effect(
	IEmailPort,
	Effect.gen(function* () {
		const config = yield* IAppConfig;

		return IEmailPort.of({
			sendEmail: (payload) => {
				if (config.email.provider === "console") {
					if (config.environment === "production") {
						return Effect.fail(
							new TEmailSendError({
								cause: new Error(
									"EMAIL_PROVIDER=console is not permitted in production",
								),
							}),
						);
					}

					return Effect.tryPromise({
						try: async () => {
							sendConsoleEmail(payload);
						},
						catch: (cause) => new TEmailSendError({ cause }),
					});
				}

				if (config.email.provider === "resend") {
					return Effect.tryPromise({
						try: async () => {
							await sendResendEmail(
								payload,
								Redacted.value(config.email.apiKey),
								config.email.from,
							);
						},
						catch: (cause) => new TEmailSendError({ cause }),
					});
				}

				if (config.email.provider === "kurir") {
					const attempt = Effect.tryPromise({
						try: () =>
							sendKurirEmail(
								payload,
								Redacted.value(config.kurir.apiKey),
								config.kurir.baseUrl,
								config.kurir.productId,
							),
						catch: (cause) => new TEmailSendError({ cause }),
					});

					// 2 retries (3 total attempts) with 300ms base exponential
					// backoff, but only while the failure is transient (its cause
					// is not a NonTransientError) - bad API key, missing product,
					// and non-422 4xx responses are never worth retrying.
					//
					// This stays entirely in the normal failure channel (E) on
					// purpose: an earlier version of this code converted
					// non-transient failures to Effect.die defects to stop the
					// retry, but defects bypass Effect.catchAll entirely, so a
					// domain caller's `.pipe(Effect.catchAll(() => Effect.void))`
					// (used to keep email failures from ever blocking the
					// triggering boarding/staff/password-reset operation) would
					// not catch them and the whole operation would crash instead.
					// Schedule.recurWhile keeps the failure a normal, catchable
					// TEmailSendError while still refusing to retry it.
					const retryWhileTransient = Schedule.recurWhile(
						(error: TEmailSendError) =>
							!(error.cause instanceof NonTransientError),
					);
					const policy = Schedule.intersect(
						Schedule.intersect(
							Schedule.exponential("300 millis"),
							Schedule.recurs(2),
						),
						retryWhileTransient,
					);
					return Effect.retry(attempt, policy);
				}

				return Effect.fail(
					new TEmailSendError({
						cause: new Error(
							"EMAIL_PROVIDER=ses is configured but the SES adapter is not installed",
						),
					}),
				);
			},
		});
	}),
);
