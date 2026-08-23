import { useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "@/components/ui";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
	Dialog,
	DialogContent,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { OrderStatusBadge } from "../OrderStatusBadge";
import {
	STATUS_LABELS,
	STATUS_TRANSITIONS,
	type TOrderStatus,
} from "@/domain/order/order.types";

export type TOrderStatusDialogProps = {
	readonly isOpen: boolean;
	readonly onClose: () => void;
	readonly order: { id: string; status: string };
	readonly onUpdate: (
		status: string,
		data: Record<string, string>,
	) => Promise<void>;
};

export const OrderStatusDialog = ({
	isOpen,
	onClose,
	order,
	onUpdate,
}: TOrderStatusDialogProps) => {
	const { t } = useTranslation();
	const [selectedStatus, setSelectedStatus] = useState("");
	const [trackingNumber, setTrackingNumber] = useState("");
	const [shippingCarrier, setShippingCarrier] = useState("");
	const [cancelledReason, setCancelledReason] = useState("");
	const [isLoading, setIsLoading] = useState(false);
	const [error, setError] = useState("");

	const currentStatus = order.status as TOrderStatus;
	const allowedStatuses = STATUS_TRANSITIONS[currentStatus] ?? [];
	const showTrackingFields = selectedStatus === "shipped";
	const showCancelReason = selectedStatus === "cancelled";

	const handleSubmit = async () => {
		if (!selectedStatus) {
			setError("Pilih status terlebih dahulu");
			return;
		}
		if (showTrackingFields && (!trackingNumber || !shippingCarrier)) {
			setError("Nomor resi dan kurir wajib diisi");
			return;
		}
		if (showCancelReason && !cancelledReason) {
			setError("Alasan pembatalan wajib diisi");
			return;
		}

		setIsLoading(true);
		setError("");
		try {
			await onUpdate(selectedStatus, {
				trackingNumber,
				shippingCarrier,
				cancelledReason,
			});
			onClose();
			resetForm();
		} catch (e) {
			setError(e instanceof Error ? e.message : "Gagal update status");
		} finally {
			setIsLoading(false);
		}
	};

	const resetForm = () => {
		setSelectedStatus("");
		setTrackingNumber("");
		setShippingCarrier("");
		setCancelledReason("");
	};

	const handleClose = () => {
		resetForm();
		onClose();
	};

	return (
		<Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
			<DialogContent className="sm:max-w-[425px]">
				<DialogHeader>
					<DialogTitle>Update Status Pesanan</DialogTitle>
				</DialogHeader>

				<div className="space-y-4 py-2">
					<div className="flex items-center gap-2">
						<span className="text-sm text-neutral-500">Status saat ini:</span>
						<OrderStatusBadge status={currentStatus} />
					</div>

					<div className="space-y-2">
						<label className="text-sm font-medium text-neutral-700">
							Status Baru
						</label>
						<select
							className="w-full border rounded-md p-2 text-sm"
							value={selectedStatus}
							onChange={(e) => setSelectedStatus(e.target.value)}
						>
							<option value="">Pilih status...</option>
							{allowedStatuses.map((s) => (
								<option key={s} value={s}>
									{STATUS_LABELS[s] ?? s}
								</option>
							))}
						</select>
					</div>

					{showTrackingFields && (
						<>
							<div className="space-y-2">
								<label className="text-sm font-medium text-neutral-700">
									Kurir
								</label>
								<select
									className="w-full border rounded-md p-2 text-sm"
									value={shippingCarrier}
									onChange={(e) => setShippingCarrier(e.target.value)}
								>
									<option value="">Pilih kurir...</option>
									<option value="JNE">JNE</option>
									<option value="SiCepat">SiCepat</option>
									<option value="J&T">J&T</option>
									<option value="AnterAja">AnterAja</option>
									<option value="Lainnya">Lainnya</option>
								</select>
							</div>
							<div className="space-y-2">
								<label className="text-sm font-medium text-neutral-700">
									Nomor Resi
								</label>
								<Input
									value={trackingNumber}
									onChange={(e) => setTrackingNumber(e.target.value)}
									placeholder="JP0012345678"
								/>
							</div>
						</>
					)}

					{showCancelReason && (
						<div className="space-y-2">
							<label className="text-sm font-medium text-neutral-700">
								Alasan Pembatalan
							</label>
							<Textarea
								value={cancelledReason}
								onChange={(e) => setCancelledReason(e.target.value)}
								placeholder="Alasan pembatalan..."
							/>
						</div>
					)}

					{error && (
						<div className="text-sm text-red-600 bg-red-50 p-3 rounded">
							{error}
						</div>
					)}
				</div>

				<DialogFooter>
					<Button variant="outline" onClick={handleClose} disabled={isLoading}>
						Batal
					</Button>
					<Button
						onClick={handleSubmit}
						disabled={isLoading || !selectedStatus}
					>
						{isLoading ? "Menyimpan..." : "Simpan"}
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
};
