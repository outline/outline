import { useCallback, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "@/components/ui";
import { updateBoarding } from "@/lib/api/boardings.functions";
import { i18n } from "@/shared/i18n/i18n.config";
import { generateId } from "@/shared/utils";
import { extractErrorMessage } from "@/shared/utils/error";
import type { TBoardingWithPetsDto } from "../boarding.dto";
import type { UpdateBoardingCommand } from "../boarding.schemas";
import type {
	TBoardingPetInput,
	TBoardingRegistrationState,
} from "./useBoardingRegistration";

export type TUseBoardingEditResult = {
	readonly state: TBoardingRegistrationState;
	readonly step: number;
	readonly isLoading: boolean;
	readonly error: string | null;
	readonly submittedData: TBoardingWithPetsDto | null;
	readonly nextStep: () => void;
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
};

const dtoToState = (
	boarding: TBoardingWithPetsDto,
): TBoardingRegistrationState => ({
	customerId: boarding.customerId ?? null,
	ownerName: boarding.ownerName,
	ownerAddress: boarding.ownerAddress,
	ownerPhone: boarding.ownerPhone.replace(/^(\+?62|0)/, ""),
	emergencyContactName: boarding.emergencyContactName ?? "",
	emergencyContactPhone: boarding.emergencyContactPhone ?? "",
	pets: boarding.pets.map((p) => ({
		id: p.id ?? generateId(),
		name: p.name,
		kind: p.kind,
		breed: p.breed,
		vaccinated: p.vaccinated,
		weight: p.weight ?? "",
		health_status: p.healthStatus ?? "healthy",
		initial_condition: p.initialCondition ?? "",
		notes: p.notes ?? "",
	})),
	branchId: boarding.branchId,
	checkInDate: boarding.checkInDate.split("T")[0] ?? boarding.checkInDate,
	estimatedCheckOutDate: boarding.estimatedCheckOutDate
		? (boarding.estimatedCheckOutDate.split("T")[0] ?? "")
		: "",
	notes: boarding.notes ?? "",
	status: (boarding.status as "draft" | "active") ?? "active",
	agreement: true,
	businessId: null,
	signature: null,
	roomId: null,
	dailyRate: 0,
});

export const useBoardingEdit = (
	boardingId: string,
	initialData: TBoardingWithPetsDto,
): TUseBoardingEditResult => {
	const { t } = useTranslation();
	const [step, setStep] = useState(1);
	const [isLoading, setIsLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [submittedData, setSubmittedData] =
		useState<TBoardingWithPetsDto | null>(null);

	const [state, setState] = useState<TBoardingRegistrationState>(() =>
		dtoToState(initialData),
	);

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

	const nextStep = useCallback(() => {
		setStep((s) => s + 1);
	}, []);

	const prevStep = useCallback(() => {
		setStep((s) => s - 1);
	}, []);

	const submit = useCallback(async () => {
		setIsLoading(true);
		setError(null);
		try {
			const { agreement, ...data } = state;
			const sanitizedData = {
				id: boardingId,
				ownerName: data.ownerName,
				ownerAddress: data.ownerAddress,
				ownerPhone: data.ownerPhone,
				emergencyContactName: data.emergencyContactName || null,
				emergencyContactPhone: data.emergencyContactPhone || null,
				checkInDate: new Date(data.checkInDate),
				estimatedCheckOutDate: data.estimatedCheckOutDate
					? new Date(data.estimatedCheckOutDate)
					: null,
				notes: data.notes || null,
				pets: data.pets.map(
					({ id, health_status, initial_condition, ...p }) => ({
						...p,
						id,
						healthStatus: health_status,
						initialCondition: initial_condition || null,
					}),
				),
			};

			const result = await updateBoarding({
				data: sanitizedData as unknown as UpdateBoardingCommand,
			});
			setSubmittedData(result as unknown as TBoardingWithPetsDto);
			toast.success(t("toast.boarding.update_success_title"), {
				description: t("toast.boarding.update_success_desc"),
			});
		} catch (err) {
			const message = extractErrorMessage(
				err,
				t("toast.boarding.update_error"),
			);
			setError(message);
			toast.error(i18n.t("common.error_title"), { description: message });
		} finally {
			setIsLoading(false);
		}
	}, [state, boardingId, t]);

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
	};
};
