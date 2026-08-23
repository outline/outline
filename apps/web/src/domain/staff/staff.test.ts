import { describe, expect, it } from "vitest";
import type { TBranchId, TUserId } from "@/shared/types/common.types";
import { StaffModule } from "./staff.module";
import type { TStaffMember } from "./staff.types";

describe("StaffModule", () => {
	describe("reconstitute", () => {
		it("should reconstitute a staff member from raw data", () => {
			const raw: TStaffMember = {
				userId: "user-1" as TUserId,
				fullName: "John Doe",
				email: "john@example.com",
				role: "kasir",
				branches: [{ id: "branch-1" as TBranchId, name: "Main Branch" }],
			};

			const result = StaffModule.reconstitute(raw);

			expect(result).toEqual(raw);
			expect(result.userId).toBe("user-1" as TUserId);
			expect(result.fullName).toBe("John Doe");
			expect(result.email).toBe("john@example.com");
			expect(result.role).toBe("kasir");
			expect(result.branches).toHaveLength(1);
		});

		it("should handle staff with multiple branches", () => {
			const raw: TStaffMember = {
				userId: "user-2" as TUserId,
				fullName: "Jane Smith",
				email: "jane@example.com",
				role: "manager",
				branches: [
					{ id: "branch-1" as TBranchId, name: "Main Branch" },
					{ id: "branch-2" as TBranchId, name: "Second Branch" },
				],
			};

			const result = StaffModule.reconstitute(raw);

			expect(result.branches).toHaveLength(2);
			expect(result.branches[0]?.name).toBe("Main Branch");
			expect(result.branches[1]?.name).toBe("Second Branch");
		});

		it("should handle empty branches", () => {
			const raw: TStaffMember = {
				userId: "user-3" as TUserId,
				fullName: "Bob Wilson",
				email: "bob@example.com",
				role: "staff_daycare",
				branches: [],
			};

			const result = StaffModule.reconstitute(raw);

			expect(result.branches).toHaveLength(0);
		});
	});
});
