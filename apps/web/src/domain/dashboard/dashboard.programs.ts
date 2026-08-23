import { Effect } from "effect";
import type { DatabaseError } from "@/shared/errors/infrastructure.errors";
import type { TTenantId } from "@/shared/types/common.types";
import { DashboardModule } from "./dashboard.module";
import {
	DashboardRepository,
	type IDashboardRepository,
} from "./dashboard.repository";
import type { TInventoryStatusResult, TTopSellerItem } from "./dashboard.types";

export const getTopSellersProgram = (
	tenantId: TTenantId,
): Effect.Effect<
	readonly TTopSellerItem[],
	DatabaseError,
	IDashboardRepository
> =>
	Effect.gen(function* (_) {
		const repo = yield* _(DashboardRepository);
		const items = yield* _(repo.getTopSellerItems(tenantId));
		return DashboardModule.processTopSellers(items);
	});

export const getInventoryItemsProgram = (
	tenantId: TTenantId,
): Effect.Effect<TInventoryStatusResult, DatabaseError, IDashboardRepository> =>
	Effect.gen(function* (_) {
		const repo = yield* _(DashboardRepository);
		const { products, totalCount } = yield* _(
			repo.getInventoryProducts(tenantId),
		);
		const items = DashboardModule.processInventoryItems(products);
		return { items, totalCount };
	});
