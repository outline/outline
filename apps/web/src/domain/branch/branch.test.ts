import { describe, expect, it } from "vitest";
import type { TTenantId } from "@/shared/types/common.types";
import { BranchModule } from "./branch.module";

describe("BranchModule", () => {
	it("should create a branch with standard props", () => {
		const props = {
			tenantId: "business-1" as TTenantId,
			name: "South Branch",
			address: "Jl. South No. 1",
			phone: "021-12345",
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
		};

		const branch = BranchModule.create(props);

		expect(branch.name).toBe("South Branch");
		expect(branch.id).toBeDefined();
		expect(branch.createdAt).toBeInstanceOf(Date);
	});

	it("should update branch fields", () => {
		const branch = {
			id: "b-1",
			name: "Old Name",
			isActive: true,
		} as unknown as ReturnType<typeof BranchModule.create>;

		const updated = BranchModule.update(branch, {
			name: "New Name",
			isActive: false,
		});

		expect(updated.name).toBe("New Name");
		expect(updated.isActive).toBe(false);
		expect(updated.updatedAt).toBeInstanceOf(Date);
	});
});
