import React, { useState, useEffect, useRef } from "react";
import { Check, ChevronsUpDown, Loader2 } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useDebounce } from "use-debounce";
import { cn } from "@/shared/utils";
import { Button } from "@/components/ui/button";
import {
	Command,
	CommandEmpty,
	CommandGroup,
	CommandInput,
	CommandItem,
	CommandList,
} from "@/components/ui/command";
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from "@/components/ui/popover";

export type TOption = {
	label: string;
	value: string;
	doc?: Record<string, unknown>; // Store full linked document here
};

export interface AsyncSelectProps {
	value?: string;
	onChange: (value: string, option?: TOption) => void;
	fetchOptions: (search: string) => Promise<TOption[]>;
	placeholder?: string;
	emptyText?: string;
	disabled?: boolean;
}

export function AsyncSelect({
	value,
	onChange,
	fetchOptions,
	placeholder = "Pilih...",
	emptyText = "Data tidak ditemukan.",
	disabled = false,
}: AsyncSelectProps) {
	const [open, setOpen] = useState(false);
	const [options, setOptions] = useState<TOption[]>([]);
	const [search, setSearch] = useState("");
	const [debouncedSearch] = useDebounce(search, 300);
	const [isLoading, setIsLoading] = useState(false);
	const { t } = useTranslation();

	const [selectedLabel, setSelectedLabel] = useState<string>("");

	useEffect(() => {
		let isMounted = true;

		const loadOptions = async () => {
			setIsLoading(true);
			try {
				const data = await fetchOptions(debouncedSearch);
				if (isMounted) {
					setOptions(data);
					// Set initial label if value is present and we found it
					if (value) {
						const found = data.find((opt) => opt.value === value);
						if (found) setSelectedLabel(found.label);
					}
				}
			} catch (error) {
				console.error("Failed to fetch options", error);
			} finally {
				if (isMounted) setIsLoading(false);
			}
		};

		loadOptions();

		return () => {
			isMounted = false;
		};
	}, [debouncedSearch, fetchOptions, value]);

	return (
		<Popover open={open} onOpenChange={setOpen}>
			<PopoverTrigger asChild>
				<Button
					variant="outline"
					role="combobox"
					aria-expanded={open}
					className="w-full justify-between font-normal bg-white"
					disabled={disabled}
				>
					{selectedLabel || <span className="text-muted-foreground">{placeholder}</span>}
					{isLoading ? (
						<Loader2 className="ml-2 h-4 w-4 shrink-0 animate-spin opacity-50" />
					) : (
						<ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
					)}
				</Button>
			</PopoverTrigger>
			<PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
				<Command shouldFilter={false}>
					<CommandInput
						placeholder="Cari..."
						value={search}
						onValueChange={setSearch}
					/>
					<CommandList>
						<CommandEmpty>
							{isLoading ? "Memuat..." : emptyText}
						</CommandEmpty>
						<CommandGroup>
							{options.map((option) => (
								<CommandItem
									key={option.value}
									value={option.value}
									onSelect={(currentValue) => {
										onChange(currentValue, option);
										setSelectedLabel(option.label);
										setOpen(false);
									}}
								>
									<Check
										className={cn(
											"mr-2 h-4 w-4",
											value === option.value ? "opacity-100" : "opacity-0"
										)}
									/>
									{option.label}
								</CommandItem>
							))}
						</CommandGroup>
					</CommandList>
				</Command>
			</PopoverContent>
		</Popover>
	);
}
