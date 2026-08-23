import { Check, X } from "lucide-react";
import { useTranslation } from "react-i18next";
import { SignaturePad } from "@/components/ui/signature-pad";
import type { TBoardingRegistrationState } from "../../../hooks/useBoardingRegistration";
import { styles } from "../BoardingForm.styles";

export type TStepAgreementProps = {
	readonly state: TBoardingRegistrationState;
	readonly setField: <K extends keyof TBoardingRegistrationState>(
		field: K,
		value: TBoardingRegistrationState[K],
	) => void;
	readonly setSignature: (sig: string | null) => void;
};

export const StepAgreement = ({
	state,
	setField,
	setSignature,
}: TStepAgreementProps) => {
	const { t } = useTranslation();

	return (
		<div className="space-y-6 animate-in fade-in slide-in-from-right-2 duration-300">
			{/* Agreement text */}
			<div className="rounded-xl border border-neutral-200 bg-neutral-50/60 p-5 space-y-3 max-h-56 overflow-y-auto text-[13px] leading-relaxed text-neutral-700">
				<p className="font-semibold text-ink-black text-[14px]">
					{t("boarding_form.agreement.title")}
				</p>
				<p>
					1. {t("boarding_settings.labels.point_1").replace("Poin 1: ", "")}
				</p>
				<p>
					2. {t("boarding_settings.labels.point_2").replace("Poin 2: ", "")}
				</p>
				<p>
					3. {t("boarding_settings.labels.point_3").replace("Poin 3: ", "")}
				</p>
				<p>
					4. {t("boarding_settings.labels.point_4").replace("Poin 4: ", "")}
				</p>
				<p>
					5. {t("common.required")}: {t("boarding_form.summary.vaccinated")}
				</p>
				<p>6. {t("boarding_form.agreement.consent")}</p>
			</div>

			{/* Agreement checkbox */}
			<label className="flex items-start gap-3 cursor-pointer group">
				<input
					type="checkbox"
					checked={state.agreement}
					onChange={(e) => setField("agreement", e.target.checked)}
					className="mt-0.5 h-4 w-4 rounded border-neutral-300 accent-mint-green cursor-pointer"
				/>
				<span className="text-[13px] text-neutral-700 leading-snug group-hover:text-ink-black transition-colors">
					Saya telah membaca dan menyetujui seluruh syarat & ketentuan penitipan
					hewan di atas.
				</span>
			</label>

			{/* Signature pad */}
			<div className="space-y-2">
				<div className="flex items-center justify-between">
					<span className={styles.label}>
						Tanda Tangan Pemilik <span className="text-red-500">*</span>
					</span>
					{state.signature && (
						<span className="text-[11px] text-mint-green font-medium flex items-center gap-1">
							<Check className="w-3 h-3" /> Tersimpan
						</span>
					)}
				</div>
				<div className="relative rounded-xl overflow-hidden border border-neutral-200 bg-white shadow-inner">
					<SignaturePad
						size="md"
						variant="ghost"
						showButtons={false}
						penColor="#1a1a1a"
						lineWidth={3}
						onChange={(sig) => setSignature(sig)}
					/>
					{/* Guide line */}
					<div className="absolute bottom-10 left-6 right-6 border-b border-dashed border-neutral-300 pointer-events-none" />
					<span className="absolute bottom-3 left-1/2 -translate-x-1/2 text-[10px] text-neutral-400 select-none pointer-events-none whitespace-nowrap">
						Tanda tangan di sini
					</span>
					{state.signature && (
						<button
							type="button"
							onClick={() => setSignature(null)}
							className="absolute top-2 right-2 text-[11px] text-neutral-400 hover:text-rose-500 transition-colors flex items-center gap-1"
						>
							<X className="w-3 h-3" /> Ulangi
						</button>
					)}
				</div>
				<p className="text-[11px] text-neutral-400">
					Gunakan mouse atau layar sentuh untuk menandatangani.
				</p>
			</div>
		</div>
	);
};
