import type { TStaffMember } from "./staff.types";

export const StaffModule = {
	reconstitute: (raw: TStaffMember): TStaffMember => ({ ...raw }),
} as const;
