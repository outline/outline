import { useTranslation } from "react-i18next";
import {
	FilterLinear as Filter,
	MagniferLinear as Search,
} from "solar-icon-set";
import type { DateRange } from "@/components/ui/datetimepicker";
import { DateTimeInput } from "@/components/ui/datetimepicker-input";
import { Input } from "@/components/ui/input";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";

export type TBoardingFiltersProps = {
	readonly searchQuery: string;
	readonly onSearchChange: (val: string) => void;
	readonly statusFilter: string;
	readonly onStatusChange: (val: string) => void;
	readonly fromDate: string;
	readonly toDate: string;
	readonly onDateRangeChange: (from: string, to: string) => void;
};

export function BoardingFilters({
	searchQuery,
	onSearchChange,
	statusFilter,
	onStatusChange,
	fromDate,
	toDate,
	onDateRangeChange,
}: TBoardingFiltersProps) {
	const { t } = useTranslation();

	return (
		<div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
			<div className="relative flex-1 md:w-72">
				<Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
				<Input
					type="text"
					placeholder={t("boarding.search_placeholder")}
					value={searchQuery}
					onChange={(e) => onSearchChange(e.target.value)}
					className="pl-10"
				/>
			</div>

			<div className="w-full md:w-[320px] relative z-20">
				<DateTimeInput
					mode="range"
					value={
						fromDate
							? {
									from: new Date(fromDate),
									to: toDate ? new Date(toDate) : undefined,
								}
							: null
					}
					onValueChange={(val) => {
						if (val && "from" in val) {
							const range = val as DateRange;
							onDateRangeChange(
								range.from ? range.from.toISOString().split("T")[0] || "" : "",
								range.to ? range.to.toISOString().split("T")[0] || "" : "",
							);
						} else {
							onDateRangeChange("", "");
						}
					}}
					placeholder="Filter tanggal..."
				/>
			</div>

			<div className="relative">
				<Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400 z-10 pointer-events-none" />
				<Select value={statusFilter} onValueChange={onStatusChange}>
					<SelectTrigger className="h-10 pl-10 rounded-xl border-neutral-200 text-[13px]">
						<SelectValue placeholder={t("boarding.all_status")} />
					</SelectTrigger>
					<SelectContent>
						<SelectItem value="all">{t("boarding.all_status")}</SelectItem>
						<SelectItem value="active">{t("common.active")}</SelectItem>
						<SelectItem value="completed">
							{t("common.completed", "Selesai")}
						</SelectItem>
						<SelectItem value="draft">{t("common.draft", "Draft")}</SelectItem>
						<SelectItem value="cancelled">
							{t("common.cancelled", "Dibatalkan")}
						</SelectItem>
					</SelectContent>
				</Select>
			</div>
		</div>
	);
}
