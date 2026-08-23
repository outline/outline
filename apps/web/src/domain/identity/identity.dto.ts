import type { TBusiness, TProfile } from "./identity.types";

export type TProfileDto = {
	readonly fullName: string | null;
	readonly email: string | null;
};

export type TBusinessDto = {
	readonly id: string;
	readonly name: string;
};

export const toProfileDto = (p: TProfile): TProfileDto => ({
	fullName: p.fullName,
	email: p.email,
});

export const toBusinessDto = (b: TBusiness): TBusinessDto => ({
	id: b.id,
	name: b.name,
});
