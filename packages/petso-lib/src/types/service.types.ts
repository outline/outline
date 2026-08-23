export type TServiceDto = {
	readonly id: string;
	readonly name: string;
	readonly description: string | null;
	readonly durationMinutes: number;
	readonly price: number;
	readonly category: "freshwater" | "saltwater" | "terrarium" | "other" | null;
};
