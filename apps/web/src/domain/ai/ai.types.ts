import type { TId, TTenantId } from "@/shared/types/common.types";

export type TAiInsightId = TId & { readonly _brand: "AiInsightId" };

export type TAiInsight = {
	readonly id: TAiInsightId;
	readonly tenantId: TTenantId;
	readonly type: "trend" | "anomaly" | "recommendation" | "alert";
	readonly title: string;
	readonly description: string;
	readonly severity: "info" | "warning" | "critical";
	readonly relatedModule: string;
	readonly relatedId: string | null;
	readonly createdAt: Date;
};

export type TAiBusinessSnapshot = {
	readonly metrics: {
		readonly revenueToday: number;
		readonly transactionsToday: number;
		readonly activeBoardings: number;
	};
	readonly inventorySummary: readonly {
		readonly name: string;
		readonly stock: number;
		readonly isLow: boolean;
	}[];
	readonly activeBoardings: readonly {
		readonly owner: string;
		readonly pets: string;
		readonly checkIn: string;
	}[];
};

export type TAiRecommendation = {
	readonly id: string;
	readonly type: "cross_sell" | "upsell" | "retention" | "pricing";
	readonly title: string;
	readonly description: string;
	readonly impact: "low" | "medium" | "high";
	readonly relatedEntityId: string | null;
};
