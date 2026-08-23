import { generateId } from "@/shared/utils";
import type { TBranch, TBranchId, TBranchProps } from "./branch.types";

export const BranchModule = {
	create: (props: TBranchProps): TBranch => ({
		...props,
		id: generateId<TBranchId>(),
		createdAt: new Date(),
		updatedAt: new Date(),
	}),

	update: (
		branch: TBranch,
		updates: Partial<
			Pick<
				TBranchProps,
				| "name"
				| "address"
				| "phone"
				| "isActive"
				| "email"
				| "whatsappNumber"
				| "streetAddress"
				| "addressLocality"
				| "addressRegion"
				| "postalCode"
				| "addressCountry"
				| "latitude"
				| "longitude"
				| "operatingHours"
			>
		>,
	): TBranch => ({
		...branch,
		...updates,
		updatedAt: new Date(),
	}),

	reconstitute: (raw: TBranch): TBranch => ({ ...raw }),
} as const;
