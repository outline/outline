import { Effect, Layer } from "effect";
import { IEmailPort, type TEmailPayload } from "@/shared/ports/email.port";

export const ConsoleEmailAdapterLive = Layer.succeed(
	IEmailPort,
	IEmailPort.of({
		sendEmail: (payload: TEmailPayload) =>
			Effect.sync(() => {
				console.log("[Email] To:", payload.to);
				console.log("[Email] Subject:", payload.subject);
				console.log("[Email] Body:", payload.text);
				if (payload.html) {
					console.log(`[Email] HTML: ${payload.html.slice(0, 200)}...`);
				}
			}),
	}),
);
