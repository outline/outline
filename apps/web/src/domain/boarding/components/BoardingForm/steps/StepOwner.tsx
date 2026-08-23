import { X } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Input } from "@/components/ui/input";
import { RichTextEditor } from "@/components/ui/rich-text-editor";
import { CustomerSelector } from "@/domain/customer";
import { cn } from "@/shared/utils";
import type { TBoardingRegistrationState } from "../../../hooks/useBoardingRegistration";
import { styles } from "../BoardingForm.styles";

export type TStepOwnerProps = {
	readonly state: TBoardingRegistrationState;
	readonly setField: <K extends keyof TBoardingRegistrationState>(
		field: K,
		value: TBoardingRegistrationState[K],
	) => void;
	readonly isCreatingNew: boolean;
	readonly setIsCreatingNew: (val: boolean) => void;
	readonly ownerNameId: string;
	readonly ownerPhoneId: string;
	readonly ownerAddressId: string;
};

export const StepOwner = ({
	state,
	setField,
	isCreatingNew,
	setIsCreatingNew,
	ownerNameId,
	ownerPhoneId,
	ownerAddressId,
}: TStepOwnerProps) => {
	const { t } = useTranslation();

	return (
		<div className="space-y-6 animate-in fade-in slide-in-from-right-2 duration-300">
			{!isCreatingNew && !state.customerId ? (
				<div className={styles.field}>
					<label htmlFor={ownerNameId} className={styles.label}>
						Cari Pelanggan <span className="text-red-500">*</span>
					</label>
					<CustomerSelector
						value={state.customerId}
						selectedName={state.ownerName}
						onSelectCustomer={(customer) => {
							setField("customerId", customer.id);
							setField("ownerName", customer.fullName);
							setField("ownerPhone", customer.phone);
							setField("ownerAddress", customer.address || "");
						}}
						onCreateNew={(searchVal) => {
							setField("customerId", null);
							const isPhone = /^[0-9+]+$/.test(searchVal.replace(/\s/g, ""));
							if (isPhone) {
								setField("ownerName", "");
								let phoneVal = searchVal.replace(/\D/g, "");
								if (phoneVal.startsWith("0")) phoneVal = phoneVal.substring(1);
								if (phoneVal.startsWith("62")) phoneVal = phoneVal.substring(2);
								setField("ownerPhone", phoneVal);
							} else {
								setField("ownerName", searchVal);
								setField("ownerPhone", "");
							}
							setField("ownerAddress", "");
							setIsCreatingNew(true);
						}}
						onClear={() => {
							setField("customerId", null);
							setField("ownerName", "");
							setField("ownerPhone", "");
							setField("ownerAddress", "");
						}}
					/>
				</div>
			) : (
				<div className="space-y-6 animate-in fade-in slide-in-from-top-2 duration-300">
					<div className="flex items-center justify-between pb-4 border-b border-mist-gray">
						<div className="flex items-center gap-2">
							<span className="text-[14px] font-semibold text-ink-black">
								{state.customerId ? "Pelanggan Terdaftar" : "Pelanggan Baru"}
							</span>
							{state.customerId ? (
								<div className="h-5 px-2 rounded-full text-[10px] font-medium bg-mint-green/10 text-mint-green flex items-center">
									Terdaftar
								</div>
							) : (
								<div className="h-5 px-2 rounded-full text-[10px] font-medium bg-neutral-100 text-neutral-600 flex items-center">
									Baru
								</div>
							)}
						</div>
						<button
							type="button"
							className="flex items-center gap-1 text-[12px] font-medium text-muted-foreground hover:text-ink-black transition-colors"
							onClick={() => {
								setIsCreatingNew(false);
								setField("customerId", null);
								setField("ownerName", "");
								setField("ownerPhone", "");
								setField("ownerAddress", "");
							}}
						>
							<X className="h-3.5 w-3.5" />
							Ganti Pelanggan
						</button>
					</div>

					<div className={styles.field}>
						<label htmlFor={ownerNameId} className={styles.label}>
							Nama Pelanggan <span className="text-red-500">*</span>
						</label>
						<Input
							id={ownerNameId}
							value={state.ownerName}
							disabled={!!state.customerId}
							onChange={(e) => setField("ownerName", e.target.value)}
							placeholder="Nama lengkap pemilik"
							className={cn(
								!!state.customerId && "opacity-60 cursor-not-allowed",
							)}
						/>
					</div>
					<div className={styles.field}>
						<label htmlFor={ownerPhoneId} className={styles.label}>
							{t("boarding_form.labels.owner_phone")}{" "}
							<span className="text-red-500">*</span>
						</label>
						<div
							className={cn(
								"flex rounded-md border border-cloud-gray focus-within:ring-2 focus-within:ring-mint-green/10 focus-within:border-mint-green transition-all h-10 overflow-hidden bg-white",
								!!state.customerId && "opacity-60 cursor-not-allowed",
							)}
						>
							<span className="flex items-center px-3 bg-[#fafafa] text-true-black/60 border-r border-cloud-gray text-[14px] select-none">
								+62
							</span>
							<input
								id={ownerPhoneId}
								type="tel"
								disabled={!!state.customerId}
								value={state.ownerPhone}
								onChange={(e) => {
									let val = e.target.value.replace(/\D/g, "");
									if (val.startsWith("0")) val = val.substring(1);
									if (val.startsWith("62")) val = val.substring(2);
									setField("ownerPhone", val);
								}}
								placeholder="81234567890"
								className="flex-1 bg-transparent px-3 text-[14px] outline-none placeholder:text-muted-foreground min-w-0 disabled:cursor-not-allowed"
							/>
						</div>
					</div>
					<div className={styles.field}>
						<label htmlFor={ownerAddressId} className={styles.label}>
							{t("boarding_form.labels.owner_address")}{" "}
							<span className="text-red-500">*</span>
						</label>
						<RichTextEditor
							value={state.ownerAddress}
							onChange={(value) => setField("ownerAddress", value)}
							placeholder={t("boarding_form.placeholders.owner_address")}
						/>
					</div>
				</div>
			)}
		</div>
	);
};
