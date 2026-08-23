export interface TInviteStaffInput {
	readonly email: string;
	readonly branchId: string;
	readonly role: "owner" | "manager" | "kasir" | "staff_daycare";
}

export interface TInviteStaffResult {
	readonly sent: boolean;
	readonly reason?: string;
}

export interface TUpdateStaffProfileInput {
	readonly fullName: string;
	readonly email: string;
	readonly commissionRate?: number;
}
