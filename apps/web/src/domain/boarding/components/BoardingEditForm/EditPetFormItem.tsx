import { useId } from "react";
import { useTranslation } from "react-i18next";
import { TrashBinTrashLinear as Trash2 } from "solar-icon-set";
import { Input } from "@/components/ui/input";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { Button } from "@/ui";
import type { TBoardingPetInput } from "../../hooks/useBoardingRegistration";
import { styles } from "../BoardingForm/BoardingForm.styles";

export type TEditPetFormItemProps = {
	readonly index: number;
	readonly pet: TBoardingPetInput;
	readonly updatePet: <K extends keyof TBoardingPetInput>(
		index: number,
		field: K,
		value: TBoardingPetInput[K],
	) => void;
	readonly removePet: (index: number) => void;
	readonly showRemove: boolean;
};

export const EditPetFormItem = ({
	index,
	pet,
	updatePet,
	removePet,
	showRemove,
}: TEditPetFormItemProps) => {
	const { t } = useTranslation();
	const petNameId = useId();
	const petKindId = useId();

	return (
		<div className={styles.petCard}>
			{showRemove && (
				<Button
					type="button"
					variant="ghost"
					size="icon"
					className={styles.removePet}
					onClick={() => removePet(index)}
				>
					<Trash2 className="h-5 w-5" />
				</Button>
			)}
			<div className={styles.petLabel}>
				{t("boarding_form.labels.pet_number", { index: index + 1 })}
			</div>
			<div className="grid gap-6 sm:grid-cols-2">
				<div className={styles.field}>
					<label htmlFor={petNameId} className={styles.label}>
						{t("boarding_form.labels.pet_name")}{" "}
						<span className="text-red-500">*</span>
					</label>
					<Input
						id={petNameId}
						value={pet.name}
						onChange={(e) => updatePet(index, "name", e.target.value)}
						placeholder={t("boarding_form.placeholders.pet_name")}
					/>
				</div>
				<div className={styles.field}>
					<label htmlFor={petKindId} className={styles.label}>
						{t("boarding_form.labels.pet_kind")}{" "}
						<span className="text-red-500">*</span>
					</label>
					<Select
						value={pet.kind}
						onValueChange={(val) => updatePet(index, "kind", val)}
					>
						<SelectTrigger id={petKindId} className={styles.input}>
							<SelectValue />
						</SelectTrigger>
						<SelectContent>
							<SelectItem value="cat">
								{t("boarding_form.labels.pet_kinds.cat")}
							</SelectItem>
							<SelectItem value="dog">
								{t("boarding_form.labels.pet_kinds.dog")}
							</SelectItem>
							<SelectItem value="rabbit">
								{t("boarding.rabbit", "Kelinci")}
							</SelectItem>
							<SelectItem value="other">
								{t("product.categories.other")}
							</SelectItem>
						</SelectContent>
					</Select>
				</div>
			</div>

			<div className="grid gap-6 sm:grid-cols-2 mt-4">
				<div className={styles.field}>
					<label className={styles.label} htmlFor={`pet-breed-${index}`}>
						{t("boarding_form.labels.pet_breed")}
					</label>
					<Input
						id={`pet-breed-${index}`}
						value={pet.breed}
						onChange={(e) => updatePet(index, "breed", e.target.value)}
						placeholder={t("boarding_form.placeholders.pet_breed")}
					/>
				</div>
				<div className={styles.field}>
					<label className={styles.label} htmlFor={`pet-vaccinated-${index}`}>
						{t("boarding_form.labels.pet_vaccinated")}
					</label>
					<Select
						value={pet.vaccinated}
						onValueChange={(val) => updatePet(index, "vaccinated", val)}
					>
						<SelectTrigger
							id={`pet-vaccinated-${index}`}
							className={styles.input}
						>
							<SelectValue />
						</SelectTrigger>
						<SelectContent>
							<SelectItem value="yes">
								{t("boarding_form.labels.pet_vaccinated_options.yes")}
							</SelectItem>
							<SelectItem value="no">
								{t("boarding_form.labels.pet_vaccinated_options.no")}
							</SelectItem>
						</SelectContent>
					</Select>
				</div>
			</div>

			<div className="grid gap-6 sm:grid-cols-2 mt-4">
				<div className={styles.field}>
					<label className={styles.label} htmlFor={`pet-weight-${index}`}>
						{t("boarding_form.labels.pet_weight")}
					</label>
					<Input
						id={`pet-weight-${index}`}
						type="number"
						value={pet.weight}
						onChange={(e) => updatePet(index, "weight", e.target.value)}
						placeholder={t("boarding_form.placeholders.pet_weight")}
					/>
				</div>
				<div className={styles.field}>
					<label className={styles.label} htmlFor={`pet-health-${index}`}>
						{t("boarding_form.labels.health_condition")}
					</label>
					<Select
						value={pet.health_status}
						onValueChange={(val) => updatePet(index, "health_status", val)}
					>
						<SelectTrigger id={`pet-health-${index}`} className={styles.input}>
							<SelectValue />
						</SelectTrigger>
						<SelectContent>
							<SelectItem value="healthy">
								{t("boarding_form.labels.pet_health_options.healthy")}
							</SelectItem>
							<SelectItem value="sick">{t("boarding.sick")}</SelectItem>
							<SelectItem value="recovering">
								{t("boarding.recovering")}
							</SelectItem>
						</SelectContent>
					</Select>
				</div>
			</div>
		</div>
	);
};
