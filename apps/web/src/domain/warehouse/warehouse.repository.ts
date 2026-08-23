import { Context, type Effect } from "effect";
import type { DatabaseError } from "@/shared/errors/infrastructure.errors";
import type { TTenantId } from "@/shared/types/common.types";
import type {
	RackLocationNotFoundError,
	WarehouseNotFoundError,
} from "./warehouse.errors";
import type {
	TRackLocation,
	TRackLocationId,
	TWarehouse,
	TWarehouseId,
} from "./warehouse.types";

export class IWarehouseRepository extends Context.Tag("IWarehouseRepository")<
	IWarehouseRepository,
	{
		readonly findWarehouseById: (
			id: TWarehouseId,
			tenantId: TTenantId,
		) => Effect.Effect<TWarehouse | null, DatabaseError>;

		readonly findWarehousesByBranch: (
			branchId: string,
			tenantId: TTenantId,
		) => Effect.Effect<readonly TWarehouse[], DatabaseError>;

		readonly findAllWarehouses: (
			tenantId: TTenantId,
		) => Effect.Effect<readonly TWarehouse[], DatabaseError>;

		readonly saveWarehouse: (
			warehouse: TWarehouse,
		) => Effect.Effect<void, DatabaseError>;

		readonly updateWarehouse: (
			warehouse: TWarehouse,
		) => Effect.Effect<void, DatabaseError | WarehouseNotFoundError>;

		readonly deleteWarehouse: (
			id: TWarehouseId,
			tenantId: TTenantId,
		) => Effect.Effect<void, DatabaseError>;

		// ─── Rack Locations ──────────────────────────────────────────────────
		readonly findRackLocationById: (
			id: TRackLocationId,
			tenantId: TTenantId,
		) => Effect.Effect<TRackLocation | null, DatabaseError>;

		readonly findRackLocationsByWarehouse: (
			warehouseId: TWarehouseId,
			tenantId: TTenantId,
		) => Effect.Effect<readonly TRackLocation[], DatabaseError>;

		readonly saveRackLocation: (
			rackLocation: TRackLocation,
		) => Effect.Effect<void, DatabaseError>;

		readonly updateRackLocation: (
			rackLocation: TRackLocation,
		) => Effect.Effect<void, DatabaseError | RackLocationNotFoundError>;

		readonly deleteRackLocation: (
			id: TRackLocationId,
			tenantId: TTenantId,
		) => Effect.Effect<void, DatabaseError>;
	}
>() {}
