import { useTranslation } from "react-i18next";
import { Input } from "@/components/ui/input";
import { RichTextEditor } from "@/components/ui/rich-text-editor";
import type { TBoardingRegistrationState } from "../../../hooks/useBoardingRegistration";
import { styles } from "../../BoardingForm/BoardingForm.styles";

export type TEditStepOwnerProps = {
	readonly state: TBoardingRegistrationState;
	readonly setField: <K extends keyof TBoardingRegistrationState>(
		field: K,
		value: TBoardingRegistrationState[K],
	) => void;
	readonly ownerNameId: string;
	readonly ownerPhoneId: string;
	readonly ownerAddressId: string;
};

export const EditStepOwner = ({
	state,
	setField,
	ownerNameId,
	ownerPhoneId,
	ownerAddressId,
}: TEditStepOwnerProps) => {
	const { t } = useTranslation();

	return (
		<div className="space-y-6 animate-in fade-in slide-in-from-right-2 duration-300">
			<div className={styles.field}>
				<label htmlFor={ownerNameId} className={styles.label}>
					{t("boarding_form.labels.owner_name")}{" "}
					<span className="text-red-500">*</span>
				</label>
				<Input
					id={ownerNameId}
					value={state.ownerName}
					onChange={(e) => setField("ownerName", e.target.value)}
					placeholder={t("boarding_form.placeholders.owner_name")}
				/>
			</div>
			<div className={styles.field}>
				<label htmlFor={ownerPhoneId} className={styles.label}>
					{t("boarding_form.labels.owner_phone")}
				</label>
				<div className="flex rounded-md border border-cloud-gray focus-within:ring-2 focus-within:ring-mint-green/10 focus-within:border-mint-green transition-all h-10 overflow-hidden bg-white">
					<span className="flex items-center px-3 bg-[#fafafa] text-true-black/60 border-r border-cloud-gray text-[14px] select-none">
						+62
					</span>
					<input
						id={ownerPhoneId}
						type="tel"
						value={state.ownerPhone}
						onChange={(e) => {
							let val = e.target.value.replace(/\D/g, "");
							if (val.startsWith("0")) val = val.substring(1);
							if (val.startsWith("62")) val = val.substring(2);
							setField("ownerPhone", val);
						}}
						placeholder="81234567890"
						className="flex-1 bg-transparent px-3 text-[14px] outline-none placeholder:text-muted-foreground min-w-0"
					/>
				</div>
			</div>
			<div className={styles.field}>
				<label htmlFor={ownerAddressId} className={styles.label}>
					{t("boarding_form.labels.owner_address")}
				</label>
				<RichTextEditor
					value={state.ownerAddress}
					onChange={(value) => setField("ownerAddress", value)}
					placeholder={t("boarding_form.placeholders.owner_address")}
				/>
			</div>
		</div>
	);
};
