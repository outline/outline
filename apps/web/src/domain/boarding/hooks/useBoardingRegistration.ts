import { useCallback, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "@/components/ui";
import type { TRoom } from "@/domain/room/room.types";
import { createBoarding } from "@/lib/api/boardings.functions";
import { submitPublicBoarding } from "@/lib/api/public.functions";
import { i18n } from "@/shared/i18n/i18n.config";
import { DateUtils, generateId } from "@/shared/utils";
import { extractErrorMessage } from "@/shared/utils/error";
import type { TBoardingWithPetsDto } from "../boarding.dto";

export type TBoardingPetInput = {
	readonly id: string; // Internal ID for React keys
	readonly name: string;
	readonly kind: string;
	readonly breed: string;
	readonly vaccinated: string;
	readonly weight: string;
	readonly health_status: string;
	readonly initial_condition: string;
	readonly notes: string;
};

export type TBoardingRegistrationState = {
	readonly businessId: string | null;
	readonly customerId: string | null;
	readonly ownerName: string;
	readonly ownerAddress: string;
	readonly ownerPhone: string;
	readonly emergencyContactName: string;
	readonly emergencyContactPhone: string;
	readonly pets: readonly TBoardingPetInput[];
	readonly branchId: string;
	readonly checkInDate: string;
	readonly estimatedCheckOutDate: string;
	readonly notes: string;
	readonly status: "draft" | "active";
	readonly agreement: boolean;
	readonly signature: string | null;
	readonly roomId: string | null;
	readonly dailyRate: number;
};

export type TUseBoardingRegistrationResult = {
	readonly state: TBoardingRegistrationState;
	readonly step: number;
	readonly isLoading: boolean;
	readonly error: string | null;
	readonly submittedData: TBoardingWithPetsDto | null;
	readonly nextStep: (rooms?: readonly TRoom[]) => void;
	readonly prevStep: () => void;
	readonly setStep: (step: number) => void;
	readonly setField: <K extends keyof TBoardingRegistrationState>(
		field: K,
		value: TBoardingRegistrationState[K],
	) => void;
	readonly updatePet: <K extends keyof TBoardingPetInput>(
		index: number,
		field: K,
		value: TBoardingPetInput[K],
	) => void;
	readonly addPet: () => void;
	readonly removePet: (index: number) => void;
	readonly submit: () => Promise<void>;
	readonly reset: () => void;
	readonly setSignature: (sig: string | null) => void;
};

export const useBoardingRegistration = (
	initialBusinessId?: string | null,
): TUseBoardingRegistrationResult => {
	const { t } = useTranslation();
	const [step, setStep] = useState(1);
	const [isLoading, setIsLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [submittedData, setSubmittedData] =
		useState<TBoardingWithPetsDto | null>(null);

	const [state, setState] = useState<TBoardingRegistrationState>({
		businessId: initialBusinessId || null,
		customerId: null,
		ownerName: "",
		ownerAddress: "",
		ownerPhone: "",
		emergencyContactName: "",
		emergencyContactPhone: "",
		pets: [
			{
				id: generateId(),
				name: "",
				kind: "cat",
				breed: "",
				vaccinated: "yes",
				weight: "",
				health_status: "healthy",
				initial_condition: "",
				notes: "",
			},
		],
		branchId: "",
		checkInDate: DateUtils.toShortDate(),
		estimatedCheckOutDate: "",
		notes: "",
		status: "active",
		agreement: false,
		signature: null,
		roomId: null,
		dailyRate: 0,
	});

	const setField = useCallback(
		<K extends keyof TBoardingRegistrationState>(
			field: K,
			value: TBoardingRegistrationState[K],
		) => {
			setState((prev) => ({ ...prev, [field]: value }));
		},
		[],
	);

	const updatePet = useCallback(
		<K extends keyof TBoardingPetInput>(
			index: number,
			field: K,
			value: TBoardingPetInput[K],
		) => {
			setState((prev) => {
				const newPets = [...prev.pets];
				const pet = newPets[index];
				if (pet) {
					newPets[index] = { ...pet, [field]: value };
				}
				return { ...prev, pets: newPets };
			});
		},
		[],
	);

	const addPet = useCallback(() => {
		setState((prev) => ({
			...prev,
			pets: [
				...prev.pets,
				{
					id: generateId(),
					name: "",
					kind: "cat",
					breed: "",
					vaccinated: "yes",
					weight: "",
					health_status: "healthy",
					initial_condition: "",
					notes: "",
				},
			],
		}));
	}, []);

	const removePet = useCallback((index: number) => {
		setState((prev) => ({
			...prev,
			pets: prev.pets.filter((_, i) => i !== index),
		}));
	}, []);

	const nextStep = useCallback(
		(rooms?: readonly TRoom[]) => {
			if (step === 1) {
				if (!state.branchId) {
					toast.error(t("toast.boarding.validation.select_branch_title"), {
						description: t("toast.boarding.validation.select_branch_desc"),
					});
					return;
				}
				if (!state.roomId) {
					toast.error(t("toast.boarding.validation.room_required_title"), {
						description: t("toast.boarding.validation.room_required_desc"),
					});
					return;
				}
				if (!state.checkInDate) {
					toast.error(t("toast.boarding.validation.checkin_required_title"), {
						description: t("toast.boarding.validation.checkin_required_desc"),
					});
					return;
				}
			} else if (step === 2) {
				if (!state.ownerName.trim()) {
					toast.error(
						t("toast.boarding.validation.owner_name_required_title"),
						{
							description: t(
								"toast.boarding.validation.owner_name_required_desc",
							),
						},
					);
					return;
				}
				if (!state.ownerPhone.trim()) {
					toast.error(t("toast.boarding.validation.phone_required_title"), {
						description: t("toast.boarding.validation.phone_required_desc"),
					});
					return;
				}
				if (!state.ownerAddress.trim()) {
					toast.error(t("toast.boarding.validation.address_required_title"), {
						description: t("toast.boarding.validation.address_required_desc"),
					});
					return;
				}
			} else if (step === 3) {
				if (state.pets.length === 0) {
					toast.error(t("toast.boarding.validation.min_pet_title"), {
						description: t("toast.boarding.validation.min_pet_desc"),
					});
					return;
				}
				for (const pet of state.pets) {
					if (!pet.name.trim()) {
						toast.error(
							t("toast.boarding.validation.pet_name_required_title"),
							{
								description: t(
									"toast.boarding.validation.pet_name_required_desc",
								),
							},
						);
						return;
					}
				}
				if (rooms && state.roomId) {
					const selectedRoom = rooms.find((r) => r.id === state.roomId);
					if (selectedRoom && state.pets.length > selectedRoom.capacity) {
						toast.error(
							t("toast.boarding.validation.insufficient_capacity_title"),
							{
								description: t(
									"toast.boarding.validation.insufficient_capacity_desc",
									{ capacity: selectedRoom.capacity },
								),
							},
						);
						return;
					}
				}
			}

			setStep((s) => s + 1);
		},
		[step, state, t],
	);

	const prevStep = useCallback(() => {
		setStep((s) => s - 1);
	}, []);

	const submit = useCallback(async () => {
		setIsLoading(true);
		setError(null);
		try {
			const { agreement, ...data } = state;
			// Strip internal id from pets before sending
			const sanitizedData = {
				...data,
				ownerSignature: data.signature || null,
				roomId: data.roomId,
				dailyRate: data.dailyRate,
				// Fix Zod validation error: send null instead of empty string
				estimatedCheckOutDate: data.estimatedCheckOutDate || null,
				pets: data.pets.map(
					({ id, health_status, initial_condition, ...p }) => ({
						...p,
						healthStatus: health_status,
						initialCondition: initial_condition || null,
					}),
				),
			};

			const result = state.businessId
				? await submitPublicBoarding({
						data: sanitizedData as never,
					})
				: await createBoarding({
						data: sanitizedData as never,
					});

			setSubmittedData(result as unknown as TBoardingWithPetsDto);
		} catch (err) {
			const message = extractErrorMessage(
				err,
				t("toast.boarding.validation.submit_error"),
			);
			setError(message);
			toast.error(i18n.t("common.error_title"), { description: message });
		} finally {
			setIsLoading(false);
		}
	}, [state, t]);

	const setSignature = useCallback((sig: string | null) => {
		setState((prev) => ({ ...prev, signature: sig }));
	}, []);

	const reset = useCallback(() => {
		setSubmittedData(null);
		setStep(1);
	}, []);

	return {
		state,
		step,
		isLoading,
		error,
		submittedData,
		nextStep,
		prevStep,
		setStep,
		setField,
		updatePet,
		addPet,
		removePet,
		submit,
		reset,
		setSignature,
	};
};
