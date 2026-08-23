import { Context } from "effect";

/**
 * Port: IFrontendObservability
 *
 * Vendor-neutral FE observability surface. The default no-op adapter
 * satisfies the port for development and tests; production can swap in
 * a Sentry/Datadog/Browser-Telemetry adapter without touching call
 * sites.
 *
 * Events are intentionally low-cardinality:
 *   - `event` is a dot-separated path (e.g. "query.error",
 *     "mutation.success", "route.change").
 *   - `level` is one of `debug | info | warn | error`.
 *   - `attributes` is an arbitrary serialisable object. PII / tokens /
 *     passwords must be redacted by the adapter, not by call sites.
 *
 * Callers must never block on observability calls; adapters should
 * queue / batch / drop events as needed.
 */
export type TObservabilityLevel = "debug" | "info" | "warn" | "error";

export type TObservabilityEvent = {
	readonly event: string;
	readonly level: TObservabilityLevel;
	readonly attributes?: Record<string, unknown>;
	readonly timestamp?: number;
};

export interface IFrontendObservability {
	readonly capture: (event: TObservabilityEvent) => void;
	readonly flush: () => Promise<void>;
}

export const IFrontendObservability =
	Context.GenericTag<IFrontendObservability>("IFrontendObservability");
