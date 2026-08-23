import { useTranslation } from "react-i18next";
import {
	AltArrowLeftLinear as ChevronLeft,
	AltArrowRightLinear as ChevronRight,
	DoubleAltArrowLeftLinear as DoubleChevronLeft,
	DoubleAltArrowRightLinear as DoubleChevronRight,
} from "solar-icon-set";
import { Button } from "@/components/ui/button";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";

export type TablePaginationProps = {
	readonly currentPage: number;
	readonly totalPages: number;
	readonly totalItems: number;
	readonly pageSize: number;
	readonly onPageChange: (page: number) => void;
	readonly onPageSizeChange: (size: number) => void;
	readonly pageSizeOptions?: number[];
};

export const TablePagination = ({
	currentPage,
	totalPages,
	totalItems,
	pageSize,
	onPageChange,
	onPageSizeChange,
	pageSizeOptions = [10, 20, 30, 50],
}: TablePaginationProps) => {
	const { t } = useTranslation();

	const startItem = totalItems === 0 ? 0 : (currentPage - 1) * pageSize + 1;
	const endItem = Math.min(currentPage * pageSize, totalItems);

	return (
		<div className="flex flex-col sm:flex-row items-center justify-between px-2 py-4 gap-4 mt-4 text-sm text-neutral-500">
			<div className="flex items-center gap-4 flex-1">
				<div className="flex items-center gap-2">
					<p className="whitespace-nowrap">{t("common.rows_per_page")}</p>
					<Select
						value={pageSize.toString()}
						onValueChange={(val) => onPageSizeChange(Number(val))}
					>
						<SelectTrigger className="h-8 w-[70px] bg-white">
							<SelectValue placeholder={pageSize} />
						</SelectTrigger>
						<SelectContent side="top">
							{pageSizeOptions.map((size) => (
								<SelectItem key={size} value={size.toString()}>
									{size}
								</SelectItem>
							))}
						</SelectContent>
					</Select>
				</div>
				<p className="hidden sm:block">
					{t("common.showing_range", {
						start: startItem,
						end: endItem,
						total: totalItems,
					})}
				</p>
			</div>

			<div className="flex items-center gap-2">
				<p className="whitespace-nowrap mr-2">
					{t("common.page_of", { current: currentPage, total: totalPages })}
				</p>
				<div className="flex items-center gap-1">
					<Button
						variant="outline"
						className="h-8 w-8 p-0 bg-white"
						onClick={() => onPageChange(1)}
						disabled={currentPage === 1}
					>
						<span className="sr-only">Go to first page</span>
						<DoubleChevronLeft className="h-4 w-4" />
					</Button>
					<Button
						variant="outline"
						className="h-8 w-8 p-0 bg-white"
						onClick={() => onPageChange(currentPage - 1)}
						disabled={currentPage === 1}
					>
						<span className="sr-only">Go to previous page</span>
						<ChevronLeft className="h-4 w-4" />
					</Button>
					<Button
						variant="outline"
						className="h-8 w-8 p-0 bg-white"
						onClick={() => onPageChange(currentPage + 1)}
						disabled={currentPage === totalPages || totalPages === 0}
					>
						<span className="sr-only">Go to next page</span>
						<ChevronRight className="h-4 w-4" />
					</Button>
					<Button
						variant="outline"
						className="h-8 w-8 p-0 bg-white"
						onClick={() => onPageChange(totalPages)}
						disabled={currentPage === totalPages || totalPages === 0}
					>
						<span className="sr-only">Go to last page</span>
						<DoubleChevronRight className="h-4 w-4" />
					</Button>
				</div>
			</div>
		</div>
	);
};
