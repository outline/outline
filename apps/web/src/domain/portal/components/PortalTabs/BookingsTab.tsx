import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import {
	CheckCircleLinear as CheckIcon,
	CloseCircleLinear as CloseIcon,
} from "solar-icon-set";
import { toast } from "@/components/ui";
import { Button } from "@/components/ui/button";
import { portalApi } from "@/lib/api/portal.functions";
import type { PortalBookingData } from "@/lib/types";
import { useLanguage } from "@/shared/i18n";
import { i18n } from "@/shared/i18n/i18n.config";
import { cn, formatCurrency, formatDate } from "@/shared/utils";
import { EmptyState } from "@/ui";

export function BookingsTab() {
	const queryClient = useQueryClient();
	const { t } = useTranslation();
	const { language } = useLanguage();
	const [statusFilter, setStatusFilter] = useState<string>("");

	const { data } = useQuery({
		queryKey: ["portalBookings", statusFilter],
		queryFn: () => portalApi.getPortalBookings(),
	});

	const updateStatusMutation = useMutation({
		mutationFn: ({
			id,
			status,
		}: {
			id: string;
			status: PortalBookingData["status"];
		}) => portalApi.updatePortalBookingStatus({ data: { id, status } }),
		onSuccess: () => {
			toast.success(
				t("toast.portal.update_success_title", i18n.t("common.success_title")),
				{
					description: t(
						"toast.portal.update_success_desc",
						"Status pesanan berhasil diperbarui.",
					),
				},
			);
			queryClient.invalidateQueries({ queryKey: ["portalBookings"] });
			queryClient.invalidateQueries({ queryKey: ["portalStats"] });
		},
	});

	const statusColors: Record<string, string> = {
		pending: "bg-amber-100 text-amber-700",
		confirmed: "bg-blue-100 text-blue-700",
		in_progress: "bg-purple-100 text-purple-700",
		completed: "bg-emerald-100 text-emerald-700",
		cancelled: "bg-neutral-100 text-neutral-700",
		no_show: "bg-rose-100 text-rose-700",
	};

	const statusLabels: Record<string, string> = {
		pending: t("common.pending"),
		confirmed: t("common.confirmed"),
		in_progress: t("common.in_progress"),
		completed: t("common.completed"),
		cancelled: t("common.cancelled"),
		no_show: t("common.no_show"),
	};

	return (
		<div className="space-y-4">
			<div className="flex gap-2 overflow-x-auto">
				{[
					"",
					"pending",
					"confirmed",
					"in_progress",
					"completed",
					"cancelled",
				].map((status) => (
					<Button
						key={status}
						size="sm"
						variant={statusFilter === status ? "default" : "outline"}
						onClick={() => setStatusFilter(status)}
					>
						{status ? statusLabels[status] : t("common.all")}
					</Button>
				))}
			</div>

			<div className="space-y-3">
				{data?.length === 0 ? (
					<EmptyState
						variant="portal-bookings"
						title={t("portal.no_bookings")}
						description={t("portal.no_bookings_desc")}
						className="bg-white border-dashed border-neutral-200"
					/>
				) : (
					data?.map((booking) => (
						<div
							key={booking.id}
							className="bg-white rounded-lg border border-neutral-200 p-4"
						>
							<div className="flex justify-between items-start mb-3">
								<div>
									<div className="font-bold text-neutral-900">
										{booking.customerName}
									</div>
									<div className="text-sm text-neutral-500">
										{booking.customerPhone}
									</div>
								</div>
								<span
									className={cn(
										"px-2 py-0.5 rounded-full text-xs font-medium",
										statusColors[booking.status],
									)}
								>
									{statusLabels[booking.status]}
								</span>
							</div>
							<div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
								<div>
									<div className="text-neutral-500">{t("common.pet")}</div>
									<div className="font-medium">
										{booking.petName} ({booking.petSpecies || "-"})
									</div>
								</div>
								<div>
									<div className="text-neutral-500">{t("common.schedule")}</div>
									<div className="font-medium">
										{formatDate(booking.scheduledAt, language, {
											day: "numeric",
											month: "long",
											year: "numeric",
											hour: "2-digit",
											minute: "2-digit",
										})}
									</div>
								</div>
								<div>
									<div className="text-neutral-500">
										{t("portal.service_name")}
									</div>
									<div className="font-medium">{booking.serviceId || "-"}</div>
								</div>
								<div>
									<div className="text-neutral-500">{t("common.total")}</div>
									<div className="font-medium">
										{formatCurrency(0, language)}
									</div>
								</div>
							</div>
							{booking.status === "pending" && (
								<div className="flex gap-2 mt-4 pt-3 border-t border-neutral-100">
									<Button
										size="sm"
										variant="outline"
										className="text-emerald-700 border-emerald-200 hover:bg-emerald-50"
										onClick={() =>
											updateStatusMutation.mutate({
												id: booking.id,
												status: "confirmed",
											})
										}
									>
										<CheckIcon className="w-4 h-4" />
										{t("common.confirm")}
									</Button>
									<Button
										size="sm"
										variant="outline"
										className="text-rose-700 border-rose-200 hover:bg-rose-50"
										onClick={() =>
											updateStatusMutation.mutate({
												id: booking.id,
												status: "cancelled",
											})
										}
									>
										<CloseIcon className="w-4 h-4" />
										{t("common.reject")}
									</Button>
								</div>
							)}
							{booking.status === "confirmed" && (
								<div className="flex gap-2 mt-4 pt-3 border-t border-neutral-100">
									<Button
										size="sm"
										variant="outline"
										className="text-emerald-700 border-emerald-200 hover:bg-emerald-50"
										onClick={() =>
											updateStatusMutation.mutate({
												id: booking.id,
												status: "completed",
											})
										}
									>
										<CheckIcon className="w-4 h-4" />
										{t("common.completed")}
									</Button>
								</div>
							)}
						</div>
					))
				)}
			</div>
		</div>
	);
}
