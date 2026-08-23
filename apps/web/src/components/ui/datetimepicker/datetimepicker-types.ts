export type DateRange = {
	from: Date | undefined;
	to?: Date | undefined;
};

export type TimeFormat = "12h" | "24h";

export type DateTimePickerMode = "single" | "range";

export interface DateTimePickerProps {
	/** Selection mode: single date or date range */
	mode?: DateTimePickerMode;
	/** Enable time selection */
	enableTime?: boolean;
	/** Time format: 12h or 24h */
	timeFormat?: TimeFormat;
	/** Current value */
	value?: Date | DateRange | null;
	/** Callback when date changes */
	onDateChange?: (value: Date | DateRange | null) => void;
	/** Callback when picker closes */
	onClose?: () => void;
	/** Disable initial animation */
	disableInitialAnimation?: boolean;
	/** Minimum selectable date */
	minDate?: Date;
	/** Maximum selectable date */
	maxDate?: Date;
	/** Placeholder text */
	placeholder?: string;
	/** Additional className */
	className?: string;
	/** Number of months to display */
	numberOfMonths?: number;
}
