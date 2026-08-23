import { Effect } from "effect";
import type { TTenantId } from "@/shared/types/common.types";
import { SupplierNotFoundError } from "./supplier.errors";
import { createSupplierEntity, updateSupplierEntity } from "./supplier.module";
import { ISupplierRepository } from "./supplier.repository";
import type {
	TCreateSupplierInput,
	TUpdateSupplierInput,
} from "./supplier.schemas";
import type { TSupplierId } from "./supplier.types";

export const getSuppliersProgram = (tenantId: TTenantId) =>
	Effect.gen(function* (_) {
		const repo = yield* _(ISupplierRepository);
		return yield* _(repo.findAll(tenantId));
	});

export const getSupplierByIdProgram = (id: TSupplierId, tenantId: TTenantId) =>
	Effect.gen(function* (_) {
		const repo = yield* _(ISupplierRepository);
		const supplier = yield* _(repo.findById(id, tenantId));
		if (!supplier) {
			yield* _(Effect.fail(new SupplierNotFoundError({ id })));
		}
		return supplier;
	});

export const addSupplierProgram = (
	input: TCreateSupplierInput,
	tenantId: TTenantId,
) =>
	Effect.gen(function* (_) {
		const repo = yield* _(ISupplierRepository);
		const supplier = yield* _(createSupplierEntity(input, tenantId));
		yield* _(repo.save(supplier));
		return supplier;
	});

export const updateSupplierProgram = (
	input: TUpdateSupplierInput,
	tenantId: TTenantId,
) =>
	Effect.gen(function* (_) {
		const repo = yield* _(ISupplierRepository);
		const supplier = yield* _(repo.findById(input.id as TSupplierId, tenantId));

		if (!supplier) {
			return yield* _(Effect.fail(new SupplierNotFoundError({ id: input.id })));
		}

		const updatedSupplier = yield* _(updateSupplierEntity(supplier, input));
		yield* _(repo.update(updatedSupplier));

		return updatedSupplier;
	});

export const deleteSupplierProgram = (id: TSupplierId, tenantId: TTenantId) =>
	Effect.gen(function* (_) {
		const repo = yield* _(ISupplierRepository);
		const supplier = yield* _(repo.findById(id, tenantId));

		if (!supplier) {
			return yield* _(Effect.fail(new SupplierNotFoundError({ id })));
		}

		yield* _(repo.delete(id, tenantId));
	});
