import { useQuery } from "@tanstack/react-query";
import * as React from "react";
import { useTranslation } from "react-i18next";
import { CustomerSelector } from "@/domain/customer";
import { createBoarding } from "@/lib/api/boardings.functions";
import { getBranches } from "@/lib/api/branches.functions";
import {
	getPublicBranches,
	getPublicRooms,
	submitPublicBoarding,
} from "@/lib/api/public.functions";
import { getRooms } from "@/lib/api/room.functions";
import { FormBuilder } from "@/lib/form-builder";
import type { FormBuilderRef } from "@/lib/form-builder/form-builder";
import { cn } from "@/shared/utils";
import { extractErrorMessage } from "@/shared/utils/error";
import { PageHeader } from "@/ui";
import { BoardingDocType } from "../../boarding.doctype";
import type { TBoardingWithPetsDto } from "../../boarding.dto";
import { styles } from "./BoardingForm.styles";
import { BoardingSuccessView } from "./BoardingSuccessView";

export type TBoardingFormProps = {
	readonly hideHeader?: boolean;
	readonly onSuccess?: (data: TBoardingWithPetsDto) => void;
	readonly onCancel?: () => void;
	readonly onDirtyChange?: (isDirty: boolean) => void;
	readonly publicBusinessId?: string;
};

// Custom component to wrap CustomerSelector for FormBuilder
const CustomerSelectorField = ({
	values,
	formApi,
}: {
	values: Record<string, unknown>;
	formApi: FormBuilderRef | null;
}) => {
	return (
		<CustomerSelector
			value={values.customerId as string | null}
			selectedName={values.ownerName as string}
			onSelectCustomer={(customer) => {
				formApi?.setValues({
					customerId: customer.id,
					ownerName: customer.fullName,
					ownerPhone: customer.phone,
					ownerAddress: customer.address || "",
					isCreatingNew: false,
				});
			}}
			onCreateNew={(searchVal) => {
				const isPhone = /^[0-9+]+$/.test(searchVal.replace(/\s/g, ""));
				let name = searchVal;
				let phone = "";
				if (isPhone) {
					name = "";
					phone = searchVal.replace(/\D/g, "");
					if (phone.startsWith("0")) phone = phone.substring(1);
					if (phone.startsWith("62")) phone = phone.substring(2);
				}
				formApi?.setValues({
					customerId: null,
					ownerName: name,
					ownerPhone: phone,
					ownerAddress: "",
					isCreatingNew: true,
				});
			}}
			onClear={() => {
				formApi?.setValues({
					customerId: null,
					ownerName: "",
					ownerPhone: "",
					ownerAddress: "",
					isCreatingNew: true,
				});
			}}
		/>
	);
};

export const BoardingForm = ({
	hideHeader = false,
	onSuccess,
	onCancel,
	onDirtyChange,
	publicBusinessId,
}: TBoardingFormProps) => {
	const { t } = useTranslation();
	const [submittedData, setSubmittedData] =
		React.useState<TBoardingWithPetsDto | null>(null);
	const [selectedBranchId, setSelectedBranchId] = React.useState<string | null>(
		null,
	);

	const { data: branches = [] } = useQuery({
		queryKey: ["branches", publicBusinessId],
		queryFn: async () => {
			if (publicBusinessId) {
				const res = await getPublicBranches({ data: publicBusinessId });
				return res.map((b) => ({
					id: b.id,
					name: b.name,
				}));
			}
			return getBranches();
		},
	});

	const { data: allRooms = [] } = useQuery({
		queryKey: ["rooms", publicBusinessId, selectedBranchId],
		queryFn: async () => {
			if (!selectedBranchId && !publicBusinessId) return [];
			if (publicBusinessId) {
				const res = await getPublicRooms({ data: publicBusinessId });
				return res.map((r) => ({
					id: r.id,
					branchId: r.branchId,
					name: r.name,
					capacity: r.capacity,
					dailyRate: r.dailyRate,
				}));
			}
			if (!selectedBranchId) return [];
			return getRooms({ data: { branchId: selectedBranchId } });
		},
		enabled: !!selectedBranchId || !!publicBusinessId,
	});

	// For public mode, we filter allRooms by selectedBranchId
	// For internal mode, allRooms is already filtered by the API using selectedBranchId
	const rooms = React.useMemo(() => {
		if (publicBusinessId && selectedBranchId) {
			return allRooms.filter((r) => r.branchId === selectedBranchId);
		}
		return allRooms;
	}, [allRooms, publicBusinessId, selectedBranchId]);

	// Inject dynamic options into BoardingDocType
	const doctype = React.useMemo(() => {
		const doc = { ...BoardingDocType };
		doc.fields = doc.fields.map((f) => {
			if (f.fieldname === "branchId") {
				return {
					...f,
					options: branches.map((b) => ({ value: b.id, label: b.name })),
				};
			}
			if (f.fieldname === "roomId") {
				return {
					...f,
					options: rooms.map((r) => ({
						value: r.id,
						label: `${r.name} (Kapasitas: ${r.capacity} hewan) - Rp ${r.dailyRate.toLocaleString("id-ID")}/hari`,
					})),
				};
			}
			return f;
		});
		return doc;
	}, [branches, rooms]);

	const formRef = React.useRef<FormBuilderRef>(null);

	const customComponents = React.useMemo(
		() => ({
			customerSelector: (props: Record<string, unknown>) => (
				<CustomerSelectorField
					values={props.values as Record<string, unknown>}
					formApi={(props.formApi as FormBuilderRef) || formRef.current}
				/>
			),
		}),
		[],
	);

	const handleFieldValueChange = (
		fieldname: string,
		value: unknown,
		formApi: FormBuilderRef,
	) => {
		onDirtyChange?.(true);
		if (fieldname === "branchId") {
			const newBranchId = value as string;
			if (newBranchId !== selectedBranchId) {
				setSelectedBranchId(newBranchId);
				formApi.setFieldValue("roomId", null);
				formApi.setFieldValue("dailyRate", 0);
			}
		}
		if (fieldname === "roomId") {
			const room = rooms.find((r) => r.id === value);
			if (room) {
				formApi.setFieldValue("dailyRate", room.dailyRate);
			}
		}
	};

	React.useEffect(() => {
		if (branches.length === 1 && !selectedBranchId && formRef.current) {
			const singleBranchId = branches[0]?.id;
			if (singleBranchId) {
				formRef.current.setFieldValue("branchId", singleBranchId);
				setSelectedBranchId(singleBranchId);
			}
		}
	}, [branches, selectedBranchId]);

	React.useEffect(() => {
		if (rooms.length === 1 && selectedBranchId && formRef.current) {
			const currentValues = formRef.current.getValues();
			if (!currentValues.roomId) {
				const singleRoom = rooms[0];
				if (singleRoom) {
					formRef.current.setFieldValue("roomId", singleRoom.id);
					formRef.current.setFieldValue("dailyRate", singleRoom.dailyRate);
				}
			}
		}
	}, [rooms, selectedBranchId]);

	const handleBeforeStepChange = async (
		currentIndex: number,
		nextIndex: number,
		values: Record<string, unknown>,
	) => {
		// Only validate when moving forward
		if (nextIndex <= currentIndex) return true;

		if (currentIndex === 0) {
			if (!values.branchId)
				return t("toast.boarding.validation.select_branch_title");
			if (!values.roomId) return "Kamar Wajib Dipilih";
			if (
				!values.scheduleRange ||
				!(values.scheduleRange as { from?: Date }).from
			)
				return t("toast.boarding.validation.checkin_required_title");
		} else if (currentIndex === 1) {
			if (!values.ownerName)
				return t("toast.boarding.validation.owner_name_required_title");
			if (!values.ownerPhone)
				return t("toast.boarding.validation.phone_required_title");
			if (!values.ownerAddress)
				return t("toast.boarding.validation.address_required_title");
		} else if (currentIndex === 2) {
			const pets = (values.pets as Array<Record<string, unknown>>) || [];
			if (pets.length === 0)
				return t("toast.boarding.validation.min_pet_title");

			const room = rooms.find((r) => r.id === values.roomId);
			if (room && pets.length > room.capacity) {
				return `Kapasitas Kamar Tidak Cukup. Kamar maksimal ${room.capacity} hewan.`;
			}
		}

		return true;
	};

	const handleSubmit = async (
		values: Record<string, unknown>,
	): Promise<{ message?: string; error?: boolean }> => {
		try {
			// Format payload
			const payload: Record<string, unknown> = {
				businessId: publicBusinessId || null,
				customerId: values.customerId || null,
				ownerName: values.ownerName,
				ownerAddress: values.ownerAddress,
				ownerPhone: values.ownerPhone,
				emergencyContactName: values.emergencyContactName || "",
				emergencyContactPhone: values.emergencyContactPhone || "",
				branchId: values.branchId,
				roomId: values.roomId,
				dailyRate: values.dailyRate,
				checkInDate: (values.scheduleRange as { from?: Date })?.from,
				estimatedCheckOutDate:
					(values.scheduleRange as { to?: Date })?.to || null,
				notes: values.internal_notes || "",
				status: "active",
				agreement: values.agreement,
				ownerSignature: values.signature || null,
				pets: ((values.pets as Array<Record<string, unknown>>) || []).map(
					(p) => ({
						name: p.name,
						kind: p.kind,
						breed: p.breed || "",
						vaccinated: p.vaccinated,
						weight: p.weight || "",
						healthStatus: p.health_status,
						initialCondition: p.initial_condition || null,
						notes: p.notes || "",
					}),
				),
			};

			const submissionPayload: Record<string, unknown> = {
				...payload,
				idempotencyKey: crypto.randomUUID(),
			};

			const result = publicBusinessId
				? await submitPublicBoarding({ data: submissionPayload })
				: await createBoarding({ data: submissionPayload });

			setSubmittedData(result as unknown as TBoardingWithPetsDto);
			onSuccess?.(result as unknown as TBoardingWithPetsDto);
			onDirtyChange?.(false);
			return { message: "Pendaftaran berhasil" };
		} catch (err) {
			return {
				message: extractErrorMessage(err, "Gagal mengirim pendaftaran"),
				error: true,
			};
		}
	};

	if (submittedData && !hideHeader) {
		return (
			<BoardingSuccessView
				state={
					submittedData as unknown as import("../../hooks/useBoardingRegistration").TBoardingRegistrationState
				}
				branches={
					branches as unknown as readonly { id: string; name: string }[]
				}
				onReset={() => setSubmittedData(null)}
			/>
		);
	}

	return (
		<div className={cn(styles.container, hideHeader && "p-0 min-h-0")}>
			{!hideHeader && (
				<PageHeader
					title={t("boarding_form.breadcrumb.new_registration")}
					description={t(
						"boarding.new_registration_subtitle",
						"Lengkapi formulir di bawah untuk mendaftarkan penitipan hewan baru.",
					)}
					docHref="/docs/boarding"
					breadcrumbs={[
						{
							label: t("boarding_form.breadcrumb.business_name"),
							href: "/dashboard",
						},
						{ label: t("boarding_form.breadcrumb.new_registration") },
					]}
				/>
			)}

			<div className={cn(styles.content, hideHeader && "p-0 max-w-none")}>
				<div className={cn(styles.formWrapper, hideHeader && "max-w-none")}>
					<div
						className={cn(
							styles.card,
							hideHeader && "border-none shadow-none",
							"p-0 overflow-hidden",
						)}
					>
						<FormBuilder
							ref={formRef}
							doctype={doctype}
							mode="create"
							onSubmit={
								handleSubmit as (
									values: Record<string, unknown>,
								) => Promise<{ message?: string; error?: boolean }>
							}
							{...(onCancel ? { onCancel } : {})}
							customComponents={customComponents}
							onFieldValueChange={handleFieldValueChange}
							onBeforeStepChange={handleBeforeStepChange}
							initialValues={{
								pets: [
									{
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
							}}
						/>
					</div>
				</div>
			</div>
		</div>
	);
};
