import { useCallback, useState } from "react";
import { useTranslation } from "react-i18next";
import { createBranch, updateBranch } from "@/lib/api/branches.functions";
import { BranchDocType } from "@/lib/form-builder/examples/branch.doctype";
import { FormBuilder } from "@/lib/form-builder/form-builder";
import { extractErrorMessage } from "@/shared/utils/error";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Modal } from "@/ui";
import type {
	CreateBranchCommand,
	UpdateBranchCommand,
} from "../../branch.schemas";
import type { TBranch, TDayHours, TOperatingHours } from "../../branch.types";

export type TBranchFormProps = {
	readonly branch?: TBranch | undefined;
	readonly onSuccess?: (branch: TBranch) => void;
	readonly onCancel: () => void;
	readonly onDirtyChange?: (isDirty: boolean) => void;
	readonly hideModal?: boolean;
};

const DAYS = [
	"monday",
	"tuesday",
	"wednesday",
	"thursday",
	"friday",
	"saturday",
	"sunday",
] as const;

const DEFAULT_DAY: TDayHours = {
	opens: "08:00",
	closes: "21:00",
	isClosed: false,
};

const defaultHours = (): TOperatingHours => ({
	monday: { ...DEFAULT_DAY },
	tuesday: { ...DEFAULT_DAY },
	wednesday: { ...DEFAULT_DAY },
	thursday: { ...DEFAULT_DAY },
	friday: { ...DEFAULT_DAY },
	saturday: { ...DEFAULT_DAY },
	sunday: { ...DEFAULT_DAY },
});

export const BranchForm = ({
	branch,
	onSuccess,
	onCancel,
	onDirtyChange,
	hideModal = false,
}: TBranchFormProps) => {
	const { t } = useTranslation();
	const isEditing = !!branch;
	const [hours, setHours] = useState<TOperatingHours>(
		branch?.operatingHours ?? defaultHours(),
	);

	const updateDay = useCallback(
		(day: (typeof DAYS)[number], patch: Partial<TDayHours>) => {
			setHours((prev) => ({ ...prev, [day]: { ...prev[day], ...patch } }));
			onDirtyChange?.(true);
		},
		[onDirtyChange],
	);

	const handleSubmit = useCallback(
		async (values: Record<string, unknown>) => {
			try {
				const shared = {
					name: values.name as string,
					address: (values.address as string) || null,
					phone: (values.phone as string) || null,
					email: (values.email as string) || null,
					whatsappNumber: (values.whatsapp_number as string) || null,
					streetAddress: (values.street_address as string) || null,
					addressLocality: (values.address_locality as string) || null,
					addressRegion: (values.address_region as string) || null,
					postalCode: (values.postal_code as string) || null,
					addressCountry: (values.address_country as string) || null,
					latitude:
						values.latitude === "" || values.latitude === undefined
							? null
							: Number(values.latitude),
					longitude:
						values.longitude === "" || values.longitude === undefined
							? null
							: Number(values.longitude),
					operatingHours: hours,
				};

				let result: TBranch;
				if (branch) {
					const command: UpdateBranchCommand = { id: branch.id, ...shared };
					await updateBranch({ data: command });
					result = { ...branch, ...command } as TBranch;
				} else {
					const command: CreateBranchCommand = shared;
					result = (await createBranch({
						data: command,
					})) as unknown as TBranch;
				}

				onSuccess?.(result);
				return {
					message: isEditing
						? t("branch.toast_update_success")
						: t("branch.toast_add_success"),
				};
			} catch (err) {
				const message = extractErrorMessage(err, t("branch.toast_save_error"));
				return { message, error: true };
			}
		},
		[branch, onSuccess, isEditing, t, hours],
	);

	const form = (
		<>
			<FormBuilder
				doctype={BranchDocType}
				mode={isEditing ? "edit" : "create"}
				{...(branch
					? {
							initialValues: {
								name: branch.name,
								address: branch.address ?? "",
								phone: branch.phone ?? "",
								email: branch.email ?? "",
								whatsapp_number: branch.whatsappNumber ?? "",
								street_address: branch.streetAddress ?? "",
								address_locality: branch.addressLocality ?? "",
								address_region: branch.addressRegion ?? "",
								postal_code: branch.postalCode ?? "",
								address_country: branch.addressCountry ?? "",
								latitude: branch.latitude ?? "",
								longitude: branch.longitude ?? "",
							},
						}
					: {})}
				onSubmit={handleSubmit}
				onCancel={onCancel}
				{...(onDirtyChange ? { onDirtyChange } : {})}
			/>
			<div className="mt-4 space-y-2">
				<h3 className="text-sm font-semibold">{t("branch.hours_section")}</h3>
				{DAYS.map((day) => (
					<div key={day} className="flex items-center gap-3">
						<Label className="w-24 shrink-0 capitalize">
							{t(`branch.day_${day}`)}
						</Label>
						<Switch
							checked={!hours[day].isClosed}
							onCheckedChange={(checked) =>
								updateDay(day, { isClosed: !checked })
							}
						/>
						<Input
							type="time"
							value={hours[day].opens}
							disabled={hours[day].isClosed}
							onChange={(e) => updateDay(day, { opens: e.target.value })}
						/>
						<Input
							type="time"
							value={hours[day].closes}
							disabled={hours[day].isClosed}
							onChange={(e) => updateDay(day, { closes: e.target.value })}
						/>
					</div>
				))}
			</div>
		</>
	);

	if (hideModal) return form;

	return (
		<Modal
			isOpen={true}
			onClose={onCancel}
			title={isEditing ? t("branch.edit_title") : t("branch.add_title")}
			subtitle={
				isEditing ? t("branch.edit_subtitle") : t("branch.add_subtitle")
			}
		>
			{form}
		</Modal>
	);
};
