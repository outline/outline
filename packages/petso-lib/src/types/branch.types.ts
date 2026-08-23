export type TDayHoursDto = {
	readonly opens: string;
	readonly closes: string;
	readonly isClosed: boolean;
};

export type TOperatingHoursDto = {
	readonly monday: TDayHoursDto;
	readonly tuesday: TDayHoursDto;
	readonly wednesday: TDayHoursDto;
	readonly thursday: TDayHoursDto;
	readonly friday: TDayHoursDto;
	readonly saturday: TDayHoursDto;
	readonly sunday: TDayHoursDto;
};

export type TBranchContactDto = {
	readonly id: string;
	readonly name: string;
	readonly isActive: boolean;
	readonly email: string | null;
	readonly whatsappNumber: string | null;
	readonly streetAddress: string | null;
	readonly addressLocality: string | null;
	readonly addressRegion: string | null;
	readonly postalCode: string | null;
	readonly addressCountry: string | null;
	readonly latitude: number | null;
	readonly longitude: number | null;
	readonly operatingHours: TOperatingHoursDto | null;
};
