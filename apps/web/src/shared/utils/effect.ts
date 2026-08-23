import { type Duration, Effect, Schedule } from "effect";

/**
 * Wraps an Effect with an exponential backoff retry schedule.
 * Useful for handling transient database or network errors.
 *
 * Retries up to 3 times, with exponential backoff starting at 100ms.
 */
export const withRetry = <A, E, R>(
	effect: Effect.Effect<A, E, R>,
	maxRetries = 3,
	baseDelay = "100 millis",
): Effect.Effect<A, E, R> => {
	const policy = Schedule.exponential(baseDelay as Duration.DurationInput).pipe(
		Schedule.upTo(maxRetries),
	);
	return Effect.retry(effect, policy);
};
