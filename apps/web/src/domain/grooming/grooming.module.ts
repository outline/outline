import type { TGroomingService, TPetSize } from "./grooming.types";

export function calculateBasePrice(
	service: TGroomingService,
	petSize: TPetSize,
): number {
	switch (petSize) {
		case "small":
			return service.priceSmall;
		case "medium":
			return service.priceMedium;
		case "large":
			return service.priceLarge;
		case "xl":
			return service.priceXl;
		default:
			return service.priceMedium;
	}
}

export function calculateEndTime(
	startTime: Date,
	durationMinutes: number,
): Date {
	const endTime = new Date(startTime);
	endTime.setMinutes(endTime.getMinutes() + durationMinutes);
	return endTime;
}
