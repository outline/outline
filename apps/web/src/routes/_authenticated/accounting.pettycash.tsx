import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute as cfr } from "@tanstack/react-router";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { RightSidebar } from "@/components/common/RightSidebar";
import { Button } from "@/components/ui/button";
import { PettyCashList } from "@/domain/accounting";
import { accountingApi } from "@/lib/api/accounting.functions";
import { APP_CONFIG } from "@/lib/constants";
import { exportToCSV } from "@/lib/export.functions";
import { FormBuilder } from "@/lib/form-builder";
import { PettyCashDocType } from "@/lib/form-builder/examples/petty-cash.doctype";
import { queryKeys } from "@/shared/cache/query-keys";
import { i18n } from "@/shared/i18n/i18n.config";
import { uploadFile } from "@/shared/utils/upload";
import { PageHeader } from "@/ui";

export const Route = cfr("/_authenticated/accounting/pettycash")({
	head: () => ({
		meta: [
			{ title: `${i18n.t("accounting.pettycash_tab")} — ${APP_CONFIG.name}` },
			{ name: "description", content: i18n.t("accounting.pettycash_subtitle") },
		],
	}),
	component: AccountingPettyCashPage,
});

function AccountingPettyCashPage() {
	const { t } = useTranslation();
	const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
	const [isFormDirty, setIsFormDirty] = useState(false);
	const queryClient = useQueryClient();

	const { data } = useQuery({
		queryKey: queryKeys.accounting.pettyCash(),
		queryFn: () => accountingApi.getPettyCashTransactions(),
	});

	const createMutation = useMutation({
		mutationFn: accountingApi.createPettyCashTransaction,
		onSuccess: () => {
			queryClient.invalidateQueries({
				queryKey: queryKeys.accounting.pettyCash(),
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
				title={t("accounting.record_pettycash")}
				description={t("accounting.record_pettycash_desc")}
				hasChanges={isFormDirty}
				onDiscard={() => setIsFormDirty(false)}
			>
				<FormBuilder
					doctype={PettyCashDocType}
					mode="create"
					initialValues={{
						transactionDate: new Date(),
						type: "out",
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
									transactionDate: new Date(values.transactionDate as string),
									type: values.type as "in" | "out",
									amount: Number(values.amount),
									description: String(values.description),
									branchId: values.branchId ? String(values.branchId) : null,
									receiptUrl,
								},
							});
							return { message: t("accounting.pettycash_success") };
						} catch (error) {
							return {
								error: true,
								message:
									error instanceof Error
										? error.message
										: t("accounting.pettycash_error"),
							};
						}
					}}
				/>
			</RightSidebar>
			<PageHeader
				description={t("accounting.pettycash_subtitle")}
				docHref="/docs/accounting"
				onExport={() =>
					exportToCSV(data?.transactions || [], "petty-cash-report.csv")
				}
				title={t("accounting.pettycash_tab")}
				actions={
					<Button
						className="h-10 px-4"
						onClick={() => setIsCreateModalOpen(true)}
					>
						{t("accounting.record_transaction")}
					</Button>
				}
			/>

			<div className="p-6 lg:p-8 flex-1 bg-white">
				<div className="max-w-6xl mx-auto space-y-8">
					<PettyCashList />
				</div>
			</div>
		</div>
	);
}
