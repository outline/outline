import { Badge } from "@/ui/badge/badge";
import type { TOrderStatus } from "@/domain/order/order.types";

const STATUS_CONFIG: Record<TOrderStatus, { label: string; variant: string }> =
	{
		draft: { label: "Draft", variant: "default" },
		confirmed: { label: "Dikonfirmasi", variant: "info" },
		processing: { label: "Diproses", variant: "warning" },
		shipped: { label: "Dikirim", variant: "info" },
		delivered: { label: "Diterima", variant: "success" },
		cancelled: { label: "Dibatalkan", variant: "error" },
		voided: { label: "Void", variant: "default" },
	};

export function OrderStatusBadge({ status }: { status: TOrderStatus }) {
	const config = STATUS_CONFIG[status] ?? { label: status, variant: "default" };
	return <Badge variant={config.variant as any}>{config.label}</Badge>;
}
