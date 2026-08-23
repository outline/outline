import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "@/components/ui";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { accountingApi } from "@/lib/api/accounting.functions";
import { FormBuilder } from "@/lib/form-builder";
import type { TDocType } from "@/lib/form-builder/types";
import { extractErrorMessage } from "@/shared/utils/error";

type Line = {
	accountId: string;
	debit: string | number;
	credit: string | number;
	description: string;
};

export function CreateJournalModal({
	isOpen,
	onClose,
}: {
	isOpen: boolean;
	onClose: () => void;
}) {
	const queryClient = useQueryClient();
	const { t, i18n } = useTranslation();

	const { data: coaData } = useQuery({
		queryKey: ["chartOfAccounts"],
		queryFn: () => accountingApi.getChartOfAccounts(),
	});

	const createMutation = useMutation({
		mutationFn: accountingApi.createJournalEntry,
		onSuccess: () => {
			toast.success(i18n.t("common.success_title"), {
				description: t("accounting.journal_success"),
			});
			queryClient.invalidateQueries({ queryKey: ["journalEntries"] });
			queryClient.invalidateQueries({ queryKey: ["financialSummary"] });
			onClose();
		},
		onError: (error) => {
			toast.error(i18n.t("common.error_title"), {
				description: extractErrorMessage(error, t("accounting.journal_error")),
			});
		},
	});

	const journalDocType = useMemo<TDocType>(() => {
		const accountOptions =
			coaData?.accounts?.map((acc) => ({
				value: acc.id,
				label: `${acc.code} - ${acc.name}`,
			})) || [];

		return {
			name: "JournalEntry",
			module: "Accounting",
			fields: [
				{
					fieldname: "entryDate",
					fieldtype: "date",
					label: t("accounting.entry_date"),
					required: true,
					default_value: new Date().toISOString().split("T")[0],
					colspan: 1,
				},
				{
					fieldname: "description",
					fieldtype: "text",
					label: t("accounting.common_desc"),
					placeholder: t("accounting.trans_desc_placeholder"),
					colspan: 1,
				},
				{
					fieldname: "lines",
					fieldtype: "table",
					label: t("accounting.journal_lines"),
					required: true,
					colspan: 2,
					child_doctype: "JournalLine",
					child_fields: [
						{
							fieldname: "accountId",
							fieldtype: "select",
							label: t("accounting.account"),
							required: true,
							options: accountOptions,
							in_list_view: true,
							colspan: 1,
						},
						{
							fieldname: "description",
							fieldtype: "text",
							label: t("common.notes"),
							placeholder: t("common.optional"),
							in_list_view: true,
							colspan: 1,
						},
						{
							fieldname: "debit",
							fieldtype: "number",
							label: t("accounting.debit"),
							default_value: 0,
							in_list_view: true,
							colspan: 1,
						},
						{
							fieldname: "credit",
							fieldtype: "number",
							label: t("accounting.credit"),
							default_value: 0,
							in_list_view: true,
							colspan: 1,
						},
					],
				},
			],
		};
	}, [coaData, t]);

	const handleSubmit = async (values: Record<string, unknown>) => {
		const lines = (values.lines as Line[]) || [];

		const totalDebit = lines.reduce(
			(acc, curr) => acc + (Number(curr.debit) || 0),
			0,
		);
		const totalCredit = lines.reduce(
			(acc, curr) => acc + (Number(curr.credit) || 0),
			0,
		);

		const isBalanced = totalDebit === totalCredit && totalDebit > 0;

		if (!isBalanced) {
			return {
				error: true,
				message: t("accounting.unbalanced_journal"),
			};
		}

		try {
			await createMutation.mutateAsync({
				data: {
					entryDate: new Date(values.entryDate as string),
					description: (values.description as string) || null,
					referenceType: "manual",
					referenceId: null,
					lines: lines.map((l) => ({
						accountId: l.accountId,
						debit: Number(l.debit) || 0,
						credit: Number(l.credit) || 0,
						description: l.description || null,
					})),
				},
			});
			return {};
		} catch (error) {
			return {
				error: true,
				message: extractErrorMessage(error, t("accounting.journal_error")),
			};
		}
	};

	return (
		<Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
			<DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
				<DialogHeader>
					<DialogTitle>{t("accounting.manual_journal")}</DialogTitle>
					<DialogDescription>
						{t("accounting.manual_journal_desc")}
					</DialogDescription>
				</DialogHeader>

				<div className="mt-4">
					<FormBuilder
						doctype={journalDocType}
						mode="create"
						onSubmit={handleSubmit}
						onCancel={onClose}
						initialValues={{
							lines: [
								{ accountId: "", description: "", debit: 0, credit: 0 },
								{ accountId: "", description: "", debit: 0, credit: 0 },
							],
						}}
					/>
				</div>
			</DialogContent>
		</Dialog>
	);
}
