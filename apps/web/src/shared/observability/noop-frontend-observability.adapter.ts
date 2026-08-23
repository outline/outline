import type {
	IFrontendObservability,
	TObservabilityEvent,
} from "./frontend-observability.port";

/**
 * No-op adapter for IFrontendObservability. Default for development
 * and tests; production wires a real telemetry sink (Sentry etc.) by
 * providing a custom adapter in `__root.tsx` via React Context.
 */
export const noopFrontendObservabilityAdapter: IFrontendObservability = {
	capture: (_event: TObservabilityEvent) => {
		// intentionally empty — production adapter replaces this
	},
	flush: async () => {
		// nothing to flush
	},
};
