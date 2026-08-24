import { createHash } from "node:crypto";
import { Effect, Layer } from "effect";
import { IAppConfig } from "@/shared/env/app.config";
import {
	IPaymentProvider,
	type TPaymentError,
} from "@/shared/ports/payment.port";

const SNAP_BASE_URL = {
	sandbox: "https://app.sandbox.midtrans.com",
	production: "https://app.midtrans.com",
};

const API_BASE_URL = {
	sandbox: "https://api.sandbox.midtrans.com",
	production: "https://api.midtrans.com",
};

export const MidtransPaymentAdapterLive = Layer.effect(
	IPaymentProvider,
	Effect.gen(function* () {
		const config = yield* IAppConfig;
		const { publicBaseUrl } = config;
		const { serverKey, isProduction } = config.midtrans;

		const env = isProduction ? "production" : "sandbox";
		const snapUrl = SNAP_BASE_URL[env];
		const apiUrl = API_BASE_URL[env];
		const authHeader = `Basic ${Buffer.from(`${serverKey}:`).toString("base64")}`;
		const finishCallbackUrl = new URL(
			"/settings/billing",
			publicBaseUrl,
		).toString();

		return IPaymentProvider.of({
			createTransaction: (params) =>
				Effect.tryPromise({
					try: async () => {
						const response = await fetch(`${snapUrl}/snap/v1/transactions`, {
							method: "POST",
							headers: {
								"Content-Type": "application/json",
								Accept: "application/json",
								Authorization: authHeader,
							},
							body: JSON.stringify({
								transaction_details: {
									order_id: params.orderId,
									gross_amount: params.amount,
								},
								customer_details: {
									first_name: params.customer.name,
									email: params.customer.email,
									phone: params.customer.phone || "",
								},
								item_details: params.items?.map((item) => ({
									id: item.id,
									name: item.name,
									price: item.price,
									quantity: item.quantity,
								})),
								callbacks: {
									finish: finishCallbackUrl,
								},
							}),
						});

						if (!response.ok) {
							const errorBody = await response.text();
							throw new Error(
								`Midtrans API error (${response.status}): ${errorBody}`,
							);
						}

						const data = (await response.json()) as {
							token: string;
							redirect_url: string;
						};

						return {
							token: data.token,
							redirectUrl: data.redirect_url,
						};
					},
					catch: (e) =>
						({
							_tag: "PaymentError",
							message:
								e instanceof Error
									? e.message
									: "Failed to create Midtrans transaction",
							cause: e,
						}) as TPaymentError,
				}),

			getStatus: (orderId) =>
				Effect.tryPromise({
					try: async () => {
						const response = await fetch(`${apiUrl}/v2/${orderId}/status`, {
							method: "GET",
							headers: {
								Accept: "application/json",
								Authorization: authHeader,
							},
						});

						if (!response.ok) {
							const errorBody = await response.text();
							throw new Error(
								`Midtrans status API error (${response.status}): ${errorBody}`,
							);
						}

						const data = (await response.json()) as {
							transaction_status: string;
							fraud_status?: string;
						};

						return data.transaction_status;
					},
					catch: (e) =>
						({
							_tag: "PaymentError",
							message:
								e instanceof Error
									? e.message
									: `Failed to get status for order "${orderId}"`,
							cause: e,
						}) as TPaymentError,
				}),
		});
	}),
);

export const verifyMidtransSignature = (
	body: {
		order_id: string;
		status_code: string;
		gross_amount: string;
		signature_key: string;
	},
	serverKey: string,
): boolean => {
	const raw = `${body.order_id}${body.status_code}${body.gross_amount}${serverKey}`;
	const expected = createHash("sha512").update(raw).digest("hex");
	return expected === body.signature_key;
};
