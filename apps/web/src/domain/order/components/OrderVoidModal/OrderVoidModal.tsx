import { useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "@/components/ui";
import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { voidOrder } from "@/lib/api/orders.functions";
import { extractErrorMessage } from "@/shared/utils/error";

export type TOrderVoidModalProps = {
	readonly isOpen: boolean;
	readonly onClose: () => void;
	readonly orderId: string;
	readonly onSuccess: () => void;
};

export const OrderVoidModal = ({
	isOpen,
	onClose,
	orderId,
	onSuccess,
}: TOrderVoidModalProps) => {
	const { t, i18n } = useTranslation();
	const [reason, setReason] = useState("");
	const [isSubmitting, setIsSubmitting] = useState(false);

	const handleSubmit = async () => {
		if (!reason.trim()) {
			toast.error(t("toast.reason_required"), {
				description: t("order.void_reason_placeholder"),
			});
			return;
		}

		try {
			setIsSubmitting(true);
			await voidOrder({ data: { orderId, reason: reason.trim() } });
			toast.success(i18n.t("common.success_title"), {
				description: i18n.t("toast.void_success"),
			});
			onSuccess();
			onClose();
		} catch (error: unknown) {
			toast.error(i18n.t("toast.void_failed"), {
				description: extractErrorMessage(error, t("common.error")),
			});
		} finally {
			setIsSubmitting(false);
		}
	};

	return (
		<Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
			<DialogContent className="sm:max-w-[425px]">
				<DialogHeader>
					<DialogTitle>{t("order.void_transaction")}</DialogTitle>
					<DialogDescription>{t("order.void_desc")}</DialogDescription>
				</DialogHeader>

				<div className="py-4">
					<div className="space-y-2">
						<label className="text-sm font-medium text-neutral-700">
							{t("order.void_reason")} <span className="text-rose-500">*</span>
						</label>
						<Input
							placeholder={t("order.void_reason_placeholder")}
							value={reason}
							onChange={(e) => setReason(e.target.value)}
							disabled={isSubmitting}
						/>
					</div>
				</div>

				<DialogFooter>
					<Button variant="outline" onClick={onClose} disabled={isSubmitting}>
						{t("common.cancel")}
					</Button>
					<Button
						variant="destructive"
						onClick={handleSubmit}
						disabled={isSubmitting}
					>
						{isSubmitting
							? t("common.processing")
							: t("order.void_transaction")}
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
};
