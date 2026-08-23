import { useTranslation } from "react-i18next";
import {
	PenNewSquareLinear as Pencil,
	TrashBinMinimalisticLinear as Trash,
} from "solar-icon-set";
import { usePagination } from "@/hooks/use-pagination";
import { Button, Table, TableCell, TableRow } from "@/ui";
import { TablePagination } from "@/ui/table/table-pagination";
import { SafeHtml } from "@/shared/components/SafeHtml";
import type { ICustomer } from "../customer.types";

export type TCustomerTableProps = {
	readonly customers: readonly ICustomer[];
	readonly onEdit: (customer: ICustomer) => void;
	readonly onDelete: (customer: ICustomer) => void;
	readonly onView: (customer: ICustomer) => void;
};

export const CustomerTable = ({
	customers,
	onEdit,
	onDelete,
	onView,
}: TCustomerTableProps) => {
	const { paginatedData, ...pagination } = usePagination(customers);
	const { t } = useTranslation();

	const HEADERS = [
		t("customers.table.name"),
		t("customers.table.phone"),
		t("customers.table.email"),
		t("customers.table.address"),
		"",
	];

	return (
		<>
			<Table headers={HEADERS}>
				{paginatedData.map((customer) => (
					<TableRow
						key={customer.id}
						className="cursor-pointer hover:bg-neutral-50/50"
						onClick={() => onView(customer)}
					>
						<TableCell>
							<div className="font-bold text-neutral-900">
								{customer.fullName}
							</div>
							{customer.notes && (
								<div className="text-[11px] text-neutral-400 mt-0.5">
									{customer.notes}
								</div>
							)}
						</TableCell>
						<TableCell>
							<span className="text-neutral-500 font-medium">
								{customer.phone}
							</span>
						</TableCell>
						<TableCell>{customer.email || "-"}</TableCell>
						<TableCell>
							<SafeHtml
								html={customer.address}
								className="text-neutral-500 text-[13px] [&>p]:m-0 [&>p]:leading-normal line-clamp-2"
							/>
						</TableCell>
						<TableCell align="right">
							<div
								className="flex items-center justify-end gap-2"
								onClick={(e) => e.stopPropagation()}
							>
								<Button
									variant="outline"
									size="sm"
									onClick={() => onEdit(customer)}
									className="h-8 w-8 p-0"
								>
									<Pencil className="w-4 h-4" />
								</Button>
								<Button
									variant="outline"
									size="sm"
									onClick={() => onDelete(customer)}
									className="h-8 w-8 p-0 text-rose-500 hover:text-rose-600 hover:bg-rose-50 border-transparent"
								>
									<Trash className="w-4 h-4" />
								</Button>
							</div>
						</TableCell>
					</TableRow>
				))}
			</Table>
			{customers.length > 0 && <TablePagination {...pagination} />}
		</>
	);
};
