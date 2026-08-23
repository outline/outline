import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import {
	AddCircleLinear as Plus,
	TrashBinMinimalisticLinear as Trash,
} from "solar-icon-set";
import { whatsappApi } from "@/lib/api/whatsapp.functions";
import { QUERY_POLICY } from "@/shared/cache/cache-policy";
import { invalidateWhatsApp } from "@/shared/cache/invalidation";
import { queryKeys } from "@/shared/cache/query-keys";
import { ActionButton, Button, Card, StatusBadge } from "@/ui";
import { styles } from "./WhatsAppTemplates.styles";

export type TWhatsAppTemplatesProps = {
	readonly onAddClick: () => void;
};

type TTemplateItem = {
	id: string;
	name: string;
	category: string;
	content: string;
	isActive: boolean;
	variables?: string[];
};

export const WhatsAppTemplates = ({ onAddClick }: TWhatsAppTemplatesProps) => {
	const queryClient = useQueryClient();
	const { t } = useTranslation();

	const { data: templates = [] } = useQuery<TTemplateItem[]>({
		queryKey: queryKeys.whatsapp.templates(),
		staleTime: QUERY_POLICY.reference.staleTime,
		gcTime: QUERY_POLICY.reference.gcTime,
		queryFn: () =>
			whatsappApi.getTemplates() as unknown as Promise<TTemplateItem[]>,
	});

	const deleteMutation = useMutation({
		mutationFn: (id: string) => whatsappApi.deleteTemplate({ data: id }),
		onSuccess: () => {
			invalidateWhatsApp(queryClient);
		},
	});

	const categoryLabels: Record<string, string> = {
		booking: "Booking",
		payment: "Pembayaran",
		loyalty: "Loyalty",
		promo: "Promo",
		reminder: "Reminder",
		custom: "Custom",
	};

	return (
		<div className={styles.container}>
			<div className={styles.header}>
				<h3 className={styles.title}>{t("whatsapp.templates_title")}</h3>
				<Button onClick={onAddClick} variant="mint" size="sm">
					<Plus className="w-4 h-4 mr-2" />
					{t("common.add")}
				</Button>
			</div>

			<div className={styles.list}>
				{templates.map((tItem) => (
					<Card key={tItem.id} className={styles.card}>
						<div className={styles.cardHeader}>
							<div>
								<div className={styles.templateName}>{tItem.name}</div>
								<StatusBadge
									type="info"
									label={categoryLabels[tItem.category] || tItem.category}
								/>
							</div>
							<ActionButton
								size="icon"
								variant="outline"
								title={t("whatsapp.delete_template_title")}
								popupContent={
									<p>
										{t("whatsapp.delete_template_confirm", {
											name: tItem.name,
										})}
									</p>
								}
								onConfirm={async () => {
									await deleteMutation.mutateAsync(tItem.id);
									return { message: t("whatsapp.delete_template_success") };
								}}
							>
								<Trash className="w-4 h-4" />
							</ActionButton>
						</div>
						<div className={styles.content}>{tItem.content}</div>
						{tItem.variables && tItem.variables.length > 0 && (
							<div className={styles.variables}>
								{tItem.variables.map((v: string) => (
									<span key={v} className={styles.variable}>
										{`{{${v}}}`}
									</span>
								))}
							</div>
						)}
					</Card>
				))}
			</div>
		</div>
	);
};
