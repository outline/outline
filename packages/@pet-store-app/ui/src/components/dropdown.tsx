import * as React from "react";
import { cn } from "../utils";
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from "./popover";
import {
	Command,
	CommandEmpty,
	CommandGroup,
	CommandInput,
	CommandItem,
	CommandList,
} from "./command";
import {
	AltArrowDownLinear as AltArrowDown,
	CheckCircleLinear as CheckCircle,
} from "solar-icon-set";

export type OptionType = { value: string; label: string };

export interface DropdownProps {
	className?: string;
	options: OptionType[] | string[];
	value?: string | null;
	onChange?: (value: string, actionMeta?: unknown) => void;
	placeholder?: string;
	disabled?: boolean;
	id?: string;
	searchable?: boolean;
}

export function Dropdown({
	className,
	options,
	value,
	onChange,
	placeholder = "Select...",
	disabled,
	id,
	searchable = true,
}: DropdownProps) {
	const [open, setOpen] = React.useState(false);

	const normalizedOptions = React.useMemo(() => {
		return options.map((opt) =>
			typeof opt === "string" ? { value: opt, label: opt } : opt,
		);
	}, [options]);

	const selectedOption = React.useMemo(() => {
		if (value === undefined || value === null) return null;
		return normalizedOptions.find((opt) => opt.value === value) || null;
	}, [value, normalizedOptions]);

	const handleKeyDown = (e: React.KeyboardEvent) => {
		const isShortcutKey = searchable ? e.metaKey || e.ctrlKey : true;

		if (isShortcutKey && /^[1-9]$/.test(e.key)) {
			const num = Number.parseInt(e.key, 10);
			const opt = normalizedOptions[num - 1];
			if (opt) {
				e.preventDefault();
				onChange?.(opt.value === value ? "" : opt.value);
				setOpen(false);
			}
		}
	};

	return (
		<Popover open={open} onOpenChange={setOpen}>
			<PopoverTrigger asChild>
				<button
					id={id}
					type="button"
					disabled={disabled}
					className={cn(
						"flex h-9 w-full items-center justify-between rounded-md border border-input bg-transparent px-3 py-2 text-sm font-medium  transition-colors outline-none hover:bg-accent/50 focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50",
						className,
					)}
				>
					<span
						className={cn(
							"truncate",
							!selectedOption && "text-muted-foreground",
						)}
					>
						{selectedOption ? selectedOption.label : placeholder}
					</span>
					<AltArrowDown
						className="size-4 opacity-50 shrink-0 ml-2"
					/>
				</button>
			</PopoverTrigger>
			<PopoverContent
				className="w-[var(--radix-popover-trigger-width)] p-0"
				align="start"
			>
				<Command onKeyDown={handleKeyDown}>
					{searchable && (
						<CommandInput
							placeholder="Search..."
							className="h-9"
						/>
					)}
					<CommandList>
						<CommandEmpty>No options found.</CommandEmpty>
						<CommandGroup>
							{normalizedOptions.map((opt, index) => (
								<CommandItem
									key={opt.value}
									value={opt.value}
									onSelect={(currentValue) => {
										onChange?.(
											currentValue === value ? "" : opt.value,
										);
										setOpen(false);
									}}
								>
									{opt.label}
									<div className="ml-auto flex items-center gap-3">
										<CheckCircle
											className={cn(
												"size-4 shrink-0",
												value === opt.value
													? "opacity-100"
													: "opacity-0",
											)}
										/>
										{index < 9 && (
											<span className="text-[10px] leading-none text-muted-foreground/70 font-sans border rounded px-1.5 py-0.5 bg-muted/30 shrink-0">
												{searchable
													? `\u2318${index + 1}`
													: index + 1}
											</span>
										)}
									</div>
								</CommandItem>
							))}
						</CommandGroup>
					</CommandList>
				</Command>
			</PopoverContent>
		</Popover>
	);
}
