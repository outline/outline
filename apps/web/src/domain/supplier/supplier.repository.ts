import { Context, type Effect } from "effect";
import type { DatabaseError } from "@/shared/errors/infrastructure.errors";
import type { TTenantId } from "@/shared/types/common.types";
import type { TSupplier, TSupplierId } from "./supplier.types";

export class ISupplierRepository extends Context.Tag("ISupplierRepository")<
	ISupplierRepository,
	{
		readonly findAll: (
			tenantId: TTenantId,
		) => Effect.Effect<readonly TSupplier[], DatabaseError>;
		readonly findById: (
			id: TSupplierId,
			tenantId: TTenantId,
		) => Effect.Effect<TSupplier | null, DatabaseError>;
		readonly save: (supplier: TSupplier) => Effect.Effect<void, DatabaseError>;
		readonly update: (
			supplier: TSupplier,
		) => Effect.Effect<void, DatabaseError>;
		readonly delete: (
			id: TSupplierId,
			tenantId: TTenantId,
		) => Effect.Effect<void, DatabaseError>;
	}
>() {}
