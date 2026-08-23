import { Effect } from "effect";
import type { TTenantId } from "@/shared/types/common.types";
import { generateId } from "@/shared/utils";
import type {
	TCreateSupplierInput,
	TUpdateSupplierInput,
} from "./supplier.schemas";
import type { TSupplier, TSupplierId } from "./supplier.types";

export const createSupplierEntity = (
	input: TCreateSupplierInput,
	tenantId: TTenantId,
): Effect.Effect<TSupplier> =>
	Effect.sync(() => ({
		id: generateId<TSupplierId>(),
		tenantId,
		name: input.name,
		contactPerson: input.contactPerson ?? null,
		phone: input.phone ?? null,
		email: input.email ?? null,
		address: input.address ?? null,
		notes: input.notes ?? null,
		isActive: true,
		createdAt: new Date(),
		updatedAt: new Date(),
	}));

export const updateSupplierEntity = (
	supplier: TSupplier,
	input: TUpdateSupplierInput,
): Effect.Effect<TSupplier> =>
	Effect.sync(() => ({
		...supplier,
		name: input.name ?? supplier.name,
		contactPerson:
			input.contactPerson !== undefined
				? input.contactPerson
				: supplier.contactPerson,
		phone: input.phone !== undefined ? input.phone : supplier.phone,
		email: input.email !== undefined ? input.email : supplier.email,
		address: input.address !== undefined ? input.address : supplier.address,
		notes: input.notes !== undefined ? input.notes : supplier.notes,
		isActive: input.isActive ?? supplier.isActive,
		updatedAt: new Date(),
	}));
