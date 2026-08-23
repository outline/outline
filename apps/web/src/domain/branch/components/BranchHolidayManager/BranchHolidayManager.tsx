import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import {
	AddCircleLinear as AddIcon,
	CalendarLinear as CalendarIcon,
	TrashBinMinimalisticBold as TrashIcon,
} from "solar-icon-set";
import { toast } from "@/components/ui";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import type { TBranchHoliday } from "@/domain/branch";
import {
	createBranchHoliday,
	deleteBranchHoliday,
	getBranchHolidays,
} from "@/lib/api/branches.functions";
import { QUERY_POLICY } from "@/shared/cache/cache-policy";
import { invalidateBranches } from "@/shared/cache/invalidation";
import { queryKeys } from "@/shared/cache/query-keys";
import { formatDate } from "@/shared/utils";
import { EmptyState } from "@/ui";

export type TBranchHolidayManagerProps = {
	readonly branchId: string;
	readonly branchName: string;
};

export const BranchHolidayManager = ({
	branchId,
	branchName,
}: TBranchHolidayManagerProps) => {
	const { t } = useTranslation();
	const queryClient = useQueryClient();
	const [isAddOpen, setIsAddOpen] = useState(false);
	const [newHoliday, setNewHoliday] = useState({
		name: "",
		date: new Date() as Date | undefined,
		isRecurring: false,
	});

	const { data: holidays = [], isLoading } = useQuery({
		queryKey: queryKeys.branches.holidays(branchId),
		staleTime: QUERY_POLICY.reference.staleTime,
		gcTime: QUERY_POLICY.reference.gcTime,
		queryFn: () => getBranchHolidays({ data: branchId }),
	});

	const createMutation = useMutation({
		mutationFn: createBranchHoliday,
		onSuccess: () => {
			toast.success(t("toast.branch.holiday_add_success_title"), {
				description: t("toast.branch.holiday_add_success_desc"),
			});
			invalidateBranches(queryClient, branchId);
			setIsAddOpen(false);
			setNewHoliday({ name: "", date: new Date(), isRecurring: false });
		},
		onError: () => {
			toast.error(t("toast.branch.holiday_add_error_title"), {
				description: t("toast.branch.holiday_add_error_desc"),
			});
		},
	});

	const deleteMutation = useMutation({
		mutationFn: deleteBranchHoliday,
		onSuccess: () => {
			toast.success(t("toast.branch.holiday_delete_success_title"), {
				description: t("toast.branch.holiday_delete_success_desc"),
			});
			invalidateBranches(queryClient, branchId);
		},
		onError: () => {
			toast.error(t("toast.branch.holiday_delete_error_title"), {
				description: t("toast.branch.holiday_delete_error_desc"),
			});
		},
	});

	const handleSubmit = () => {
		if (!newHoliday.name.trim() || !newHoliday.date) {
			toast.error(t("toast.branch.holiday_validation_title"), {
				description: t("toast.branch.holiday_validation_desc"),
			});
			return;
		}

		createMutation.mutate({
			data: {
				branchId,
				name: newHoliday.name,
				date: newHoliday.date,
				isRecurring: newHoliday.isRecurring,
			},
		});
	};

	const handleDelete = (id: string) => {
		deleteMutation.mutate({ data: { id, branchId } });
	};

	const today = new Date();
	today.setHours(0, 0, 0, 0);

	const upcomingHolidays = holidays.filter((h) => new Date(h.date) >= today);
	const pastHolidays = holidays.filter((h) => new Date(h.date) < today);

	return (
		<div className="space-y-6">
			<div className="flex items-center justify-between">
				<div>
					<h3 className="text-lg font-semibold text-neutral-900">
						{t("branch.holidays.title")}
					</h3>
					<p className="text-sm text-neutral-500 mt-1">
						{t("branch.holidays.subtitle", {
							branch: branchName,
						})}
					</p>
				</div>
				<Button size="sm" className="gap-2" onClick={() => setIsAddOpen(true)}>
					<AddIcon className="w-4 h-4" />
					{t("branch.holidays.add")}
				</Button>
			</div>

			{isLoading ? (
				<div className="space-y-3">
					{[1, 2, 3].map((i) => (
						<div
							key={i}
							className="h-16 bg-neutral-100 rounded-lg animate-pulse"
						/>
					))}
				</div>
			) : holidays.length === 0 ? (
				<EmptyState
					variant="branches"
					title={t("branch.holidays.empty_title")}
					description={t("branch.holidays.empty_desc")}
				/>
			) : (
				<div className="space-y-6">
					{/* Upcoming Holidays */}
					{upcomingHolidays.length > 0 && (
						<div>
							<h4 className="text-sm font-medium text-neutral-500 mb-3">
								{t("branch.holidays.upcoming")}
							</h4>
							<div className="space-y-2">
								{upcomingHolidays.map((holiday) => (
									<HolidayItem
										key={holiday.id}
										holiday={holiday}
										onDelete={handleDelete}
										isDeleting={deleteMutation.isPending}
									/>
								))}
							</div>
						</div>
					)}

					{/* Past Holidays */}
					{pastHolidays.length > 0 && (
						<div>
							<h4 className="text-sm font-medium text-neutral-400 mb-3">
								{t("branch.holidays.past")}
							</h4>
							<div className="space-y-2 opacity-60">
								{pastHolidays.map((holiday) => (
									<HolidayItem
										key={holiday.id}
										holiday={holiday}
										onDelete={handleDelete}
										isDeleting={deleteMutation.isPending}
										isPast
									/>
								))}
							</div>
						</div>
					)}
				</div>
			)}

			{/* Add Holiday Dialog */}
			<Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>{t("branch.holidays.add_title")}</DialogTitle>
					</DialogHeader>

					<div className="space-y-4 py-4">
						<div className="space-y-2">
							<Label>{t("branch.holidays.name")}</Label>
							<Input
								value={newHoliday.name}
								onChange={(e) =>
									setNewHoliday({ ...newHoliday, name: e.target.value })
								}
								placeholder={t("branch.holidays.name_placeholder")}
							/>
						</div>

						<div className="space-y-2">
							<Label>{t("branch.holidays.date")}</Label>
							<Calendar
								mode="single"
								selected={newHoliday.date}
								onSelect={(date) =>
									setNewHoliday({ ...newHoliday, date: date || undefined })
								}
								disabled={(date) => date < today}
								className="rounded-md border"
							/>
						</div>

						<div className="flex items-center gap-3">
							<Switch
								checked={newHoliday.isRecurring}
								onCheckedChange={(checked) =>
									setNewHoliday({ ...newHoliday, isRecurring: checked })
								}
							/>
							<div>
								<Label>{t("branch.holidays.recurring")}</Label>
								<p className="text-xs text-neutral-500">
									{t("branch.holidays.recurring_desc")}
								</p>
							</div>
						</div>
					</div>

					<div className="flex gap-3 pt-2">
						<Button
							variant="outline"
							className="flex-1"
							onClick={() => setIsAddOpen(false)}
						>
							{t("common.cancel")}
						</Button>
						<Button
							className="flex-1"
							onClick={handleSubmit}
							disabled={createMutation.isPending}
						>
							{createMutation.isPending ? t("common.saving") : t("common.save")}
						</Button>
					</div>
				</DialogContent>
			</Dialog>
		</div>
	);
};

function HolidayItem({
	holiday,
	onDelete,
	isDeleting,
	isPast = false,
}: {
	holiday: TBranchHoliday;
	onDelete: (id: string) => void;
	isDeleting: boolean;
	isPast?: boolean;
}) {
	const { t, i18n } = useTranslation();
	const holidayDate = new Date(holiday.date);

	return (
		<div className="flex items-center justify-between p-3 bg-neutral-50 rounded-lg">
			<div className="flex items-center gap-3">
				<div className="w-10 h-10 rounded-lg bg-white border border-neutral-200 flex items-center justify-center">
					<CalendarIcon className="w-5 h-5 text-neutral-500" />
				</div>
				<div>
					<p className="text-sm font-medium text-neutral-900">{holiday.name}</p>
					<p className="text-xs text-neutral-500">
						{formatDate(holidayDate, i18n.language === "id" ? "id" : "en", {
							weekday: "long",
							day: "numeric",
							month: "long",
							year: "numeric",
						})}
						{holiday.isRecurring && (
							<span className="ml-2 text-xs bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded">
								{t("branch.holidays.recurring_badge")}
							</span>
						)}
					</p>
				</div>
			</div>
			{!isPast && (
				<Button
					variant="ghost"
					size="icon"
					className="text-neutral-400 hover:text-rose-500"
					onClick={() => onDelete(holiday.id)}
					disabled={isDeleting}
				>
					<TrashIcon className="w-4 h-4" />
				</Button>
			)}
		</div>
	);
}
