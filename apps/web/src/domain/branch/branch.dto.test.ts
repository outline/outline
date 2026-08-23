import { describe, expect, it } from "vitest";
import { toBranchDto } from "./branch.dto";
import type { TBranch, TBranchId, TOperatingHours } from "./branch.types";
import type { TTenantId } from "@/shared/types/common.types";

const fullWeek: TOperatingHours = {
	monday: { opens: "08:00", closes: "21:00", isClosed: false },
	tuesday: { opens: "08:00", closes: "21:00", isClosed: false },
	wednesday: { opens: "08:00", closes: "21:00", isClosed: false },
	thursday: { opens: "08:00", closes: "21:00", isClosed: false },
	friday: { opens: "08:00", closes: "21:00", isClosed: false },
	saturday: { opens: "08:00", closes: "21:00", isClosed: false },
	sunday: { opens: "08:00", closes: "21:00", isClosed: false },
};

describe("toBranchDto", () => {
	it("maps contact, address, geo, and hours fields through", () => {
		const branch: TBranch = {
			id: "branch-1" as TBranchId,
			tenantId: "tenant-1" as TTenantId,
			name: "Cabang Pramuka",
			address: "old free-text address",
			phone: "+6281234567890",
			isActive: true,
			email: "cs@himajinhobby.com",
			whatsappNumber: "+6281234567890",
			streetAddress: "Jl. Pramuka Raya No. 123",
			addressLocality: "Banjarmasin",
			addressRegion: "Kalimantan Selatan",
			postalCode: "70123",
			addressCountry: "ID",
			latitude: -3.3186,
			longitude: 114.5944,
			operatingHours: fullWeek,
			createdAt: new Date("2026-01-01T00:00:00.000Z"),
			updatedAt: new Date("2026-01-01T00:00:00.000Z"),
		};

		const dto = toBranchDto(branch);

		expect(dto.email).toBe("cs@himajinhobby.com");
		expect(dto.whatsappNumber).toBe("+6281234567890");
		expect(dto.streetAddress).toBe("Jl. Pramuka Raya No. 123");
		expect(dto.latitude).toBe(-3.3186);
		expect(dto.operatingHours).toEqual(fullWeek);
		expect(dto.createdAt).toBe("2026-01-01T00:00:00.000Z");
	});

	it("passes through null for unset optional fields", () => {
		const branch: TBranch = {
			id: "branch-2" as TBranchId,
			tenantId: "tenant-1" as TTenantId,
			name: "Cabang Kosong",
			address: null,
			phone: null,
			isActive: true,
			email: null,
			whatsappNumber: null,
			streetAddress: null,
			addressLocality: null,
			addressRegion: null,
			postalCode: null,
			addressCountry: null,
			latitude: null,
			longitude: null,
			operatingHours: null,
			createdAt: new Date("2026-01-01T00:00:00.000Z"),
			updatedAt: new Date("2026-01-01T00:00:00.000Z"),
		};

		const dto = toBranchDto(branch);

		expect(dto.email).toBeNull();
		expect(dto.operatingHours).toBeNull();
	});
});
