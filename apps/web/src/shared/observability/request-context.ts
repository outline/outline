import { Context, Effect } from "effect";

export type TRequestContext = {
	readonly requestId: string;
	readonly tenantId: string | null;
	readonly actorId: string | null;
	readonly ipAddress: string | null;
};

export class IRequestContext extends Context.Tag("IRequestContext")<
	IRequestContext,
	TRequestContext
>() {}

export const generateRequestId = (): string =>
	`req_${crypto.randomUUID().replace(/-/g, "").substring(0, 16)}`;

export const withRequestContext = <A, E, R>(
	effect: Effect.Effect<A, E, R>,
	context: TRequestContext,
): Effect.Effect<A, E, Exclude<R, IRequestContext>> =>
	Effect.provideService(effect, IRequestContext, context);

export const getRequestContext = (): Effect.Effect<
	TRequestContext,
	never,
	IRequestContext
> =>
	Effect.gen(function* () {
		return yield* IRequestContext;
	});
