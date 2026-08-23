import { format } from "date-fns";
import type { DateRange, TimeFormat } from "./datetimepicker-types";

export function formatDateInputDisplay(
	value: Date | DateRange | null | undefined,
	enableTime: boolean,
	timeFormat: TimeFormat,
	displayFormat: string,
): string {
	if (!value) return "";

	const timeSuffix = enableTime
		? timeFormat === "24h"
			? " HH:mm"
			: " hh:mm a"
		: "";

	const fullFormat = `${displayFormat}${timeSuffix}`;

	if (value instanceof Date) {
		return format(value, fullFormat);
	}

	if ("from" in value) {
		const { from, to } = value as DateRange;
		if (!from) return "";
		if (!to) return format(from, fullFormat);
		return `${format(from, fullFormat)} - ${format(to, fullFormat)}`;
	}

	return "";
}

export function getHourOptions(timeFormat: TimeFormat): number[] {
	if (timeFormat === "24h") {
		return Array.from({ length: 24 }, (_, i) => i);
	}
	return Array.from({ length: 12 }, (_, i) => i + 1);
}

export function getMinuteOptions(): number[] {
	return Array.from({ length: 12 }, (_, i) => i * 5);
}

export function formatHour(hour: number, timeFormat: TimeFormat): string {
	if (timeFormat === "24h") {
		return hour.toString().padStart(2, "0");
	}
	return hour.toString();
}

export function formatMinute(minute: number): string {
	return minute.toString().padStart(2, "0");
}

export function getPeriod(hour: number): "AM" | "PM" {
	return hour >= 12 ? "PM" : "AM";
}

export function convertTo12Hour(hour24: number): {
	hour: number;
	period: "AM" | "PM";
} {
	if (hour24 === 0) return { hour: 12, period: "AM" };
	if (hour24 < 12) return { hour: hour24, period: "AM" };
	if (hour24 === 12) return { hour: 12, period: "PM" };
	return { hour: hour24 - 12, period: "PM" };
}

export function convertTo24Hour(
	hour12: number,
	period: "AM" | "PM",
): number {
	if (period === "AM" && hour12 === 12) return 0;
	if (period === "AM") return hour12;
	if (period === "PM" && hour12 === 12) return 12;
	return hour12 + 12;
}
