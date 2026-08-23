import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { Skeleton } from "@/components/ui/skeleton";
import type { TStaffId } from "@/domain/staff/staff.types";
import { getStaffAttendanceHistory } from "@/lib/api/shift.functions";

export function AttendanceTab({ staffId }: { staffId: TStaffId }) {
	const { t } = useTranslation();
	const today = new Date();
	const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1)
		.toISOString()
		.split("T")[0] as string;
	const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0)
		.toISOString()
		.split("T")[0] as string;

	const { data: records, isLoading } = useQuery({
		queryKey: ["staffAttendance", staffId, startOfMonth, endOfMonth],
		queryFn: () =>
			getStaffAttendanceHistory({
				data: { staffId, startDate: startOfMonth, endDate: endOfMonth },
			}),
	});

	return (
		<div className="space-y-6">
			<div className="flex items-center justify-between">
				<div>
					<h3 className="text-lg font-bold text-neutral-900">
						{t("attendance.history_title")}
					</h3>
					<p className="text-sm text-neutral-500">
						{t("attendance.history_subtitle")}
					</p>
				</div>
			</div>

			<div className="bg-white rounded-xl border border-neutral-200/60 overflow-hidden">
				<div className="grid grid-cols-4 gap-4 px-6 py-3 bg-neutral-50 border-b border-neutral-200/60 text-xs font-bold text-neutral-400 uppercase tracking-widest">
					<div>{t("common.date")}</div>
					<div>Clock In</div>
					<div>Clock Out</div>
					<div className="text-right">{t("common.status")}</div>
				</div>
				<div className="divide-y divide-neutral-100 max-h-[500px] overflow-y-auto">
					{isLoading ? (
						[1, 2, 3, 4].map((i) => (
							<div
								key={i}
								className="grid grid-cols-4 gap-4 px-6 py-4 items-center"
							>
								<Skeleton className="h-4 w-28 rounded-lg" />
								<Skeleton className="h-4 w-12 rounded-lg" />
								<Skeleton className="h-4 w-12 rounded-lg" />
								<Skeleton className="h-5 w-16 rounded-md ml-auto" />
							</div>
						))
					) : records?.length === 0 ? (
						<div className="p-12 text-center text-sm text-neutral-400">
							{t("attendance.no_history")}
						</div>
					) : (
						records?.map((record) => {
							const date = new Date(record.date);
							const clockInTime = record.clockIn
								? new Date(record.clockIn).toLocaleTimeString("id-ID", {
										hour: "2-digit",
										minute: "2-digit",
									})
								: "-";
							const clockOutTime = record.clockOut
								? new Date(record.clockOut).toLocaleTimeString("id-ID", {
										hour: "2-digit",
										minute: "2-digit",
									})
								: "-";

							const status = record.clockIn ? "present" : "absent";

							let statusBadge;
							if (status === "present") {
								statusBadge = (
									<span className="inline-flex px-2 py-1 rounded-md text-[11px] font-bold bg-emerald-100 text-emerald-700 uppercase">
										{t("attendance.present")}
									</span>
								);
							} else if (status === "absent") {
								statusBadge = (
									<span className="inline-flex px-2 py-1 rounded-md text-[11px] font-bold bg-rose-100 text-rose-700 uppercase">
										{t("attendance.absent")}
									</span>
								);
							} else if (status === "leave") {
								statusBadge = (
									<span className="inline-flex px-2 py-1 rounded-md text-[11px] font-bold bg-blue-100 text-blue-700 uppercase">
										{t("attendance.leave")}
									</span>
								);
							}

							return (
								<div
									key={record.date}
									className="grid grid-cols-4 gap-4 px-6 py-4 items-center text-sm hover:bg-neutral-50 transition-colors"
								>
									<div className="font-medium text-neutral-900">
										{date.toLocaleDateString("id-ID", {
											weekday: "short",
											day: "numeric",
											month: "short",
											year: "numeric",
										})}
									</div>
									<div className="text-neutral-600 font-mono">
										{clockInTime}
									</div>
									<div className="text-neutral-600 font-mono">
										{clockOutTime}
									</div>
									<div className="text-right">{statusBadge}</div>
								</div>
							);
						})
					)}
				</div>
			</div>
		</div>
	);
}
