import * as React from "react";
import { useTranslation } from "react-i18next";
import {
	AltArrowDownLinear as ArrowDown,
	CheckCircleBold as CompleteIcon,
	PenNewSquareBold as EditIcon,
	MenuDotsBold as MenuDots,
	PrinterBold as PrinterIcon,
	SortVerticalLinear as SortIcon,
	TrashBinMinimalisticBold as TrashIcon,
	EyeBold as ViewIcon,
} from "solar-icon-set";
import { Checkbox } from "@/components/ui/checkbox";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { usePagination } from "@/hooks/use-pagination";
import { useLanguage } from "@/shared/i18n";
import { cn } from "@/shared/utils";
import { formatDate } from "@/shared/utils/format";
import { EmptyState, StatusBadge, Table, TableCell, TableRow } from "@/ui";
import { TablePagination } from "@/ui/table/table-pagination";
import type { TBoardingWithPetsDto } from "../../boarding.dto";

export type TBoardingTableProps = {
	readonly boardings: readonly TBoardingWithPetsDto[];
	readonly isLoading: boolean;
	readonly onDelete: (id: string) => void;
	readonly onView?: (id: string) => void;
	readonly onEdit?: (id: string) => void;
	readonly onComplete?: (id: string) => void;
	readonly flat?: boolean;
};

const getStatusType = (
	status: string,
): "success" | "warning" | "error" | "info" | "neutral" => {
	switch (status) {
		case "active":
			return "success";
		case "completed":
			return "info";
		case "cancelled":
			return "error";
		case "draft":
			return "warning";
		default:
			return "neutral";
	}
};

export const BoardingTable = ({
	boardings,
	onDelete,
	onView,
	onEdit,
	onComplete,
	flat = false,
}: TBoardingTableProps) => {
	const { language } = useLanguage();
	const { t } = useTranslation();
	const [selectedIds, setSelectedIds] = React.useState<Set<string>>(new Set());
	const { paginatedData, ...pagination } = usePagination(boardings);

	// Helper functions
	const toggleSelectAll = () => {
		if (selectedIds.size === boardings.length) {
			setSelectedIds(new Set());
		} else {
			setSelectedIds(new Set(boardings.map((b) => b.id)));
		}
	};

	const toggleSelect = (id: string) => {
		const next = new Set(selectedIds);
		if (next.has(id)) {
			next.delete(id);
		} else {
			next.add(id);
		}
		setSelectedIds(next);
	};

	const HEADERS = [
		<Checkbox
			key="select-all"
			checked={boardings.length > 0 && selectedIds.size === boardings.length}
			onCheckedChange={toggleSelectAll}
		/>,
		<div
			key="pemilik"
			className="flex items-center gap-1 cursor-pointer hover:text-neutral-900 transition-colors"
		>
			{t("boarding.owner", "PEMILIK")} <SortIcon className="w-3 h-3" />
		</div>,
		<div
			key="hewan"
			className="flex items-center gap-1 cursor-pointer hover:text-neutral-900 transition-colors"
		>
			{t("boarding.pet", "HEWAN")} <SortIcon className="w-3 h-3" />
		</div>,
		<div
			key="periode"
			className="flex items-center gap-1 cursor-pointer hover:text-neutral-900 transition-colors"
		>
			{t("boarding.period", "PERIODE")}{" "}
			<ArrowDown className="w-3 h-3 text-emerald-500" />
		</div>,
		<div
			key="status"
			className="flex items-center gap-1 cursor-pointer hover:text-neutral-900 transition-colors"
		>
			{t("common.status", "STATUS")} <SortIcon className="w-3 h-3" />
		</div>,
		t("common.action", "AKSI"),
	];
	return (
		<>
			<Table headers={HEADERS} flat={flat}>
				{boardings.length === 0 ? (
					<TableRow>
						<TableCell colSpan={HEADERS.length} className="p-0 border-none">
							<EmptyState
								variant="boarding"
								title={t("boarding.empty_active", "Tidak ada monitoring aktif")}
								description={t(
									"boarding.empty_active_desc",
									"Belum ada hewan yang sedang menginap di cabang ini.",
								)}
								className="border-none py-12 bg-transparent"
							/>
						</TableCell>
					</TableRow>
				) : (
					paginatedData.map((b) => (
						<TableRow
							key={b.id}
							className={cn(
								selectedIds.has(b.id) ? "bg-mint-green/5" : "",
								onView && "cursor-pointer",
							)}
							onClick={() => onView?.(b.id)}
						>
							{/* ... (selection checkbox) */}
							<TableCell className="w-10" onClick={(e) => e.stopPropagation()}>
								<Checkbox
									checked={selectedIds.has(b.id)}
									onCheckedChange={() => toggleSelect(b.id)}
								/>
							</TableCell>
							<TableCell>
								<div className="flex flex-col">
									<span className="font-bold text-neutral-900 text-[13px]">
										{b.ownerName}
									</span>
									<span className="text-[10px] text-neutral-400 font-mono tracking-tighter">
										#{b.id.slice(0, 5)}
									</span>
								</div>
							</TableCell>
							<TableCell>
								<div className="flex flex-col gap-0.5">
									{b.pets.map((p, idx) => (
										<div key={p.id} className="flex items-baseline gap-1.5">
											<span className="text-[10px] text-neutral-400 font-medium min-w-[14px]">
												{idx + 1}.
											</span>
											<span className="text-[12px] font-medium text-neutral-900">
												{p.name}
											</span>
											<span className="text-[10px] text-neutral-400">
												— {t(`boarding.${p.kind}`, p.kind)}
											</span>
										</div>
									))}
								</div>
							</TableCell>
							<TableCell className="text-[12px] tabular-nums">
								<div className="flex flex-col">
									<span>
										{formatDate(b.checkInDate, language, {
											day: "numeric",
											month: "short",
										})}
									</span>
									<span className="text-neutral-400">
										→{" "}
										{b.estimatedCheckOutDate
											? formatDate(b.estimatedCheckOutDate, language, {
													day: "numeric",
													month: "short",
												})
											: "-"}
									</span>
								</div>
							</TableCell>
							<TableCell>
								<StatusBadge
									type={getStatusType(b.status)}
									label={t(`boardings.${b.status}`, b.status)}
									className="h-5 text-[9px] px-2"
								/>
							</TableCell>
							<TableCell align="right" onClick={(e) => e.stopPropagation()}>
								<DropdownMenu>
									<DropdownMenuTrigger asChild>
										<div className="w-8 h-8 rounded-lg hover:bg-neutral-100 flex items-center justify-center cursor-pointer transition-colors group/action">
											<MenuDots className="w-4 h-4 text-neutral-400 group-hover/action:text-neutral-900" />
										</div>
									</DropdownMenuTrigger>
									<DropdownMenuContent align="end" className="w-40">
										<DropdownMenuItem
											className="flex items-center gap-2 cursor-pointer py-2 px-2.5"
											onClick={() => onView?.(b.id)}
										>
											<ViewIcon className="w-4 h-4 text-neutral-500" />
											<span className="text-[13px]">{t("common.detail")}</span>
										</DropdownMenuItem>
										<DropdownMenuItem className="p-0">
											<a
												href={`/api/pdf?type=boarding&id=${b.id}`}
												target="_blank"
												rel="noreferrer"
												className="flex items-center gap-2 cursor-pointer w-full py-2 px-2.5"
											>
												<PrinterIcon className="w-4 h-4 text-neutral-500" />
												<span className="text-[13px]">{t("common.print")}</span>
											</a>
										</DropdownMenuItem>
										<DropdownMenuItem
											className="flex items-center gap-2 cursor-pointer py-2 px-2.5"
											onClick={() => onEdit?.(b.id)}
										>
											<EditIcon className="w-4 h-4 text-neutral-500" />
											<span className="text-[13px]">{t("common.edit")}</span>
										</DropdownMenuItem>
										<DropdownMenuItem
											className="flex items-center gap-2 cursor-pointer py-2 px-2.5 text-emerald-600 focus:text-emerald-600"
											onClick={() => onComplete?.(b.id)}
											disabled={b.status !== "active"}
										>
											<CompleteIcon className="w-4 h-4" />
											<span className="text-[13px]">
												{t("common.finish", "Selesai")}
											</span>
										</DropdownMenuItem>
										<DropdownMenuSeparator />
										<DropdownMenuItem
											className="flex items-center gap-2 cursor-pointer py-2 px-2.5 text-rose-600 focus:text-rose-600"
											onClick={() => onDelete(b.id)}
										>
											<TrashIcon className="w-4 h-4" />
											<span className="text-[13px]">{t("common.delete")}</span>
										</DropdownMenuItem>
									</DropdownMenuContent>
								</DropdownMenu>
							</TableCell>
						</TableRow>
					))
				)}
			</Table>
			{boardings.length > 0 && <TablePagination {...pagination} />}
		</>
	);
};
