import { Effect, Layer } from "effect";
import { IAppConfig } from "@/shared/env/app.config";
import {
	IWhatsAppProvider,
	type TWhatsAppError,
} from "@/shared/ports/whatsapp.port";

export const AnisAiWhatsAppAdapterLive = Layer.effect(
	IWhatsAppProvider,
	Effect.gen(function* () {
		const config = yield* IAppConfig;
		const { apiKey, baseUrl } = config.anisAi;

		const headers = {
			"Content-Type": "application/json",
			Authorization: `Bearer ${apiKey}`,
		};

		return IWhatsAppProvider.of({
			sendMessage: (params) =>
				Effect.tryPromise({
					try: async () => {
						const response = await fetch(`${baseUrl}/v1/messages`, {
							method: "POST",
							headers,
							body: JSON.stringify({
								to: params.to,
								type: "text",
								text: { body: params.message },
							}),
						});

						if (!response.ok) {
							const errorBody = await response.text();
							throw new Error(
								`Anis AI API error (${response.status}): ${errorBody}`,
							);
						}

						const data = (await response.json()) as {
							id: string;
							status: string;
						};

						return {
							messageId: data.id,
							status: "sent" as const,
						};
					},
					catch: (e) =>
						({
							_tag: "WhatsAppError",
							message:
								e instanceof Error
									? e.message
									: "Failed to send WhatsApp message",
							cause: e,
						}) as TWhatsAppError,
				}),

			sendTemplate: (to, templateName, variables) =>
				Effect.tryPromise({
					try: async () => {
						const response = await fetch(`${baseUrl}/v1/messages`, {
							method: "POST",
							headers,
							body: JSON.stringify({
								to,
								type: "template",
								template: {
									name: templateName,
									language: { code: "id" },
									components: [
										{
											type: "body",
											parameters: Object.entries(variables).map(
												([, value]) => ({
													type: "text",
													text: value,
												}),
											),
										},
									],
								},
							}),
						});

						if (!response.ok) {
							const errorBody = await response.text();
							throw new Error(
								`Anis AI API error (${response.status}): ${errorBody}`,
							);
						}

						const data = (await response.json()) as {
							id: string;
							status: string;
						};

						return {
							messageId: data.id,
							status: "sent" as const,
						};
					},
					catch: (e) =>
						({
							_tag: "WhatsAppError",
							message:
								e instanceof Error
									? e.message
									: "Failed to send WhatsApp template",
							cause: e,
						}) as TWhatsAppError,
				}),
		});
	}),
);
