import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { toast } from "@/components/ui";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import type { TWhatsAppConfig } from "@/domain/whatsapp";
import { whatsappApi } from "@/lib/api/whatsapp.functions";
import { invalidateWhatsApp } from "@/shared/cache/invalidation";
import { styles } from "./WhatsAppSettings.styles";

export type TWhatsAppSettingsProps = {
	readonly config?: TWhatsAppConfig | null | undefined;
};

export const WhatsAppSettings = ({ config }: TWhatsAppSettingsProps) => {
	const { t } = useTranslation();
	const queryClient = useQueryClient();

	const updateMutation = useMutation({
		mutationFn: (data: {
			auto_booking_confirm?: boolean;
			auto_reminder?: boolean;
			auto_payment_confirm?: boolean;
			auto_loyalty_notify?: boolean;
			reminder_hours_before?: number;
		}) => whatsappApi.updateWhatsAppConfig({ data }),
		onSuccess: () => {
			toast.success(t("toast.whatsapp.save_success_title"), {
				description: t("toast.whatsapp.save_success_desc"),
			});
			invalidateWhatsApp(queryClient);
		},
		onError: () =>
			toast.error(t("toast.whatsapp.save_error_title"), {
				description: t("toast.whatsapp.save_error_desc"),
			}),
	});

	if (!config) return <Skeleton className="h-40 w-full rounded-lg" />;

	return (
		<div className={styles.container}>
			<h3 className={styles.title}>{t("whatsapp.automation_settings")}</h3>

			<div className={styles.list}>
				<div className={styles.item}>
					<div className={styles.info}>
						<div className={styles.name}>{t("whatsapp.auto_confirm")}</div>
						<div className={styles.desc}>{t("whatsapp.auto_confirm_desc")}</div>
					</div>
					<Switch
						checked={config.autoBookingConfirm}
						onCheckedChange={(val) =>
							updateMutation.mutate({ auto_booking_confirm: val })
						}
					/>
				</div>

				<div className={styles.item}>
					<div className={styles.info}>
						<div className={styles.name}>{t("whatsapp.auto_reminder")}</div>
						<div className={styles.desc}>
							{t("whatsapp.auto_reminder_desc")}
						</div>
					</div>
					<Switch
						checked={config.autoReminder}
						onCheckedChange={(val) =>
							updateMutation.mutate({ auto_reminder: val })
						}
					/>
				</div>

				<div className={styles.item}>
					<div className={styles.info}>
						<div className={styles.name}>{t("whatsapp.payment_confirm")}</div>
						<div className={styles.desc}>{t("pos.print_receipt")}</div>
					</div>
					<Switch
						checked={config.autoPaymentConfirm}
						onCheckedChange={(val) =>
							updateMutation.mutate({ auto_payment_confirm: val })
						}
					/>
				</div>

				<div className={styles.item}>
					<div className={styles.info}>
						<div className={styles.name}>{t("whatsapp.loyalty_notif")}</div>
						<div className={styles.desc}>
							{t("whatsapp.loyalty_notif_desc")}
						</div>
					</div>
					<Switch
						checked={config.autoLoyaltyNotify}
						onCheckedChange={(val) =>
							updateMutation.mutate({ auto_loyalty_notify: val })
						}
					/>
				</div>
			</div>
		</div>
	);
};
