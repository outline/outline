import { useQuery } from "@tanstack/react-query";
import { Check } from "lucide-react";
import * as React from "react";
import { useId } from "react";
import { useTranslation } from "react-i18next";
import {
	AltArrowLeftLinear as ChevronLeft,
	AltArrowRightLinear as ChevronRight,
} from "solar-icon-set";
import { getBranches } from "@/lib/api/branches.functions";
import { cn } from "@/shared/utils";
import { Button } from "@/ui";
import type { TBoardingWithPetsDto } from "../../boarding.dto";
import { useBoardingEdit } from "../../hooks/useBoardingEdit";
import { styles } from "../BoardingForm/BoardingForm.styles";
import { EditStepOwner } from "./steps/EditStepOwner";
import { EditStepPets } from "./steps/EditStepPets";
import { EditStepSchedule } from "./steps/EditStepSchedule";

export type TBoardingEditFormProps = {
	readonly boardingId: string;
	readonly initialData: TBoardingWithPetsDto;
	readonly onSuccess?: ((data: TBoardingWithPetsDto) => void) | undefined;
	readonly onCancel?: (() => void) | undefined;
	readonly onDirtyChange?: ((isDirty: boolean) => void) | undefined;
};

export const BoardingEditForm = ({
	boardingId,
	initialData,
	onSuccess,
	onCancel,
	onDirtyChange,
}: TBoardingEditFormProps) => {
	const { t } = useTranslation();
	const ownerNameId = useId();
	const ownerPhoneId = useId();
	const ownerAddressId = useId();
	const branchIdSelector = useId();

	const {
		state,
		step,
		isLoading,
		submittedData,
		nextStep,
		prevStep,
		setField,
		updatePet,
		addPet,
		removePet,
		submit,
	} = useBoardingEdit(boardingId, initialData);

	const { data: branches = [] } = useQuery({
		queryKey: ["branches"],
		queryFn: () => getBranches(),
	});

	// Handle success callback
	React.useEffect(() => {
		if (submittedData && onSuccess) {
			onSuccess(submittedData);
		}
	}, [submittedData, onSuccess]);

	// Track dirtiness
	React.useEffect(() => {
		onDirtyChange?.(true);
	}, [onDirtyChange]);

	const steps = [
		{
			id: "schedule",
			title: t("boarding_form.steps.schedule.title"),
			description: t("boarding_form.steps.schedule.description"),
		},
		{
			id: "owner",
			title: t("boarding_form.steps.owner.title"),
			description: t("boarding_form.steps.owner.description"),
		},
		{
			id: "pets",
			title: t("boarding_form.steps.pets.title"),
			description: t("boarding_form.steps.pets.description"),
		},
	];

	return (
		<div className={cn(styles.container, "p-0 min-h-0")}>
			<div className={cn(styles.content, "p-0 max-w-none")}>
				<div className={cn(styles.formWrapper, "max-w-none")}>
					<div className={cn(styles.card, "border-none shadow-none")}>
						{/* Step Header */}
						<div className="border-b border-mist-gray bg-[#fafafa]/50 py-5 px-5 sm:px-6 -mx-5">
							<div className="flex items-start w-full max-w-sm mx-auto pt-2 pb-8 px-8 sm:px-12">
								{steps.map((s, index) => {
									const stepNumber = index + 1;
									const isActive = step === stepNumber;
									const isDone = step > stepNumber;
									const isLast = index === steps.length - 1;

									return (
										<React.Fragment key={s.id}>
											<div className="relative flex flex-col items-center">
												<div
													className={cn(
														"w-8 h-8 rounded-full flex items-center justify-center border-2 bg-white transition-all duration-300 z-10",
														isDone
															? "bg-mint-green border-mint-green text-white"
															: isActive
																? "border-mint-green text-mint-green font-semibold"
																: "border-neutral-200 text-neutral-400 font-medium",
													)}
												>
													{isDone ? (
														<Check className="w-4 h-4 stroke-[3]" />
													) : (
														<span className="text-[13px]">{stepNumber}</span>
													)}
												</div>
												<span
													className={cn(
														"absolute top-[38px] whitespace-nowrap text-[12px] font-medium transition-colors duration-300",
														isActive || isDone
															? "text-ink-black"
															: "text-neutral-400",
													)}
												>
													{s.title}
												</span>
											</div>

											{!isLast && (
												<div className="flex-1 h-[2px] mx-2 sm:mx-3 relative top-[15px]">
													<div className="absolute inset-0 bg-neutral-200" />
													<div
														className={cn(
															"absolute left-0 top-0 bottom-0 bg-mint-green transition-all duration-500",
															isDone ? "w-full" : "w-0",
														)}
													/>
												</div>
											)}
										</React.Fragment>
									);
								})}
							</div>

							<div className="mt-8">
								<h2 className="text-[20px] font-semibold text-ink-black">
									{steps[step - 1]?.title}
								</h2>
								<p className="text-[14px] text-true-black/60 mt-1">
									{steps[step - 1]?.description}
								</p>
							</div>
						</div>

						{/* Step Content */}
						<div className="bg-white min-h-[300px] py-6">
							{step === 1 && (
								<EditStepSchedule
									state={state}
									branches={branches}
									setField={setField}
									branchIdSelector={branchIdSelector}
								/>
							)}

							{step === 2 && (
								<EditStepOwner
									state={state}
									setField={setField}
									ownerNameId={ownerNameId}
									ownerPhoneId={ownerPhoneId}
									ownerAddressId={ownerAddressId}
								/>
							)}

							{step === 3 && (
								<EditStepPets
									state={state}
									updatePet={updatePet}
									addPet={addPet}
									removePet={removePet}
								/>
							)}
						</div>

						{/* Footer */}
						<div
							className={cn(
								styles.footer,
								"sticky -bottom-5 z-10 bg-white py-4 px-6 border-t border-mist-gray -mx-5 rounded-b-lg",
							)}
						>
							{step > 1 ? (
								<Button
									type="button"
									variant="outline"
									onClick={prevStep}
									className={styles.footerButton}
								>
									<ChevronLeft className="mr-2 h-4 w-4" />
									{t("boarding_form.buttons.back")}
								</Button>
							) : (
								<Button
									type="button"
									variant="outline"
									onClick={onCancel}
									className={styles.footerButton}
								>
									{t("common.cancel")}
								</Button>
							)}

							{step < steps.length ? (
								<Button
									type="button"
									onClick={nextStep}
									className={styles.footerButton}
								>
									{t("common.next")} <ChevronRight className="ml-2 h-4 w-4" />
								</Button>
							) : (
								<Button
									type="button"
									onClick={submit}
									disabled={isLoading}
									className={styles.footerButton}
								>
									{isLoading
										? t("common.processing")
										: t("common.save_changes")}
								</Button>
							)}
						</div>
					</div>
				</div>
			</div>
		</div>
	);
};
