import type { TBusiness, TProfile } from "./identity.types";

export const IdentityModule = {
	reconstituteProfile: (raw: TProfile): TProfile => ({ ...raw }),
	reconstituteBusiness: (raw: TBusiness): TBusiness => ({ ...raw }),
} as const;
