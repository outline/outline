import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import {
	AlarmLinear as AlarmIcon,
	UserRoundedLinear as User,
} from "solar-icon-set";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { getAttendanceReportData } from "@/lib/api/accounting.functions";
import { EmptyState, StatusBadge } from "@/ui";

export function AttendanceReport() {
	const { t } = useTranslation();
	const [month, setMonth] = useState(new Date().toISOString().substring(0, 7));

	const { data: records = [] } = useQuery({
		queryKey: ["attendanceReport", month],
		queryFn: () => getAttendanceReportData({}),
	});

	return (
		<div className="space-y-6">
			{/* Filters */}
			<div className="bg-white border border-neutral-200/80 rounded-xl p-4 flex flex-col sm:flex-row items-end sm:items-center gap-4">
				<div className="space-y-1.5 flex-1 w-full sm:w-auto">
					<label className="text-xs font-semibold text-neutral-500 uppercase tracking-wider">
						{t("attendance.period_month")}
					</label>
					<Input
						type="month"
						value={month}
						onChange={(e) => setMonth(e.target.value)}
						className="rounded-lg"
					/>
				</div>
				<div className="flex-none">
					<Button className="rounded-xl px-6 h-10 w-full sm:w-auto">
						{t("attendance.apply_filter")}
					</Button>
				</div>
			</div>

			{/* Data Table */}
			<div className="bg-white border border-neutral-200/80 rounded-xl overflow-hidden">
				<div className="overflow-x-auto">
					<table className="w-full text-left border-collapse">
						<thead>
							<tr className="border-b border-neutral-200/80 bg-neutral-50/50">
								<th className="py-3 px-6 text-[11px] font-bold text-neutral-500 uppercase tracking-wider">
									{t("attendance.staff_name")}
								</th>
								<th className="py-3 px-6 text-[11px] font-bold text-neutral-500 uppercase tracking-wider text-center">
									{t("attendance.attendance")}
								</th>
								<th className="py-3 px-6 text-[11px] font-bold text-neutral-500 uppercase tracking-wider text-center">
									{t("attendance.late")}
								</th>
								<th className="py-3 px-6 text-[11px] font-bold text-neutral-500 uppercase tracking-wider text-center">
									{t("attendance.leave_permit")}
								</th>
								<th className="py-3 px-6 text-[11px] font-bold text-neutral-500 uppercase tracking-wider text-center">
									{t("attendance.absent_alpha")}
								</th>
								<th className="py-3 px-6 text-[11px] font-bold text-neutral-500 uppercase tracking-wider text-right">
									{t("attendance.percentage")}
								</th>
							</tr>
						</thead>
						<tbody className="divide-y divide-neutral-100">
							{records.length === 0 ? (
								<tr>
									<td colSpan={6} className="py-12">
										<EmptyState
											title={t("attendance.no_attendance_data")}
											description={t("attendance.no_attendance_desc")}
											icon={AlarmIcon}
										/>
									</td>
								</tr>
							) : (
								records.map((item, index) => {
									const percentage =
										((item.totalPresent + item.totalLate + item.totalLeave) /
											item.expectedDays) *
										100;
									return (
										<tr
											key={`${item.staffId}-${index}`}
											className="hover:bg-neutral-50/50 transition-colors"
										>
											<td className="py-4 px-6 text-[13px] font-bold text-neutral-900 flex items-center gap-2">
												<div className="w-8 h-8 rounded-full bg-neutral-100 flex items-center justify-center shrink-0">
													<User className="w-4 h-4 text-neutral-500" />
												</div>
												{item.staffName}
											</td>
											<td className="py-4 px-6 text-[13px] font-medium text-neutral-900 text-center">
												{item.totalPresent} {t("attendance.days_unit")}
											</td>
											<td className="py-4 px-6 text-[13px] font-medium text-amber-600 text-center">
												{item.totalLate} {t("attendance.times_unit")}
											</td>
											<td className="py-4 px-6 text-[13px] font-medium text-blue-600 text-center">
												{item.totalLeave} {t("attendance.days_unit")}
											</td>
											<td className="py-4 px-6 text-[13px] font-medium text-rose-600 text-center">
												{item.totalAbsent} {t("attendance.days_unit")}
											</td>
											<td className="py-4 px-6 text-right">
												<StatusBadge
													type={
														percentage >= 95
															? "success"
															: percentage >= 80
																? "warning"
																: "error"
													}
													label={`${percentage.toFixed(0)}%`}
												/>
											</td>
										</tr>
									);
								})
							)}
						</tbody>
					</table>
				</div>
			</div>
		</div>
	);
}
