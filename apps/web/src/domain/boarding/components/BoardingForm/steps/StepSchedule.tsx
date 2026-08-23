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
import { styles } from "../BoardingForm.styles";

export type TStepScheduleProps = {
	readonly state: TBoardingRegistrationState;
	readonly branches: readonly { id: string; name: string }[];
	readonly rooms: readonly {
		id: string;
		name: string;
		capacity: number;
		dailyRate: number;
	}[];
	readonly setField: <K extends keyof TBoardingRegistrationState>(
		field: K,
		value: TBoardingRegistrationState[K],
	) => void;
	readonly branchIdSelector: string;
};

export const StepSchedule = ({
	state,
	branches,
	rooms,
	setField,
	branchIdSelector,
}: TStepScheduleProps) => {
	const { t } = useTranslation();

	return (
		<div className="space-y-6 animate-in fade-in slide-in-from-right-2 duration-300">
			<div className={styles.field}>
				<label htmlFor={branchIdSelector} className={styles.label}>
					{t("boarding_form.labels.branch")}{" "}
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
				<label className={styles.label}>
					Pilih Kamar <span className="text-red-500">*</span>
				</label>
				<Select
					{...(state.roomId ? { value: state.roomId } : {})}
					onValueChange={(val) => {
						const selectedRoom = rooms.find((r) => r.id === val);
						if (selectedRoom) {
							setField("roomId", val);
							setField("dailyRate", selectedRoom.dailyRate);
						}
					}}
				>
					<SelectTrigger className={styles.input}>
						<SelectValue placeholder="Pilih kamar untuk hewan peliharaan" />
					</SelectTrigger>
					<SelectContent>
						{rooms.map((room) => (
							<SelectItem key={room.id} value={room.id}>
								{room.name} (Kapasitas: {room.capacity} hewan) - Rp{" "}
								{room.dailyRate.toLocaleString("id-ID")}/hari
							</SelectItem>
						))}
					</SelectContent>
				</Select>
			</div>
			<div className={styles.field}>
				<div className={styles.label}>
					Jadwal Check-in & Check-out <span className="text-red-500">*</span>
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
								if (range.from) {
									setField(
										"checkInDate",
										range.from.toISOString().split("T")[0] ?? "",
									);
								} else {
									setField("checkInDate", "");
								}
								if (range.to) {
									setField(
										"estimatedCheckOutDate",
										range.to.toISOString().split("T")[0] ?? "",
									);
								} else {
									setField("estimatedCheckOutDate", "");
								}
							}
						}}
						placeholder="Pilih rentang tanggal check-in & check-out"
					/>
				</div>
			</div>
		</div>
	);
};
