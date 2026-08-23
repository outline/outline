import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "@/components/ui";
import { Button } from "@/components/ui/button";
import type { TStaffId } from "@/domain/staff/staff.types";
import { clockIn, clockOut, getAttendance } from "@/lib/api/shift.functions";
import { useSession } from "@/shared/hooks";
import { i18n } from "@/shared/i18n/i18n.config";
import { extractErrorMessage } from "@/shared/utils/error";

export function ClockInOutWidget() {
	const queryClient = useQueryClient();
	const { session } = useSession();
	const [isProcessing, setIsProcessing] = useState(false);

	const staffId = session?.userId as TStaffId;
	const todayDate = new Date().toISOString().split("T")[0];

	const { data: record } = useQuery({
		queryKey: ["staffAttendance", staffId, todayDate],
		queryFn: () => getAttendance({ data: { staffId, date: todayDate } }),
		enabled: !!staffId,
	});

	const clockInMutation = useMutation({
		mutationFn: () => clockIn({ data: { staffId, date: todayDate } }),
		onSuccess: () => {
			toast.success(i18n.t("toast.clock_in_success"), {
				description: "Selamat bekerja!",
			});
			queryClient.invalidateQueries({
				queryKey: ["staffAttendance", staffId, todayDate],
			});
		},
		onError: (error) => {
			toast.error(i18n.t("toast.clock_in_failed"), {
				description: extractErrorMessage(error, "Terjadi kesalahan"),
			});
		},
		onSettled: () => setIsProcessing(false),
	});

	const clockOutMutation = useMutation({
		mutationFn: () => clockOut({ data: { staffId, date: todayDate } }),
		onSuccess: () => {
			toast.success(i18n.t("toast.clock_out_success"), {
				description: "Terima kasih atas kerja keras Anda hari ini!",
			});
			queryClient.invalidateQueries({
				queryKey: ["staffAttendance", staffId, todayDate],
			});
		},
		onError: (error) => {
			toast.error(i18n.t("toast.clock_out_failed"), {
				description: extractErrorMessage(error, "Terjadi kesalahan"),
			});
		},
		onSettled: () => setIsProcessing(false),
	});

	if (!session) return null;

	const todayRecord = record;

	const handleClockIn = () => {
		setIsProcessing(true);
		clockInMutation.mutate();
	};

	const handleClockOut = () => {
		setIsProcessing(true);
		clockOutMutation.mutate();
	};

	const isClockedIn = !!todayRecord?.clockIn;
	const isClockedOut = !!todayRecord?.clockOut;
	const clockInTime = todayRecord?.clockIn;
	const clockOutTime = todayRecord?.clockOut;

	return (
		<div className="mx-3 mt-4 mb-2 p-3 bg-white rounded-xl border border-neutral-200 shadow-sm flex flex-col gap-2">
			<div className="flex items-center justify-between">
				<span className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest">
					Absensi Hari Ini
				</span>
			</div>

			{!isClockedIn ? (
				<Button
					size="sm"
					onClick={handleClockIn}
					disabled={isProcessing}
					className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold"
				>
					{isProcessing ? "Memproses..." : "Clock In"}
				</Button>
			) : !isClockedOut ? (
				<div className="flex flex-col gap-2">
					<div className="text-xs text-neutral-600 font-medium text-center bg-blue-50 py-1.5 rounded-md border border-blue-100">
						Clock In:{" "}
						{new Date(clockInTime ?? "").toLocaleTimeString("id-ID", {
							hour: "2-digit",
							minute: "2-digit",
						})}
					</div>
					<Button
						size="sm"
						variant="outline"
						onClick={handleClockOut}
						disabled={isProcessing}
						className="w-full border-rose-200 text-rose-600 hover:bg-rose-50 hover:text-rose-700 font-bold"
					>
						{isProcessing ? "Memproses..." : "Clock Out"}
					</Button>
				</div>
			) : (
				<div className="text-xs text-neutral-500 text-center font-medium py-1.5 px-2 bg-neutral-50 border border-neutral-100 rounded-md">
					Selesai (In:{" "}
					{new Date(clockInTime ?? "").toLocaleTimeString("id-ID", {
						hour: "2-digit",
						minute: "2-digit",
					})}
					, Out:{" "}
					{new Date(clockOutTime ?? "").toLocaleTimeString("id-ID", {
						hour: "2-digit",
						minute: "2-digit",
					})}
					)
				</div>
			)}
		</div>
	);
}
