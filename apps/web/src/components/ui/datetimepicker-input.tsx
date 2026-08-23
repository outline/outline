"use client";

import { memo, useCallback, useState } from "react";
import {
	CalendarLinear as CalendarIcon,
	CloseCircleLinear as XIcon,
	ArrowRightLinear as ArrowRightIcon,
} from "solar-icon-set";
import { AnimatePresence, motion } from "motion/react";
import type {
	DateRange,
	DateTimePickerProps,
} from "@/components/ui/datetimepicker";
import { DateTimePicker } from "@/components/ui/datetimepicker";
import { formatDateInputDisplay } from "@/components/ui/datetimepicker/datetimepicker-utils";
import {
	InputGroup,
	InputGroupAddon,
	InputGroupButton,
	InputGroupInput,
	InputGroupText,
} from "@/components/ui/input-group";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/shared/utils";

export interface DateTimeInputProps extends Partial<DateTimePickerProps> {
	value?: Date | DateRange | null;
	onValueChange?: (value: Date | DateRange | null) => void;
	displayFormat?: string;
	placeholder?: string;
	clearable?: boolean;
	name?: string;
	id?: string;
	disabled?: boolean;
	numberOfMonths?: number;
	onClear?: () => void;
}

export const DateTimeInput = memo(
	({
		mode,
		enableTime = false,
		timeFormat = "12h",
		value,
		onValueChange,
		placeholder = "Select Date",
		clearable = true,
		onClear,
		className,
		displayFormat = "MM/dd/yyyy",
		...props
	}: DateTimeInputProps) => {
		const [isOpen, setIsOpen] = useState(false);

		const displayValue = mode === "range" ? "" : formatDateInputDisplay(
			value ?? null,
			enableTime,
			timeFormat,
			displayFormat,
		);

		const rangeValue = mode === "range" && value && "from" in value ? (value as DateRange) : null;
		const fromDisplay = rangeValue?.from
			? formatDateInputDisplay(rangeValue.from, enableTime, timeFormat, displayFormat)
			: "";
		const toDisplay = rangeValue?.to
			? formatDateInputDisplay(rangeValue.to, enableTime, timeFormat, displayFormat)
			: "";

		const handleDateChange = useCallback(
			(newValue: Date | DateRange | null) => {
				onValueChange?.(newValue);
			},
			[onValueChange],
		);

		const handleClear = useCallback(
			(e: React.MouseEvent) => {
				e.stopPropagation();
				onValueChange?.(null);
				onClear?.();
			},
			[onValueChange, onClear],
		);

		return (
			<div
				data-slot="datetimepicker-input"
				className="relative w-full"
			>
				<Popover open={isOpen} onOpenChange={setIsOpen}>
					<PopoverTrigger asChild>
						<div className="relative flex items-center">
							<InputGroup className="w-full relative overflow-hidden">
								<InputGroupAddon align="inline-start" className="pl-3 text-neutral-500">
									<InputGroupText>
										<CalendarIcon className="h-4 w-4" />
									</InputGroupText>
								</InputGroupAddon>

								{mode === "range" ? (
									<div className="flex w-full items-center divide-x divide-neutral-200">
										<input
											readOnly
											className="w-full bg-transparent pl-3 pr-2 py-2 text-[14px] outline-none cursor-pointer placeholder:text-neutral-400 text-left"
											placeholder="Check-in"
											value={fromDisplay}
										/>
										<div className="px-2 text-neutral-400 shrink-0">
											<ArrowRightIcon className="w-3.5 h-3.5" />
										</div>
										<input
											readOnly
											className="w-full bg-transparent pl-3 pr-8 py-2 text-[14px] outline-none cursor-pointer placeholder:text-neutral-400 text-left"
											placeholder="Checkout"
											value={toDisplay}
										/>
									</div>
								) : (
									<InputGroupInput
										placeholder={placeholder}
										value={displayValue}
										readOnly
										className="cursor-pointer"
									/>
								)}
								
								<InputGroupAddon align="inline-end" className={mode === "range" ? "absolute right-0 top-0 bottom-0 pr-2 bg-white" : ""}>
									<InputGroupButton
										onClick={handleClear}
										className={cn(
											"rounded-full hover:bg-neutral-100 p-1",
											clearable && (displayValue || fromDisplay || toDisplay)
												? "visible"
												: "invisible",
										)}
									>
										<XIcon className="h-4 w-4 text-neutral-400" />
									</InputGroupButton>
								</InputGroupAddon>
							</InputGroup>
						</div>
					</PopoverTrigger>
					<PopoverContent className="w-auto p-0 border-none bg-transparent shadow-none" align="start">
						<DateTimePicker
							mode={mode ?? "single"}
							enableTime={enableTime}
							timeFormat={timeFormat}
							onDateChange={handleDateChange}
							onClose={() => setIsOpen(false)}
							disableInitialAnimation={true}
							{...(value !== undefined ? { value } : {})}
							{...props}
						/>
					</PopoverContent>
				</Popover>
			</div>
		);
	},
);

DateTimeInput.displayName = "DateTimeInput";
