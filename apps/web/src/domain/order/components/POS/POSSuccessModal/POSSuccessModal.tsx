import { useTranslation } from "react-i18next";
import {
	CheckCircleLinear as CheckIcon,
	PrinterMinimalisticLinear as PrintIcon,
	Smartphone2Linear as WAIcon,
} from "solar-icon-set";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { useLanguage } from "@/shared/i18n";
import { formatCurrency } from "@/shared/utils/format";
import type { TCartItem } from "../../../hooks/usePOSCart";
import { styles } from "./POSSuccessModal.styles";

export type TPOSSuccessModalProps = {
	readonly isOpen: boolean;
	readonly onClose: () => void;
	readonly order: {
		readonly total: number;
		readonly items: readonly TCartItem[];
		readonly paymentMethod: string;
	} | null;
	readonly onPrint: () => void;
	readonly onShareWA: () => void;
};

export const POSSuccessModal = ({
	isOpen,
	onClose,
	order,
	onPrint,
	onShareWA,
}: TPOSSuccessModalProps) => {
	const { language } = useLanguage();
	const { t } = useTranslation();

	if (!order) return null;

	return (
		<Dialog open={isOpen} onOpenChange={onClose}>
			<DialogContent className={styles.dialog}>
				<div className={styles.header}>
					<div className={styles.iconContainer}>
						<CheckIcon className={styles.icon} />
					</div>
					<div className="space-y-1">
						<DialogTitle className={styles.title}>
							{t("pos.checkout_success", "Transaksi Berhasil")}
						</DialogTitle>
						<p className={styles.subtitle}>
							{t("pos.payment_received", {
								method: t(`pos.${order.paymentMethod}`, order.paymentMethod),
							})}
						</p>
					</div>
				</div>

				<div className={styles.body}>
					<div className="space-y-3">
						<div className={styles.summaryLabel}>
							{t("order.history_title")}
						</div>
						<div className={styles.summaryList}>
							{order.items.map((item) => (
								<div key={item.cartKey} className={styles.summaryItem}>
									<span className={styles.itemName}>
										{item.productName} x{item.cartQuantity}
									</span>
									<span className={styles.itemValue}>
										{formatCurrency(
											item.price * item.cartQuantity,
											language as import("@/shared/types/i18n.types").TLanguage,
										)}
									</span>
								</div>
							))}
						</div>
						<div className={styles.totalContainer}>
							<span className={styles.totalLabel}>{t("common.total")}</span>
							<span className={styles.totalValue}>
								{formatCurrency(
									order.total,
									language as import("@/shared/types/i18n.types").TLanguage,
								)}
							</span>
						</div>
					</div>

					<div className={styles.actionsGrid}>
						<Button
							type="button"
							variant="outline"
							onClick={onPrint}
							className={`${styles.actionButton} ${styles.printButton}`}
						>
							<PrintIcon className="w-4 h-4" />
							{t("common.print")}
						</Button>
						<Button
							type="button"
							variant="outline"
							onClick={onShareWA}
							className={`${styles.actionButton} ${styles.waButton}`}
						>
							<WAIcon className="w-4 h-4" />
							{t("common.share")}
						</Button>
					</div>

					<Button
						type="button"
						onClick={onClose}
						className={styles.newTransaction}
					>
						{t("pos.new_order")}
					</Button>
				</div>
			</DialogContent>
		</Dialog>
	);
};
