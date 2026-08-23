import { redact } from "./redaction";
import type { TRequestContext } from "./request-context";

export type TLogLevel = "info" | "warn" | "error" | "debug";

export type TLogEvent = {
	readonly requestId: string;
	readonly tenantId: string | null;
	readonly actorId: string | null;
	readonly operation: string;
	readonly outcome: "success" | "failure";
	readonly durationMs: number;
	readonly errorTag?: string;
	readonly message?: string;
};

const serializeLog = (event: TLogEvent): string => {
	const safe = redact(event as unknown as Record<string, unknown>);
	return JSON.stringify({
		...safe,
		timestamp: new Date().toISOString(),
	});
};

export const logEvent = (event: TLogEvent, level: TLogLevel = "info"): void => {
	const line = serializeLog(event);
	switch (level) {
		case "error":
			console.error(line);
			break;
		case "warn":
			console.warn(line);
			break;
		case "debug":
			console.debug(line);
			break;
		default:
			console.log(line);
	}
};

export const logOperation = (
	context: TRequestContext,
	operation: string,
	outcome: "success" | "failure",
	durationMs: number,
	errorTag?: string,
	message?: string,
): void => {
	logEvent({
		requestId: context.requestId,
		tenantId: context.tenantId,
		actorId: context.actorId,
		operation,
		outcome,
		durationMs,
		...(errorTag !== undefined ? { errorTag } : {}),
		...(message !== undefined ? { message } : {}),
	});
};
