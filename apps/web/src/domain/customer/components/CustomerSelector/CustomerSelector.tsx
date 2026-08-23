import { Command as CommandPrimitive } from "cmdk";
import { Check, Plus, Search, User, X } from "lucide-react";
import * as React from "react";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useDebounce } from "@/shared/hooks/use-debounce";
import { cn } from "@/shared/utils";
import type { ICustomer } from "../../customer.types";
import { useCustomers } from "../../hooks/use-customers";

interface CustomerSelectorProps {
	value: string | null;
	selectedName: string;
	onSelectCustomer: (customer: ICustomer) => void;
	onCreateNew: (name: string) => void;
	onClear: () => void;
	placeholder?: string;
	className?: string;
}

export function CustomerSelector({
	value,
	selectedName,
	onSelectCustomer,
	onCreateNew,
	onClear,
	placeholder = "Cari nama atau nomor HP pelanggan...",
	className,
}: CustomerSelectorProps) {
	const [open, setOpen] = React.useState(false);
	const [search, setSearch] = React.useState("");
	const [debouncedSearch] = useDebounce(search, 300);

	const {
		data: customers = [],
		isLoading,
		isError,
		error,
	} = useCustomers(debouncedSearch);
	const inputRef = React.useRef<HTMLInputElement>(null);

	// Sinkronisasi nilai search dengan selectedName jika ada
	React.useEffect(() => {
		if (selectedName && !open) {
			setSearch(selectedName);
		}
	}, [selectedName, open]);

	const handleSelectCustomer = (customer: ICustomer) => {
		setSearch(customer.fullName);
		onSelectCustomer(customer);
		setOpen(false);
		inputRef.current?.blur();
	};

	const handleCreateNew = () => {
		onCreateNew(search);
		setOpen(false);
		inputRef.current?.blur();
	};

	const handleClear = () => {
		setSearch("");
		onClear();
		inputRef.current?.focus();
	};

	const isConfirmed =
		value !== null || (selectedName && selectedName === search);

	return (
		<div className={cn("relative flex flex-col gap-2", className)}>
			<CommandPrimitive
				shouldFilter={false}
				className="overflow-visible bg-transparent"
			>
				<div
					className={cn(
						"flex items-center rounded-md border border-input bg-transparent px-3 text-sm focus-within:ring-1 focus-within:ring-mint-green transition-all",
						isConfirmed ? "border-mint-green bg-mint-green/5" : "",
					)}
				>
					<Search className="mr-2 h-4 w-4 shrink-0 opacity-50" />
					<CommandPrimitive.Input
						ref={inputRef}
						value={search}
						onValueChange={(val) => {
							setSearch(val);
							if (isConfirmed && val !== selectedName) {
								onClear();
							}
						}}
						onFocus={() => setOpen(true)}
						onBlur={() => setTimeout(() => setOpen(false), 200)}
						placeholder={placeholder}
						className="flex h-10 w-full rounded-md bg-transparent py-3 outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50 border-0 focus:ring-0"
					/>

					{isConfirmed && (
						<div className="flex items-center gap-2">
							<Badge
								variant="secondary"
								className={cn(
									"shrink-0 h-5 px-1.5 text-[10px]",
									value ? "bg-mint-green/10 text-mint-green" : "",
								)}
							>
								{value ? "Terdaftar" : "Baru"}
							</Badge>
							<button
								type="button"
								onClick={handleClear}
								className="text-muted-foreground hover:text-ink-black shrink-0"
							>
								<X className="h-4 w-4" />
							</button>
						</div>
					)}
				</div>

				{open && search.length > 0 && (
					<div className="absolute top-12 z-50 w-full rounded-md border bg-popover text-popover-foreground shadow-md outline-none animate-in fade-in-0 zoom-in-95">
						<CommandPrimitive.List className="max-h-[300px] overflow-y-auto overflow-x-hidden p-1">
							{isLoading && (
								<div className="p-2 space-y-2">
									<Skeleton className="h-12 w-full" />
									<Skeleton className="h-12 w-full" />
									<Skeleton className="h-12 w-full" />
								</div>
							)}

							{isError && (
								<div className="py-6 text-center text-sm text-red-500 font-medium">
									{error?.message || "Terjadi kesalahan koneksi"}
								</div>
							)}

							{!isLoading && !isError && customers.length === 0 && (
								<div className="py-6 text-center text-sm text-muted-foreground">
									Pelanggan tidak ditemukan.
								</div>
							)}

							<CommandPrimitive.Group>
								{customers.map((customer) => (
									<CommandPrimitive.Item
										key={customer.id}
										value={customer.id}
										onSelect={() => handleSelectCustomer(customer)}
										className="group relative flex cursor-pointer gap-2 select-none items-center rounded-sm px-2 py-2 text-sm outline-none data-[disabled=true]:pointer-events-none data-[selected=true]:bg-accent data-[selected=true]:text-accent-foreground justify-between"
									>
										<div className="flex items-center gap-3">
											<div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-neutral-100">
												<User className="h-4 w-4 text-neutral-500" />
											</div>
											<div className="flex flex-col">
												<span className="font-medium">{customer.fullName}</span>
												<span className="text-xs text-muted-foreground flex items-center gap-1">
													{customer.phone}
												</span>
											</div>
										</div>
										<div className="flex items-center gap-3">
											<span className="text-[10px] uppercase tracking-wider text-emerald-600 font-bold opacity-0 group-data-[selected=true]:opacity-100 transition-opacity">
												Klik untuk Autofill
											</span>
											<Check
												className={cn(
													"h-4 w-4",
													value === customer.id
														? "opacity-100 text-emerald-600"
														: "opacity-0",
												)}
											/>
										</div>
									</CommandPrimitive.Item>
								))}
							</CommandPrimitive.Group>

							{!isLoading && search.length > 0 && (
								<CommandPrimitive.Group>
									<CommandPrimitive.Item
										value={`create-${search}`}
										onSelect={handleCreateNew}
										className="relative flex cursor-pointer gap-2 select-none items-center rounded-sm px-2 py-3 text-sm outline-none data-[selected=true]:bg-accent data-[selected=true]:text-accent-foreground border-t border-mist-gray mt-1"
									>
										<div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-neutral-100">
											<Plus className="h-4 w-4 text-neutral-500" />
										</div>
										<span className="font-medium">
											Tambah pelanggan baru "{search}"
										</span>
									</CommandPrimitive.Item>
								</CommandPrimitive.Group>
							)}
						</CommandPrimitive.List>
					</div>
				)}
			</CommandPrimitive>
		</div>
	);
}
