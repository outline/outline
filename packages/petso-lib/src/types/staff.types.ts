export interface TStaffMemberDto {
	readonly userId: string;
	readonly fullName: string;
	readonly email: string;
	readonly role: string;
	readonly isActive?: boolean;
	readonly branches: readonly { readonly id: string; readonly name: string }[];
}
