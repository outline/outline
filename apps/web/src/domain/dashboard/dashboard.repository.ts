import { Context, type Effect } from "effect";
import type { DatabaseError } from "@/shared/errors/infrastructure.errors";
import type { TTenantId } from "@/shared/types/common.types";

export interface IDashboardRepository {
	readonly getTopSellerItems: (tenantId: TTenantId) => Effect.Effect<
		readonly {
			productId: string;
			name: string;
			category: string;
			quantity: number;
			revenue: number;
		}[],
		DatabaseError
	>;

	readonly getInventoryProducts: (tenantId: TTenantId) => Effect.Effect<
		{
			readonly products: readonly {
				name: string;
				stock: number;
				updatedAt: string;
			}[];
			readonly totalCount: number;
		},
		DatabaseError
	>;
}

export const DashboardRepository = Context.GenericTag<IDashboardRepository>(
	"DashboardRepository",
);
