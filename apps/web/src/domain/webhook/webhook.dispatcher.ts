import { Effect } from "effect";
import { generateId } from "@/shared/utils";
import type { TWebhookEndpoint, TWebhookEvent } from "./webhook.types";

const sign = async (payload: string, secret: string): Promise<string> => {
	const encoder = new TextEncoder();
	const key = await crypto.subtle.importKey(
		"raw",
		encoder.encode(secret),
		{ name: "HMAC", hash: "SHA-256" },
		false,
		["sign"],
	);
	const signature = await crypto.subtle.sign(
		"HMAC",
		key,
		encoder.encode(payload),
	);
	return Array.from(new Uint8Array(signature))
		.map((b) => b.toString(16).padStart(2, "0"))
		.join("");
};

type TWebhookDispatcherDeps = {
	readonly findActiveByBusinessAndEvent: (
		tenantId: TWebhookEndpoint["tenantId"],
		event: string,
	) => Effect.Effect<readonly TWebhookEndpoint[], unknown, never>;
	readonly recordDelivery: (
		id: TWebhookEndpoint["id"],
		status: number,
	) => Effect.Effect<void, unknown, never>;
};

export const dispatchWebhook = async (
	repo: TWebhookDispatcherDeps,
	tenantId: string,
	event: TWebhookEvent,
	data: Record<string, unknown>,
): Promise<void> => {
	const endpoints = await Effect.runPromise(
		repo.findActiveByBusinessAndEvent(
			tenantId as TWebhookEndpoint["tenantId"],
			event,
		),
	).catch(() => [] as readonly TWebhookEndpoint[]);

	if (endpoints.length === 0) return;

	const id = generateId();
	const payload = JSON.stringify({
		id,
		event,
		timestamp: new Date().toISOString(),
		data,
	});

	await Promise.allSettled(
		endpoints.map(async (endpoint) => {
			const signature = await sign(payload, endpoint.secret);
			try {
				const response = await fetch(endpoint.url, {
					method: "POST",
					headers: {
						"Content-Type": "application/json",
						"X-Webhook-Event": event,
						"X-Webhook-Signature": `sha256=${signature}`,
						"X-Webhook-Id": id,
					},
					body: payload,
					signal: AbortSignal.timeout(10_000),
				});
				await Effect.runPromise(
					repo.recordDelivery(endpoint.id, response.status),
				);
			} catch {
				await Effect.runPromise(repo.recordDelivery(endpoint.id, 0));
			}
		}),
	);
};
