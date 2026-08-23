import { Context, Data, type Effect } from "effect";

export class TWhatsAppError extends Data.TaggedError("WhatsAppError")<{
	readonly message: string;
	readonly cause?: unknown;
}> {}

export type TSendMessageParams = {
	readonly to: string;
	readonly message: string;
	readonly templateName?: string;
	readonly templateVariables?: Record<string, string>;
};

export type TSendMessageResult = {
	readonly messageId: string;
	readonly status: "sent" | "failed" | "pending";
};

/**
 * Port: IWhatsAppProvider
 * Standardized interface for WhatsApp messaging.
 */
export interface IWhatsAppProvider {
	readonly sendMessage: (
		params: TSendMessageParams,
	) => Effect.Effect<TSendMessageResult, TWhatsAppError>;
	readonly sendTemplate: (
		to: string,
		templateName: string,
		variables: Record<string, string>,
	) => Effect.Effect<TSendMessageResult, TWhatsAppError>;
}

export const IWhatsAppProvider =
	Context.GenericTag<IWhatsAppProvider>("IWhatsAppProvider");
