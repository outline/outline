export interface TAuthCredentials {
	readonly email: string;
	readonly password: string;
}

export interface TSignupInput extends TAuthCredentials {
	readonly fullName: string;
	readonly businessName: string;
}

export interface TAuthResult {
	readonly userId: string;
}

export interface TSignupResult {
	readonly userId: string;
	readonly businessId: string;
}

export interface TSessionDto {
	readonly user: {
		readonly id: string;
		readonly email: string;
		readonly name: string;
		readonly avatarUrl: string | null;
		readonly language: string;
		readonly role: string;
	};
	readonly business: {
		readonly id: string;
		readonly name: string;
		readonly slug: string;
		readonly logoUrl: string | null;
	};
	readonly branches: readonly {
		readonly id: string;
		readonly name: string;
	}[];
	readonly permissions: Readonly<Record<string, boolean>>;
}
