import type {
	TBranchId,
	TUserId,
	TUserRole,
} from "@/shared/types/common.types";

export type TStaffId = TUserId;

export type TStaffMember = {
	readonly userId: TUserId;
	readonly fullName: string;
	readonly email: string;
	readonly role: TUserRole;
	readonly branches: readonly {
		readonly id: TBranchId;
		readonly name: string;
	}[];
};
