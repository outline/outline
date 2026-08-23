import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { z } from "zod";
import { toast } from "@/components/ui";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import type { TStaffId } from "@/domain/staff/staff.types";
import {
	getStaffSchedules,
	updateStaffSchedule,
} from "@/lib/api/shift.functions";
import { i18n } from "@/shared/i18n/i18n.config";
import { extractErrorMessage } from "@/shared/utils/error";

const scheduleSchema = z.object({
	dayOfWeek: z.number().min(0).max(6),
	startTime: z.string().min(5),
	endTime: z.string().min(5),
	isOffDay: z.boolean(),
});

type ScheduleValues = z.infer<typeof scheduleSchema>;

export function ShiftTab({ staffId }: { staffId: TStaffId }) {
	const queryClient = useQueryClient();
	const [editingDay, setEditingDay] = useState<number | null>(null);
	const { t } = useTranslation();

	const DAYS_OF_WEEK = [
		{ id: 1, name: t("shift.days.monday") },
		{ id: 2, name: t("shift.days.tuesday") },
		{ id: 3, name: t("shift.days.wednesday") },
		{ id: 4, name: t("shift.days.thursday") },
		{ id: 5, name: t("shift.days.friday") },
		{ id: 6, name: t("shift.days.saturday") },
		{ id: 0, name: t("shift.days.sunday") },
	];

	const { data: schedules, isLoading } = useQuery({
		queryKey: ["staffSchedules", staffId],
		queryFn: () => getStaffSchedules({ data: staffId }),
	});

	const form = useForm<ScheduleValues>({
		resolver: zodResolver(scheduleSchema),
	});

	const updateMutation = useMutation({
		mutationFn: (values: ScheduleValues) =>
			updateStaffSchedule({ data: { staffId, ...values } }),
		onSuccess: () => {
			toast.success(i18n.t("common.success_title"), {
				description: i18n.t("toast.shift_updated"),
			});
			queryClient.invalidateQueries({ queryKey: ["staffSchedules", staffId] });
			setEditingDay(null);
		},
		onError: (error) => {
			toast.error(i18n.t("toast.shift_update_failed"), {
				description: extractErrorMessage(error, t("common.error")),
			});
		},
	});

	const startEditing = (day: number) => {
		const existing = schedules?.find((s) => s.dayOfWeek === day);
		form.reset({
			dayOfWeek: day,
			startTime: existing?.startTime || "09:00",
			endTime: existing?.endTime || "17:00",
			isOffDay: existing?.isOffDay ?? false,
		});
		setEditingDay(day);
	};

	return (
		<div className="space-y-6">
			<div className="flex items-center justify-between">
				<div>
					<h3 className="text-lg font-bold text-neutral-900">
						{t("shift.weekly_shift_title")}
					</h3>
					<p className="text-sm text-neutral-500">
						{t("shift.weekly_shift_subtitle")}
					</p>
				</div>
			</div>

			<div className="bg-white rounded-xl border border-neutral-200/60 overflow-hidden">
				<div className="grid grid-cols-4 gap-4 px-6 py-3 bg-neutral-50 border-b border-neutral-200/60 text-xs font-bold text-neutral-400 uppercase tracking-widest">
					<div>{t("shift.day")}</div>
					<div>{t("common.status")}</div>
					<div>{t("shift.work_hours")}</div>
					<div className="text-right">{t("common.action")}</div>
				</div>
				<div className="divide-y divide-neutral-100">
					{isLoading
						? [1, 2, 3, 4, 5, 6, 7].map((i) => (
								<div
									key={i}
									className="grid grid-cols-4 gap-4 px-6 py-4 items-center"
								>
									<Skeleton className="h-4 w-20 rounded-lg" />
									<Skeleton className="h-5 w-16 rounded-md" />
									<Skeleton className="h-4 w-24 rounded-lg" />
									<Skeleton className="h-8 w-16 rounded-lg ml-auto" />
								</div>
							))
						: DAYS_OF_WEEK.map((day) => {
								const schedule = schedules?.find((s) => s.dayOfWeek === day.id);
								const isEditing = editingDay === day.id;

								if (isEditing) {
									return (
										<div key={day.id} className="p-4 bg-blue-50/50">
											<form
												onSubmit={form.handleSubmit((v) =>
													updateMutation.mutate(v),
												)}
												className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end"
											>
												<div>
													<Label className="mb-2 block">{t("shift.day")}</Label>
													<div className="font-bold text-neutral-900 py-2">
														{day.name}
													</div>
												</div>
												<div>
													<Label className="mb-2 block">
														{t("shift.off_status")}
													</Label>
													<div className="flex items-center gap-2 py-2">
														<Controller
															control={form.control}
															name="isOffDay"
															render={({ field }) => (
																<Switch
																	checked={field.value}
																	onCheckedChange={field.onChange}
																/>
															)}
														/>
														<span className="text-sm">
															{form.watch("isOffDay")
																? t("shift.off_day")
																: t("shift.on_duty")}
														</span>
													</div>
												</div>
												{!form.watch("isOffDay") && (
													<div className="flex items-center gap-2">
														<div className="flex-1">
															<Label className="mb-2 block">
																{t("shift.start_time")}
															</Label>
															<Input
																type="time"
																{...form.register("startTime")}
															/>
														</div>
														<div className="flex-1">
															<Label className="mb-2 block">
																{t("shift.end_time")}
															</Label>
															<Input
																type="time"
																{...form.register("endTime")}
															/>
														</div>
													</div>
												)}
												<div className="flex justify-end gap-2 md:col-start-4">
													<Button
														variant="ghost"
														type="button"
														onClick={() => setEditingDay(null)}
													>
														{t("common.cancel")}
													</Button>
													<Button
														type="submit"
														disabled={updateMutation.isPending}
													>
														{updateMutation.isPending
															? "..."
															: t("common.save")}
													</Button>
												</div>
											</form>
										</div>
									);
								}

								return (
									<div
										key={day.id}
										className="grid grid-cols-4 gap-4 px-6 py-4 items-center text-sm hover:bg-neutral-50 transition-colors"
									>
										<div className="font-medium text-neutral-900">
											{day.name}
										</div>
										<div>
											{schedule?.isOffDay ? (
												<span className="inline-flex px-2 py-1 rounded-md text-[11px] font-bold bg-neutral-100 text-neutral-500 uppercase">
													{t("shift.off_day")}
												</span>
											) : schedule ? (
												<span className="inline-flex px-2 py-1 rounded-md text-[11px] font-bold bg-emerald-100 text-emerald-700 uppercase">
													{t("shift.on_duty")}
												</span>
											) : (
												<span className="inline-flex px-2 py-1 rounded-md text-[11px] font-bold bg-amber-100 text-amber-700 uppercase">
													{t("shift.not_set")}
												</span>
											)}
										</div>
										<div className="text-neutral-600 font-mono">
											{!schedule?.isOffDay && schedule
												? `${schedule.startTime.slice(0, 5)} - ${schedule.endTime.slice(0, 5)}`
												: "-"}
										</div>
										<div className="text-right">
											<Button
												size="sm"
												variant="outline"
												onClick={() => startEditing(day.id)}
											>
												{t("common.edit")}
											</Button>
										</div>
									</div>
								);
							})}
				</div>
			</div>
		</div>
	);
}
