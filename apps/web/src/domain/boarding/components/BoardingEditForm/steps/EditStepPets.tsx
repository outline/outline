import { useTranslation } from "react-i18next";
import { AddCircleLinear as Plus } from "solar-icon-set";
import { Button } from "@/ui";
import type {
	TBoardingPetInput,
	TBoardingRegistrationState,
} from "../../../hooks/useBoardingRegistration";
import { styles } from "../../BoardingForm/BoardingForm.styles";
import { EditPetFormItem } from "../EditPetFormItem";

export type TEditStepPetsProps = {
	readonly state: TBoardingRegistrationState;
	readonly updatePet: <K extends keyof TBoardingPetInput>(
		index: number,
		field: K,
		value: TBoardingPetInput[K],
	) => void;
	readonly addPet: () => void;
	readonly removePet: (index: number) => void;
};

export const EditStepPets = ({
	state,
	updatePet,
	addPet,
	removePet,
}: TEditStepPetsProps) => {
	const { t } = useTranslation();

	return (
		<div className="space-y-8 animate-in fade-in slide-in-from-right-2 duration-300">
			{state.pets.map((pet, index) => (
				<EditPetFormItem
					key={pet.id}
					index={index}
					pet={pet}
					updatePet={updatePet}
					removePet={removePet}
					showRemove={state.pets.length > 1}
				/>
			))}
			<Button
				type="button"
				variant="outline"
				className={styles.addPetButton}
				onClick={addPet}
			>
				<Plus className="h-4 w-4" /> {t("boarding.add_another_pet")}
			</Button>
		</div>
	);
};
