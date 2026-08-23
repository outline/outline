import { type Context, Effect, Layer } from "effect";
import { describe, expect, it, vi } from "vitest";
import type { TTenantId } from "@/shared/types/common.types";
import { generateId } from "@/shared/utils";
import {
	createRackLocationProgram,
	createWarehouseProgram,
	deleteRackLocationProgram,
	deleteWarehouseProgram,
	getRackLocationsProgram,
	getWarehousesByBranchProgram,
	getWarehousesProgram,
	updateRackLocationProgram,
	updateWarehouseProgram,
} from "./warehouse.programs";
import { IWarehouseRepository } from "./warehouse.repository";
import type {
	TRackLocation,
	TRackLocationId,
	TWarehouse,
	TWarehouseId,
} from "./warehouse.types";

const mockTenantId = generateId<TTenantId>();

const mockWarehouse: TWarehouse = {
	id: generateId<TWarehouseId>(),
	tenantId: mockTenantId,
	branchId: "branch-1",
	name: "Gudang Utama",
	code: "GU-01",
	address: "Jl. Test No. 1",
	isActive: true,
	createdAt: new Date("2026-01-01"),
	updatedAt: new Date("2026-01-01"),
};

const mockRackLocation: TRackLocation = {
	id: generateId<TRackLocationId>(),
	tenantId: mockTenantId,
	warehouseId: mockWarehouse.id,
	name: "Rak A1",
	rack: "A",
	shelf: "1",
	bin: "01",
	isActive: true,
	createdAt: new Date("2026-01-01"),
	updatedAt: new Date("2026-01-01"),
};

type TRepoShape = Context.Tag.Service<IWarehouseRepository>;

const DEFAULT_REPO: TRepoShape = {
	findWarehouseById: vi.fn().mockReturnValue(Effect.succeed(null)),
	findWarehousesByBranch: vi.fn().mockReturnValue(Effect.succeed([])),
	findAllWarehouses: vi.fn().mockReturnValue(Effect.succeed([])),
	saveWarehouse: vi.fn().mockReturnValue(Effect.void),
	updateWarehouse: vi.fn().mockReturnValue(Effect.void),
	deleteWarehouse: vi.fn().mockReturnValue(Effect.void),
	findRackLocationById: vi.fn().mockReturnValue(Effect.succeed(null)),
	findRackLocationsByWarehouse: vi.fn().mockReturnValue(Effect.succeed([])),
	saveRackLocation: vi.fn().mockReturnValue(Effect.void),
	updateRackLocation: vi.fn().mockReturnValue(Effect.void),
	deleteRackLocation: vi.fn().mockReturnValue(Effect.void),
};

const makeRepo = (overrides: Partial<TRepoShape> = {}): TRepoShape => ({
	...DEFAULT_REPO,
	...overrides,
});

const runWith = <A, E>(
	program: Effect.Effect<A, E, IWarehouseRepository>,
	repo: TRepoShape,
): Promise<A> =>
	Effect.runPromise(
		Effect.provide(program, Layer.succeed(IWarehouseRepository, repo)),
	);

describe("getWarehousesProgram", () => {
	it("returns all warehouses for the tenant", async () => {
		const findAllWarehouses = vi
			.fn()
			.mockReturnValue(Effect.succeed([mockWarehouse]));
		const repo = makeRepo({ findAllWarehouses });

		const result = await runWith(getWarehousesProgram(mockTenantId), repo);

		expect(result).toEqual([mockWarehouse]);
		expect(findAllWarehouses).toHaveBeenCalledWith(mockTenantId);
	});

	it("propagates DatabaseError", async () => {
		const repo = makeRepo({
			findAllWarehouses: vi
				.fn()
				.mockReturnValue(
					Effect.fail({ _tag: "DatabaseError", cause: new Error("db fail") }),
				),
		});

		await expect(
			runWith(getWarehousesProgram(mockTenantId), repo),
		).rejects.toThrow("DatabaseError");
	});
});

describe("getWarehousesByBranchProgram", () => {
	it("scopes the lookup to branch and tenant", async () => {
		const findWarehousesByBranch = vi
			.fn()
			.mockReturnValue(Effect.succeed([mockWarehouse]));
		const repo = makeRepo({ findWarehousesByBranch });

		const result = await runWith(
			getWarehousesByBranchProgram("branch-1", mockTenantId),
			repo,
		);

		expect(result).toEqual([mockWarehouse]);
		expect(findWarehousesByBranch).toHaveBeenCalledWith(
			"branch-1",
			mockTenantId,
		);
	});
});

describe("createWarehouseProgram", () => {
	it("saves and returns a warehouse with generated id and defaults", async () => {
		const saveWarehouse = vi.fn().mockReturnValue(Effect.void);
		const repo = makeRepo({ saveWarehouse });

		const result = await runWith(
			createWarehouseProgram(
				{ branchId: "branch-1", name: "Gudang Baru" },
				mockTenantId,
			),
			repo,
		);

		expect(result.name).toBe("Gudang Baru");
		expect(result.branchId).toBe("branch-1");
		expect(result.tenantId).toBe(mockTenantId);
		expect(result.code).toBeNull();
		expect(result.address).toBeNull();
		expect(result.isActive).toBe(true);
		expect(result.id).toBeTruthy();
		expect(saveWarehouse).toHaveBeenCalledWith(result);
	});
});

describe("updateWarehouseProgram", () => {
	it("updates an existing warehouse", async () => {
		const updateWarehouse = vi.fn().mockReturnValue(Effect.void);
		const repo = makeRepo({
			findWarehouseById: vi.fn().mockReturnValue(Effect.succeed(mockWarehouse)),
			updateWarehouse,
		});

		const result = await runWith(
			updateWarehouseProgram(
				mockWarehouse.id,
				{ branchId: "branch-2", name: "Gudang Cabang", code: "GC-01" },
				mockTenantId,
			),
			repo,
		);

		expect(result.id).toBe(mockWarehouse.id);
		expect(result.branchId).toBe("branch-2");
		expect(result.name).toBe("Gudang Cabang");
		expect(result.code).toBe("GC-01");
		expect(result.address).toBeNull();
		expect(updateWarehouse).toHaveBeenCalledWith(result);
	});

	it("fails with WarehouseNotFoundError when missing", async () => {
		const repo = makeRepo();

		await expect(
			runWith(
				updateWarehouseProgram(
					mockWarehouse.id,
					{ branchId: "branch-1", name: "X" },
					mockTenantId,
				),
				repo,
			),
		).rejects.toMatchObject({
			name: expect.stringContaining("WarehouseNotFoundError"),
		});
	});
});

describe("deleteWarehouseProgram", () => {
	it("delegates to the repository with tenant scope", async () => {
		const deleteWarehouse = vi.fn().mockReturnValue(Effect.void);
		const repo = makeRepo({ deleteWarehouse });

		await runWith(deleteWarehouseProgram(mockWarehouse.id, mockTenantId), repo);

		expect(deleteWarehouse).toHaveBeenCalledWith(
			mockWarehouse.id,
			mockTenantId,
		);
	});
});

describe("getRackLocationsProgram", () => {
	it("returns rack locations for a warehouse", async () => {
		const findRackLocationsByWarehouse = vi
			.fn()
			.mockReturnValue(Effect.succeed([mockRackLocation]));
		const repo = makeRepo({ findRackLocationsByWarehouse });

		const result = await runWith(
			getRackLocationsProgram(mockWarehouse.id, mockTenantId),
			repo,
		);

		expect(result).toEqual([mockRackLocation]);
		expect(findRackLocationsByWarehouse).toHaveBeenCalledWith(
			mockWarehouse.id,
			mockTenantId,
		);
	});
});

describe("createRackLocationProgram", () => {
	it("saves and returns a rack location with defaults", async () => {
		const saveRackLocation = vi.fn().mockReturnValue(Effect.void);
		const repo = makeRepo({ saveRackLocation });

		const result = await runWith(
			createRackLocationProgram(
				{ warehouseId: mockWarehouse.id, name: "Rak B2" },
				mockTenantId,
			),
			repo,
		);

		expect(result.name).toBe("Rak B2");
		expect(result.warehouseId).toBe(mockWarehouse.id);
		expect(result.rack).toBeNull();
		expect(result.shelf).toBeNull();
		expect(result.bin).toBeNull();
		expect(result.isActive).toBe(true);
		expect(saveRackLocation).toHaveBeenCalledWith(result);
	});
});

describe("updateRackLocationProgram", () => {
	it("fails with RackLocationNotFoundError when missing", async () => {
		const repo = makeRepo();

		await expect(
			runWith(
				updateRackLocationProgram(
					mockRackLocation.id,
					{ warehouseId: mockWarehouse.id, name: "X" },
					mockTenantId,
				),
				repo,
			),
		).rejects.toMatchObject({
			name: expect.stringContaining("RackLocationNotFoundError"),
		});
	});

	it("updates an existing rack location", async () => {
		const updateRackLocation = vi.fn().mockReturnValue(Effect.void);
		const repo = makeRepo({
			findRackLocationById: vi
				.fn()
				.mockReturnValue(Effect.succeed(mockRackLocation)),
			updateRackLocation,
		});

		const result = await runWith(
			updateRackLocationProgram(
				mockRackLocation.id,
				{ warehouseId: mockWarehouse.id, name: "Rak C3", rack: "C" },
				mockTenantId,
			),
			repo,
		);

		expect(result.name).toBe("Rak C3");
		expect(result.rack).toBe("C");
		expect(result.shelf).toBeNull();
		expect(updateRackLocation).toHaveBeenCalledWith(result);
	});
});

describe("deleteRackLocationProgram", () => {
	it("delegates to the repository with tenant scope", async () => {
		const deleteRackLocation = vi.fn().mockReturnValue(Effect.void);
		const repo = makeRepo({ deleteRackLocation });

		await runWith(
			deleteRackLocationProgram(mockRackLocation.id, mockTenantId),
			repo,
		);

		expect(deleteRackLocation).toHaveBeenCalledWith(
			mockRackLocation.id,
			mockTenantId,
		);
	});
});
