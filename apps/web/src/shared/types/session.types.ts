export type TSessionInfo = {
	userId: string;
	email: string;
	fullName: string;
	businessId: string;
	businessName: string;
	businessSlug: string;
	businessLogoUrl?: string | null;
	businessSignatureUrl?: string | null;
	businessAddress?: string | null;
	businessPhone?: string | null;
	role: string;
	isAdmin: boolean;
	hasPinSet: boolean;
	branches?: { id: string; name: string }[];
	preferredLanguage?: string;
};
