"use client";

import { useCallback, useState } from "react";
import type React from "react";
import {
	AltArrowDownLinear as ChevronDownIcon,
	ClockCircleLinear as ClockIcon,
	CloseCircleLinear as CloseIcon,
	CheckCircleLinear as CheckIcon,
} from "solar-icon-set";
import { Calendar } from "../calendar";
import { Button } from "../button";
import { cn } from "../../utils";
import type {
	DateRange,
	DateTimePickerProps,
	TimeFormat,
} from "./datetimepicker-types";
import {
	convertTo12Hour,
	convertTo24Hour,
	formatHour,
	formatMinute,
	getHourOptions,
	getMinuteOptions,
	getPeriod,
} from "./datetimepicker-utils";

export function DateTimePicker({
	mode = "single",
	enableTime = false,
	timeFormat = "12h",
	value,
	onDateChange,
	onClose,
	className,
	minDate,
	maxDate,
	numberOfMonths = 1,
	...props
}: DateTimePickerProps) {
	const [tempValue, setTempValue] = useState<Date | DateRange | null>(
		value ?? null,
	);
	const [view, setView] = useState<"calendar" | "time">("calendar");

	const handleCalendarSelect = useCallback(
		(selected: Date | undefined) => {
			if (mode === "single") {
				if (enableTime && selected) {
					const prev = tempValue instanceof Date ? tempValue : new Date();
					const hours = prev.getHours();
					const minutes = prev.getMinutes();
					const newDate = new Date(selected);
					newDate.setHours(hours, minutes);
					setTempValue(newDate);
				} else {
					setTempValue(selected ?? null);
				}
			}
		},
		[mode, enableTime, tempValue],
	);

	const handleRangeSelect = useCallback(
		(selected: DateRange | undefined) => {
			if (mode === "range") {
				setTempValue(selected ?? null);
			}
		},
		[mode],
	);

	const handleTimeChange = useCallback(
		(
			field: "hour" | "minute" | "period",
			rawValue: string,
		) => {
			const numValue = Number.parseInt(rawValue, 10);
			const currentDate =
				tempValue instanceof Date
					? new Date(tempValue)
					: new Date();

			if (field === "hour") {
				if (timeFormat === "24h") {
					currentDate.setHours(numValue);
				} else {
					const period = getPeriod(currentDate.getHours());
					currentDate.setHours(convertTo24Hour(numValue, period));
				}
			} else if (field === "minute") {
				currentDate.setMinutes(numValue);
			} else if (field === "period") {
				const current12 = convertTo12Hour(currentDate.getHours());
				const newPeriod = numValue === 0 ? "AM" : "PM";
				currentDate.setHours(
					convertTo24Hour(current12.hour, newPeriod),
				);
			}

			setTempValue(currentDate);
		},
		[tempValue, timeFormat],
	);

	const handleConfirm = useCallback(() => {
		onDateChange?.(tempValue);
		onClose?.();
	}, [tempValue, onDateChange, onClose]);

	const currentDate =
		tempValue instanceof Date
			? tempValue
			: tempValue && "from" in tempValue
				? tempValue.from
				: undefined;

	const currentHour = currentDate ? currentDate.getHours() : 12;
	const currentMinute = currentDate ? currentDate.getMinutes() : 0;
	const { hour: displayHour, period: displayPeriod } =
		convertTo12Hour(currentHour);

	return (
		<div
			data-slot="datetime-picker"
			className={cn(
				"rounded-lg border bg-popover p-3 ",
				className,
			)}
		>
			{view === "calendar" && (
				<div>
					{mode === "single" ? (
						<Calendar
							mode="single"
							selected={currentDate}
							onSelect={handleCalendarSelect}
							disabled={[
								...(minDate ? [{ before: minDate }] : []),
								...(maxDate ? [{ after: maxDate }] : []),
							]}
							defaultMonth={currentDate ?? new Date()}
							numberOfMonths={numberOfMonths}
							{...props}
						/>
					) : (
						<Calendar
							mode="range"
							{...(tempValue && "from" in tempValue
								? { selected: tempValue as DateRange }
								: {})}
							onSelect={handleRangeSelect as never}
							disabled={[
								...(minDate ? [{ before: minDate }] : []),
								...(maxDate ? [{ after: maxDate }] : []),
							]}
							{...(tempValue && "from" in tempValue && (tempValue as DateRange).from
								? { defaultMonth: (tempValue as DateRange).from as Date }
								: {})}
							numberOfMonths={numberOfMonths}
							{...props}
						/>
					)}

					{enableTime && (
						<div className="mt-3 flex items-center justify-center border-t pt-3">
							<Button
								type="button"
								variant="ghost"
								size="sm"
								onClick={() => setView("time")}
							>
								<ClockIcon className="h-4 w-4" />
								{currentDate
									? `${formatHour(timeFormat === "24h" ? currentHour : displayHour, timeFormat)}:${formatMinute(currentMinute)}${timeFormat === "12h" ? ` ${displayPeriod}` : ""}`
									: "Set time"}
							</Button>
						</div>
					)}
				</div>
			)}

			{view === "time" && (
				<div className="space-y-4">
					<div className="flex items-center justify-between">
						<Button
							type="button"
							variant="ghost"
							size="sm"
							onClick={() => setView("calendar")}
						>
							Back to calendar
						</Button>
						<span className="text-sm font-medium">Select Time</span>
					</div>

					<div className="flex items-center justify-center gap-2">
						<WheelSelect
							label="Hour"
							value={
								timeFormat === "24h"
									? currentHour.toString()
									: displayHour.toString()
							}
							options={getHourOptions(timeFormat).map((h) => ({
								value: h.toString(),
								label: formatHour(h, timeFormat),
							}))}
							onChange={(v) => handleTimeChange("hour", v)}
						/>
						<span className="text-lg font-bold text-muted-foreground">:</span>
						<WheelSelect
							label="Min"
							value={currentMinute.toString()}
							options={getMinuteOptions().map((m) => ({
								value: m.toString(),
								label: formatMinute(m),
							}))}
							onChange={(v) => handleTimeChange("minute", v)}
						/>
						{timeFormat === "12h" && (
							<WheelSelect
								label="Period"
								value={displayPeriod === "AM" ? "0" : "1"}
								options={[
									{ value: "0", label: "AM" },
									{ value: "1", label: "PM" },
								]}
								onChange={(v) => handleTimeChange("period", v)}
							/>
						)}
					</div>
				</div>
			)}

			<div className="mt-3 flex items-center justify-end gap-2 border-t pt-3">
				<Button type="button" variant="ghost" size="sm" onClick={onClose}>
					<CloseIcon className="mr-2 h-4 w-4" />
					Cancel
				</Button>
				<Button type="button" size="sm" onClick={handleConfirm}>
					<CheckIcon className="mr-2 h-4 w-4" />
					Done
				</Button>
			</div>
		</div>
	);
}

function WheelSelect({
	label,
	value,
	options,
	onChange,
}: {
	label: string;
	value: string;
	options: { value: string; label: string }[];
	onChange: (value: string) => void;
}) {
	return (
		<div className="flex flex-col items-center gap-1">
			<span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
				{label}
			</span>
			<div className="relative">
				<select
					value={value}
					onChange={(e) => onChange(e.target.value)}
					className="h-10 w-14 appearance-none rounded-md border bg-background text-center text-sm font-medium focus:outline-none focus:ring-1 focus:ring-ring cursor-pointer"
				>
					{options.map((opt) => (
						<option key={opt.value} value={opt.value}>
							{opt.label}
						</option>
					))}
				</select>
				<ChevronDownIcon className="pointer-events-none absolute right-1 top-1/2 h-3 w-3 -translate-y-1/2 text-muted-foreground" />
			</div>
		</div>
	);
}
