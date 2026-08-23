import type { TStaffMember } from "./staff.types";

export type TStaffMemberDto = {
	readonly userId: string;
	readonly fullName: string;
	readonly email: string;
	readonly role: string;
	readonly branches: readonly { readonly id: string; readonly name: string }[];
};

export const toStaffMemberDto = (member: TStaffMember): TStaffMemberDto => ({
	userId: member.userId,
	fullName: member.fullName,
	email: member.email,
	role: member.role,
	branches: member.branches.map((b) => ({ id: b.id, name: b.name })),
});
