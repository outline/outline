import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook } from "@testing-library/react";
import type * as React from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { subscriptionsApi } from "@/lib/api/subscriptions.functions";
import { LimitModalProvider } from "./use-limit-modal";
import { useLimits } from "./use-limits";

// Mock subscriptionsApi
vi.mock("@/lib/api/subscriptions.functions", () => ({
	subscriptionsApi: {
		getSubscription: vi.fn(),
		getUsageMetrics: vi.fn(),
	},
}));

const createWrapper = () => {
	const queryClient = new QueryClient({
		defaultOptions: {
			queries: {
				retry: false,
			},
		},
	});
	return ({ children }: { children: React.ReactNode }) => (
		<QueryClientProvider client={queryClient}>
			<LimitModalProvider>{children}</LimitModalProvider>
		</QueryClientProvider>
	);
};

describe("useLimits", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("should return default free plan limits if no subscription is found", async () => {
		vi.mocked(subscriptionsApi.getSubscription).mockResolvedValue(null);
		vi.mocked(subscriptionsApi.getUsageMetrics).mockResolvedValue({
			branches: 1,
			staff: 1,
			activeBoardings: 0,
		} as import("@/domain/billing/billing.types").TUsageMetrics);

		const { result } = renderHook(() => useLimits(), {
			wrapper: createWrapper(),
		});

		// Wait for query to complete
		await vi.waitFor(() => expect(result.current.plan).toBe("free"));
		expect(result.current.limits).toBeDefined();
	});

	it("should correctly identify when a limit is reached", async () => {
		vi.mocked(subscriptionsApi.getSubscription).mockResolvedValue({
			plan: "free",
		} as unknown as import("@/domain/billing/billing.dto").TSubscriptionDto);
		vi.mocked(subscriptionsApi.getUsageMetrics).mockResolvedValue({
			branches: 1, // Free limit is 1
			staff: 1,
			activeBoardings: 0,
		} as import("@/domain/billing/billing.types").TUsageMetrics);

		const { result } = renderHook(() => useLimits(), {
			wrapper: createWrapper(),
		});

		await vi.waitFor(() => expect(result.current.usage).toBeDefined());

		expect(result.current.isAtLimit("branches")).toBe(true);
		expect(result.current.checkLimit("branches")).toBe(false);
	});
});
