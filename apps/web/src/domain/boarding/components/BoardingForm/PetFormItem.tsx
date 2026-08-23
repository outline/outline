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
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/ui";
import type { TBoardingPetInput } from "../../hooks/useBoardingRegistration";
import { styles } from "./BoardingForm.styles";

export type TPetFormItemProps = {
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

export const PetFormItem = ({
	index,
	pet,
	updatePet,
	removePet,
	showRemove,
}: TPetFormItemProps) => {
	const { t } = useTranslation();
	const petNameId = useId();
	const petKindId = useId();
	const petBreedId = useId();
	const petNotesId = useId();

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
			<div className="space-y-6">
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
									{t("boarding.cat", "Kucing")}
								</SelectItem>
								<SelectItem value="dog">
									{t("boarding.dog", "Anjing")}
								</SelectItem>
								<SelectItem value="rabbit">
									{t("boarding.rabbit", "Kelinci")}
								</SelectItem>
								<SelectItem value="other">
									{t("boarding.other", "Lainnya")}
								</SelectItem>
							</SelectContent>
						</Select>
					</div>
				</div>

				<div className="grid gap-6 sm:grid-cols-1">
					<div className={styles.field}>
						<label htmlFor={petBreedId} className={styles.label}>
							{t("boarding_form.labels.pet_breed")}
						</label>
						<Input
							id={petBreedId}
							value={pet.breed}
							onChange={(e) => updatePet(index, "breed", e.target.value)}
							placeholder={t("boarding_form.placeholders.pet_breed")}
						/>
					</div>
				</div>

				<div className={styles.field}>
					<label htmlFor={petNotesId} className={styles.label}>
						{t("boarding_form.labels.pet_notes")}
					</label>
					<Textarea
						id={petNotesId}
						value={pet.notes}
						onChange={(e) => updatePet(index, "notes", e.target.value)}
						placeholder={t("boarding_form.placeholders.pet_notes")}
						rows={3}
						className="resize-none"
					/>
				</div>
			</div>
		</div>
	);
};
