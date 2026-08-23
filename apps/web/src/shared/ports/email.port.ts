import { Context, type Effect } from "effect";

export class TEmailSendError extends Error {
	readonly _tag = "EmailSendError";
	constructor(options?: { readonly cause?: unknown }) {
		super("Failed to send email", options);
		this.name = "EmailSendError";
	}
}

export type TEmailPayload = {
	readonly to: string;
	readonly subject: string;
	readonly text: string;
	readonly html?: string;
	readonly idempotencyKey?: string;
};

export class IEmailPort extends Context.Tag("IEmailPort")<
	IEmailPort,
	{
		readonly sendEmail: (
			payload: TEmailPayload,
		) => Effect.Effect<void, TEmailSendError>;
	}
>() {}
