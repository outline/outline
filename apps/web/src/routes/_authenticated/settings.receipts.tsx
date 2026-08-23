import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import React from "react";
import { useTranslation } from "react-i18next";
import { toast } from "@/components/ui";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import {
	getTemplateByType,
	upsertTemplate,
} from "@/lib/api/document-template.functions";
import { APP_CONFIG } from "@/lib/constants";
import { i18n } from "@/shared/i18n/i18n.config";
import {
	Button,
	Card,
	CardContent,
	CardHeader,
	CardTitle,
	Input,
	PageHeader,
} from "@/ui";

export const Route = createFileRoute("/_authenticated/settings/receipts")({
	head: () => ({
		meta: [
			{ title: `Atur Nota Kasir — ${APP_CONFIG.name}` },
			{
				name: "description",
				content: "Atur layout dan teks untuk nota kasir POS.",
			},
		],
	}),
	component: ReceiptSettingsPage,
});

const DEFAULT_RECEIPT_CONTENT = {
	header: "Terima kasih atas kunjungan Anda!",
	footer: "Hewan peliharaan Anda senang :)",
	showLogo: true,
	showCashier: true,
	showBranch: true,
};

function ReceiptSettingsPage() {
	const { t } = useTranslation();
	const queryClient = useQueryClient();

	const { data: template, isLoading } = useQuery({
		queryKey: ["document-template", "pos_receipt"],
		queryFn: () => getTemplateByType({ data: "pos_receipt" }),
	});

	const [content, setContent] = React.useState(DEFAULT_RECEIPT_CONTENT);

	React.useEffect(() => {
		if (template?.content) {
			setContent({
				...DEFAULT_RECEIPT_CONTENT,
				...(template.content as unknown as Record<string, unknown>),
			});
		}
	}, [template]);

	const mutation = useMutation({
		mutationFn: upsertTemplate,
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["document-template"] });
			toast.success(i18n.t("common.success_title"), {
				description: t("boarding_settings.toast_save_success"),
			});
		},
	});

	const handleSave = () => {
		mutation.mutate({
			data: {
				id: template?.id,
				type: "pos_receipt",
				name: t("boarding_settings.tabs.receipt"),
				content,
			},
		});
	};

	const handleChange = (field: string, value: unknown) => {
		setContent((prev) => ({ ...prev, [field]: value }));
	};

	return (
		<div className="flex flex-col flex-1 animate-in fade-in duration-500 h-full w-full bg-white">
			<PageHeader
				title={t("boarding_settings.tabs.receipt")}
				description={t("boarding_settings.subtitle")}
				actions={
					<Button onClick={handleSave} disabled={mutation.isPending}>
						{mutation.isPending ? t("common.saving") : t("common.save_changes")}
					</Button>
				}
			/>

			<div className="p-6 lg:p-8 max-w-4xl mx-auto w-full pb-12 flex-1">
				{isLoading ? (
					<div className="space-y-6">
						<Skeleton className="h-40 w-full rounded-lg" />
					</div>
				) : (
					<div className="grid gap-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
						<Card>
							<CardHeader>
								<CardTitle className="text-[16px]">
									{t("boarding_settings.labels.receipt_content")}
								</CardTitle>
							</CardHeader>
							<CardContent className="space-y-4">
								<div className="space-y-1.5">
									<label
										className="text-[12px] font-bold text-neutral-500 uppercase tracking-wider"
										htmlFor="receiptHeader"
									>
										{t("boarding_settings.labels.receipt_header")}
									</label>
									<Input
										id="receiptHeader"
										value={content.header}
										onChange={(e) => handleChange("header", e.target.value)}
										placeholder="misal: Terima kasih atas kunjungan Anda!"
									/>
								</div>
								<div className="space-y-1.5">
									<label
										className="text-[12px] font-bold text-neutral-500 uppercase tracking-wider"
										htmlFor="receiptFooter"
									>
										{t("boarding_settings.labels.receipt_footer")}
									</label>
									<Input
										id="receiptFooter"
										value={content.footer}
										onChange={(e) => handleChange("footer", e.target.value)}
										placeholder="misal: Hewan peliharaan Anda senang :)"
									/>
								</div>
							</CardContent>
						</Card>

						<Card>
							<CardHeader>
								<CardTitle className="text-[16px]">
									{t("boarding_settings.sections.visibility")}
								</CardTitle>
							</CardHeader>
							<CardContent className="space-y-6">
								<div className="flex items-center justify-between">
									<div className="space-y-0.5">
										<label
											className="text-[14px] font-semibold"
											htmlFor="receiptShowLogo"
										>
											{t("boarding_settings.labels.show_logo")}
										</label>
										<p className="text-[12px] text-neutral-500">
											{t("boarding_settings.labels.show_logo_desc")}
										</p>
									</div>
									<Switch
										id="receiptShowLogo"
										checked={content.showLogo}
										onCheckedChange={(checked) =>
											handleChange("showLogo", checked)
										}
									/>
								</div>
								<div className="flex items-center justify-between">
									<div className="space-y-0.5">
										<label
											className="text-[14px] font-semibold"
											htmlFor="receiptShowBranch"
										>
											{t("boarding_settings.labels.show_branch")}
										</label>
									</div>
									<Switch
										id="receiptShowBranch"
										checked={content.showBranch}
										onCheckedChange={(checked) =>
											handleChange("showBranch", checked)
										}
									/>
								</div>
								<div className="flex items-center justify-between">
									<div className="space-y-0.5">
										<label
											className="text-[14px] font-semibold"
											htmlFor="receiptShowCashier"
										>
											{t("boarding_settings.labels.show_cashier")}
										</label>
									</div>
									<Switch
										id="receiptShowCashier"
										checked={content.showCashier}
										onCheckedChange={(checked) =>
											handleChange("showCashier", checked)
										}
									/>
								</div>
							</CardContent>
						</Card>

						<div className="flex justify-end pt-4">
							<Button onClick={handleSave} disabled={mutation.isPending}>
								{mutation.isPending
									? t("common.saving")
									: t("common.save_changes")}
							</Button>
						</div>
					</div>
				)}
			</div>
		</div>
	);
}
