import { Effect } from "effect";
import { getDashboardMetricsProgram } from "@/domain/accounting";
import { getBoardingsProgram } from "@/domain/boarding";
import { getProductsProgram } from "@/domain/product";
import type { TTenantId } from "@/shared/types/common.types";

export const aiGetBusinessSnapshotProgram = (tenantId: TTenantId) =>
	Effect.gen(function* () {
		const metrics = yield* getDashboardMetricsProgram(tenantId);
		const products = yield* getProductsProgram(tenantId);
		const activeBoardings = yield* getBoardingsProgram(tenantId);

		return {
			metrics,
			inventorySummary: products.map((p) => ({
				name: p.name,
				stock: p.variants.reduce((acc, v) => acc + v.stock, 0),
				isLow: p.variants.some((v) => v.isLowStock),
			})),
			activeBoardings: activeBoardings
				.filter((b) => b.status === "active")
				.map((b) => ({
					owner: b.ownerName,
					pets: b.pets.map((p) => p.name).join(", "),
					checkIn: b.checkInDate,
				})),
		};
	});
