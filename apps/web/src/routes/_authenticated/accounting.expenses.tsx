import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute as cfr } from "@tanstack/react-router";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { RightSidebar } from "@/components/common/RightSidebar";
import { Button } from "@/components/ui/button";
import { ExpenseList } from "@/domain/accounting";
import { accountingApi } from "@/lib/api/accounting.functions";
import { APP_CONFIG } from "@/lib/constants";
import { exportToCSV } from "@/lib/export.functions";
import { FormBuilder } from "@/lib/form-builder";
import { ExpenseDocType } from "@/lib/form-builder/examples/expense.doctype";
import { queryKeys } from "@/shared/cache/query-keys";
import { i18n } from "@/shared/i18n/i18n.config";
import { uploadFile } from "@/shared/utils/upload";
import { PageHeader } from "@/ui";

export const Route = cfr("/_authenticated/accounting/expenses")({
	head: () => ({
		meta: [
			{ title: `${i18n.t("accounting.expenses_tab")} — ${APP_CONFIG.name}` },
			{ name: "description", content: i18n.t("accounting.expenses_subtitle") },
		],
	}),
	component: AccountingExpensesPage,
});

function AccountingExpensesPage() {
	const { t } = useTranslation();
	const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
	const [isFormDirty, setIsFormDirty] = useState(false);
	const queryClient = useQueryClient();

	const { data } = useQuery({
		queryKey: queryKeys.accounting.expenses(),
		queryFn: () => accountingApi.getExpenses(),
	});

	const createMutation = useMutation({
		mutationFn: accountingApi.createExpense,
		onSuccess: () => {
			queryClient.invalidateQueries({
				queryKey: queryKeys.accounting.expenses(),
			});
			queryClient.invalidateQueries({
				queryKey: queryKeys.accounting.financialSummary(),
			});
			setIsCreateModalOpen(false);
			setIsFormDirty(false);
		},
	});

	return (
		<div className="flex flex-col flex-1 animate-in fade-in duration-500 h-full w-full">
			<RightSidebar
				isOpen={isCreateModalOpen}
				onClose={() => {
					setIsCreateModalOpen(false);
					setIsFormDirty(false);
				}}
				title={t("accounting.record_expense")}
				description={t("accounting.record_expense_desc")}
				hasChanges={isFormDirty}
				onDiscard={() => setIsFormDirty(false)}
			>
				<FormBuilder
					doctype={ExpenseDocType}
					mode="create"
					initialValues={{
						expenseDate: new Date(),
						paymentMethod: "cash",
					}}
					onDirtyChange={setIsFormDirty}
					onCancel={() => {
						setIsCreateModalOpen(false);
						setIsFormDirty(false);
					}}
					onSubmit={async (values) => {
						try {
							let receiptUrl: string | null =
								typeof values.receiptUrl === "string"
									? values.receiptUrl
									: null;
							if (values.receiptUrl instanceof File) {
								receiptUrl = await uploadFile(
									"receipts",
									values.receiptUrl,
									crypto.randomUUID(),
								);
							}

							await createMutation.mutateAsync({
								data: {
									...values,
									expenseDate: new Date(values.expenseDate as string),
									amount: Number(values.amount),
									category: String(values.category),
									description: String(values.description),
									branchId: values.branchId ? String(values.branchId) : null,
									paymentMethod: String(values.paymentMethod),
									receiptUrl,
									notes: values.notes ? String(values.notes) : null,
								},
							});
							return { message: t("accounting.expense_success") };
						} catch (error) {
							return {
								error: true,
								message:
									error instanceof Error
										? error.message
										: t("accounting.expense_error"),
							};
						}
					}}
				/>
			</RightSidebar>
			<PageHeader
				description={t("accounting.expenses_subtitle")}
				docHref="/docs/accounting"
				onExport={() =>
					exportToCSV(data?.expenses || [], "expenses-report.csv")
				}
				title={t("accounting.expenses_tab")}
				actions={
					<Button
						className="h-10 px-4"
						onClick={() => setIsCreateModalOpen(true)}
					>
						{t("accounting.record_expense")}
					</Button>
				}
			/>

			<div className="p-6 lg:p-8 flex-1 bg-white">
				<div className="max-w-6xl mx-auto space-y-8">
					<ExpenseList />
				</div>
			</div>
		</div>
	);
}
