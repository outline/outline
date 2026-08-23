import { useTranslation } from "react-i18next";
import { DateTimeInput } from "@/components/ui/datetimepicker-input";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import type { TBoardingRegistrationState } from "../../../hooks/useBoardingRegistration";
import { styles } from "../../BoardingForm/BoardingForm.styles";

export type TEditStepScheduleProps = {
	readonly state: TBoardingRegistrationState;
	readonly branches: readonly { id: string; name: string }[];
	readonly setField: <K extends keyof TBoardingRegistrationState>(
		field: K,
		value: TBoardingRegistrationState[K],
	) => void;
	readonly branchIdSelector: string;
};

export const EditStepSchedule = ({
	state,
	branches,
	setField,
	branchIdSelector,
}: TEditStepScheduleProps) => {
	const { t } = useTranslation();

	return (
		<div className="space-y-6 animate-in fade-in slide-in-from-right-2 duration-300">
			<div className={styles.field}>
				<label htmlFor={branchIdSelector} className={styles.label}>
					{t("boarding_form.labels.select_branch")}{" "}
					<span className="text-red-500">*</span>
				</label>
				<Select
					value={state.branchId}
					onValueChange={(val) => setField("branchId", val)}
				>
					<SelectTrigger id={branchIdSelector} className={styles.input}>
						<SelectValue
							placeholder={t("boarding_form.placeholders.select_branch")}
						/>
					</SelectTrigger>
					<SelectContent>
						{branches.map((b) => (
							<SelectItem key={b.id} value={b.id}>
								{b.name}
							</SelectItem>
						))}
					</SelectContent>
				</Select>
			</div>
			<div className={styles.field}>
				<div className={styles.label}>
					{t("boarding_form.labels.schedule_in_out")}{" "}
					<span className="text-red-500">*</span>
				</div>
				<div>
					<DateTimeInput
						mode="range"
						{...(state.checkInDate || state.estimatedCheckOutDate
							? {
									value: {
										...(state.checkInDate && {
											from: new Date(state.checkInDate),
										}),
										...(state.estimatedCheckOutDate && {
											to: new Date(state.estimatedCheckOutDate),
										}),
									} as import("@/components/ui/datetimepicker/datetimepicker-types").DateRange,
								}
							: {})}
						onValueChange={(val: unknown) => {
							const range = val as { from?: Date; to?: Date } | null;
							if (!range) {
								setField("checkInDate", "");
								setField("estimatedCheckOutDate", "");
							} else {
								setField(
									"checkInDate",
									range.from
										? range.from.toISOString().split("T")[0] || ""
										: "",
								);
								setField(
									"estimatedCheckOutDate",
									range.to ? range.to.toISOString().split("T")[0] || "" : "",
								);
							}
						}}
						placeholder={t("boarding_form.placeholders.schedule_range")}
					/>
				</div>
			</div>
		</div>
	);
};
