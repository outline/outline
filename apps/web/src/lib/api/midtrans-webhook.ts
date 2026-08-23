import { eq } from "drizzle-orm";
import { Effect, type Layer } from "effect";
import { handlePaymentCallbackProgram } from "@/domain/billing/billing.programs";
import { verifyMidtransSignature } from "@/infra/adapters/midtrans.adapter";
import { DrizzleClientLive, IDrizzleClient } from "@/infra/db/drizzle/client";
import { billingEvents } from "@/infra/db/drizzle/schema";
import { runApp } from "@/infra/runtime/app.runtime";
import { getResolvedConfig } from "@/shared/env/app.config";
import { DatabaseError } from "@/shared/errors/infrastructure.errors";
import type { TTenantId } from "@/shared/types/common.types";

export async function handleMidtransWebhook(request: Request) {
	if (request.method !== "POST") {
		return new Response("Method not allowed", { status: 405 });
	}
	try {
		const body = await request.json();
		const serverKey = getResolvedConfig().midtrans.serverKey;

		if (!serverKey) {
			return new Response(
				JSON.stringify({ error: "Server configuration error" }),
				{ status: 500, headers: { "Content-Type": "application/json" } },
			);
		}

		const isValid = verifyMidtransSignature(
			{
				order_id: body.order_id,
				status_code: body.status_code,
				gross_amount: body.gross_amount,
				signature_key: body.signature_key,
			},
			serverKey,
		);

		if (!isValid) {
			return new Response(JSON.stringify({ error: "Invalid signature" }), {
				status: 401,
				headers: { "Content-Type": "application/json" },
			});
		}

		const orderId: string = body.order_id;

		// The DB query must run *inside* the same `Effect.provide(..., DrizzleClientLive)`
		// call that builds the client — DrizzleClientLive is now Layer.scoped, so its
		// pool closes as soon as the provided effect finishes. Extracting `db` via a
		// separate, nested `Effect.runPromise(Effect.provide(IDrizzleClient, ...))`
		// (the previous shape here) would build-and-immediately-close its own pool
		// before this query ever ran.
		const tenantId = await Effect.runPromise(
			Effect.provide(
				Effect.gen(function* () {
					const db = yield* IDrizzleClient;
					const rows = yield* Effect.tryPromise({
						try: () =>
							db
								.select({ businessId: billingEvents.businessId })
								.from(billingEvents)
								.where(eq(billingEvents.midtransOrderId, orderId))
								.limit(1),
						catch: (e) => new DatabaseError({ cause: e as Error }),
					});
					return (rows[0]?.businessId as TTenantId | undefined) ?? null;
				}),
				DrizzleClientLive as Layer.Layer<IDrizzleClient, never, never>,
			),
		);

		if (!tenantId) {
			return new Response(
				JSON.stringify({ error: "Billing event not found for this order ID" }),
				{ status: 400, headers: { "Content-Type": "application/json" } },
			);
		}

		const program = handlePaymentCallbackProgram(
			{
				orderId: body.order_id,
				transactionId: body.transaction_id,
				transactionStatus: body.transaction_status,
				paymentMethod: body.payment_type,
			},
			tenantId,
		);

		const result = await runApp(program);

		return new Response(JSON.stringify(result), {
			status: 200,
			headers: { "Content-Type": "application/json" },
		});
	} catch (error) {
		console.error("Midtrans webhook error:", error);
		return new Response(JSON.stringify({ error: "Internal server error" }), {
			status: 500,
			headers: { "Content-Type": "application/json" },
		});
	}
}
