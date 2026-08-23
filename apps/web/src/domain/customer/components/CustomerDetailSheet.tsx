import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import {
	AddCircleLinear as PlusIcon,
	MapPointLinear as MapPin,
	NotesLinear as NotesIcon,
	PawLinear as PawIcon,
	PhoneLinear as Phone,
	CloseCircleLinear as XIcon,
} from "solar-icon-set";
import { toast } from "@/components/ui";
import {
	Accordion,
	AccordionContent,
	AccordionItem,
	AccordionTrigger,
} from "@/components/ui/accordion";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { StatusBadge } from "@/ui";
import { PET_SPECIES, type TPetSpecies } from "@/domain/pet";
import { addPet, getPetsByCustomer } from "@/lib/api/pets.functions";
import type { ICustomer } from "../customer.types";
import { queryKeys } from "@/shared/cache/query-keys";
import { i18n } from "@/shared/i18n/i18n.config";
import { useUploadController } from "@/shared/upload/use-upload-controller";
import { extractErrorMessage } from "@/shared/utils/error";
import { uploadFile } from "@/shared/utils/upload";
import { SafeHtml } from "@/shared/components/SafeHtml";

export type TCustomerDetailSheetProps = {
	readonly customer: ICustomer | null;
	readonly onClose: () => void;
	readonly onEdit: (customer: ICustomer) => void;
};

export const CustomerDetailSheet = ({
	customer,
	onClose,
	onEdit,
}: TCustomerDetailSheetProps) => {
	const { t } = useTranslation();
	const queryClient = useQueryClient();
	const [isAddPetOpen, setIsAddPetOpen] = useState(false);
	const [newPet, setNewPet] = useState<{
		name: string;
		species: TPetSpecies;
		file: File | null;
	}>({ name: "", species: "dog", file: null });

	const petsQuery = useQuery({
		queryKey: queryKeys.pets.byCustomer(customer?.id ?? ""),
		queryFn: () => getPetsByCustomer({ data: customer?.id ?? "" }),
		enabled: !!customer,
	});

	const petPhotoUpload = useUploadController(async (file) => ({
		url: await uploadFile("pet-photos", file, crypto.randomUUID()),
	}));

	const addPetMutation = useMutation({
		mutationFn: (input: {
			name: string;
			species: TPetSpecies;
			photoUrl: string | null;
		}) =>
			addPet({
				data: {
					customerId: customer?.id ?? null,
					name: input.name,
					species: input.species,
					breed: null,
					gender: null,
					birthDate: null,
					weightKg: null,
					color: null,
					isVaccinated: false,
					vaccineNotes: null,
					allergies: null,
					medicalNotes: null,
					specialInstructions: null,
					photoUrl: input.photoUrl,
				},
			}),
		onSuccess: () => {
			toast.success(i18n.t("common.success_title"), {
				description: t(
					"customers.pet_add_success",
					"Hewan berhasil ditambahkan",
				),
			});
			queryClient.invalidateQueries({
				queryKey: queryKeys.pets.byCustomer(customer?.id ?? ""),
			});
			setIsAddPetOpen(false);
			setNewPet({ name: "", species: "dog", file: null });
			petPhotoUpload.reset();
		},
		onError: (error) => {
			toast.error(i18n.t("common.error_title"), {
				description: extractErrorMessage(
					error,
					t("customers.pet_add_error", "Gagal menambahkan hewan"),
				),
			});
		},
	});

	const handleAddPet = async () => {
		if (!newPet.name.trim()) return;

		let photoUrl: string | null = null;
		if (newPet.file) {
			const result = await petPhotoUpload.upload(newPet.file);
			if (result.status !== "success") return;
			photoUrl = result.url;
		}

		addPetMutation.mutate({
			name: newPet.name.trim(),
			species: newPet.species,
			photoUrl,
		});
	};

	if (!customer) return null;

	return (
		<div className="flex flex-col h-full bg-white relative">
			{/* Custom Header */}
			<div className="px-6 py-5 flex items-start justify-between border-b border-neutral-100">
				<div className="flex items-center gap-4">
					<Avatar className="w-12 h-12">
						<AvatarFallback seed={customer.fullName || "User"}>
							{customer.fullName?.charAt(0) || "?"}
						</AvatarFallback>
					</Avatar>
					<div>
						<h2 className="text-[17px] font-bold text-neutral-900 leading-tight">
							{customer.fullName}
						</h2>
						{customer.email && (
							<p className="text-[13px] text-neutral-500 mt-0.5">
								{customer.email}
							</p>
						)}
					</div>
				</div>
				<div className="flex items-center gap-3">
					<StatusBadge
						type={customer.isActive ? "success" : "neutral"}
						label={
							customer.isActive
								? t("common.active", "Active")
								: t("common.inactive", "Inactive")
						}
					/>
					<button
						type="button"
						onClick={onClose}
						className="text-neutral-400 hover:text-neutral-600 transition-colors cursor-pointer"
					>
						<XIcon className="w-5 h-5" />
					</button>
				</div>
			</div>

			{/* Content Body */}
			<div className="flex-1 overflow-y-auto px-6 py-6 space-y-8">
				{/* Info Grid */}
				<div className="space-y-4">
					<div className="flex items-center gap-4">
						<div className="w-8 h-8 rounded-full bg-neutral-50 flex items-center justify-center shrink-0">
							<Phone className="w-4 h-4 text-neutral-400" />
						</div>
						<div className="flex-1 flex items-center justify-between">
							<span className="text-[13px] text-neutral-500 font-medium">
								{t("customers.table.phone", "Phone")}
							</span>
							<span className="text-[14px] font-medium text-neutral-900">
								{customer.phone || "-"}
							</span>
						</div>
					</div>

					<div className="flex items-start gap-4">
						<div className="w-8 h-8 rounded-full bg-neutral-50 flex items-center justify-center shrink-0">
							<MapPin className="w-4 h-4 text-neutral-400" />
						</div>
						<div className="flex-1 flex items-start justify-between">
							<span className="text-[13px] text-neutral-500 font-medium mt-1.5">
								{t("customers.table.address", "Address")}
							</span>
							<SafeHtml
								html={customer.address}
								className="text-[14px] font-medium text-neutral-900 text-right max-w-[200px] [&>p]:m-0 [&>p]:leading-normal line-clamp-3 mt-1.5"
							/>
						</div>
					</div>
				</div>

				{/* Accordions */}
				<Accordion
					type="multiple"
					defaultValue={["pets", "notes"]}
					className="w-full"
				>
					<AccordionItem value="pets" className="border-none mb-4">
						<AccordionTrigger className="hover:no-underline py-3 px-4 bg-neutral-50 rounded-xl data-[state=open]:rounded-b-none transition-all">
							<div className="flex items-center gap-2 text-neutral-700 font-bold">
								<PawIcon className="w-4 h-4" />
								{t("customers.pets_title", "Hewan Peliharaan")}
							</div>
						</AccordionTrigger>
						<AccordionContent className="bg-neutral-50/50 px-4 py-4 rounded-b-xl border border-t-0 border-neutral-100 space-y-3">
							{petsQuery.isLoading ? (
								<p className="text-[13px] text-neutral-500">
									{t("common.loading", "Memuat...")}
								</p>
							) : petsQuery.data && petsQuery.data.length > 0 ? (
								<div className="space-y-2">
									{petsQuery.data.map((pet) => (
										<div
											key={pet.id}
											className="flex items-center gap-3 p-2 bg-white rounded-lg border border-neutral-100"
										>
											<div className="w-10 h-10 rounded-lg overflow-hidden bg-neutral-100 shrink-0 flex items-center justify-center">
												{pet.photoUrl ? (
													<img
														src={pet.photoUrl}
														alt={pet.name}
														className="w-full h-full object-cover"
													/>
												) : (
													<PawIcon className="w-4 h-4 text-neutral-300" />
												)}
											</div>
											<div className="flex-1 min-w-0">
												<div className="text-[13px] font-semibold text-neutral-900 truncate">
													{pet.name}
												</div>
												<div className="text-[11px] text-neutral-500 capitalize">
													{pet.species}
												</div>
											</div>
										</div>
									))}
								</div>
							) : (
								<p className="text-[13px] text-neutral-500">
									{t("customers.no_pets", "Belum ada hewan peliharaan")}
								</p>
							)}
							<Button
								type="button"
								variant="outline"
								size="sm"
								className="w-full"
								onClick={() => setIsAddPetOpen(true)}
							>
								<PlusIcon className="w-4 h-4 mr-2" />
								{t("customers.add_pet", "Tambah Hewan")}
							</Button>
						</AccordionContent>
					</AccordionItem>
					{customer.notes && (
						<AccordionItem value="notes" className="border-none mb-4">
							<AccordionTrigger className="hover:no-underline py-3 px-4 bg-neutral-50 rounded-xl data-[state=open]:rounded-b-none transition-all">
								<div className="flex items-center gap-2 text-neutral-700 font-bold">
									<NotesIcon className="w-4 h-4" />
									{t("common.notes", "Notes")}
								</div>
							</AccordionTrigger>
							<AccordionContent className="bg-neutral-50/50 px-4 py-4 rounded-b-xl border border-t-0 border-neutral-100">
								<p className="text-[13px] text-neutral-600 leading-relaxed m-0">
									{customer.notes}
								</p>
							</AccordionContent>
						</AccordionItem>
					)}
				</Accordion>
			</div>

			{/* Footer Actions */}
			<div className="px-6 py-4 border-t border-neutral-100 flex items-center justify-between bg-white shrink-0">
				<Button
					variant="outline"
					onClick={onClose}
					className="rounded-xl px-6 h-10 border-neutral-200"
				>
					{t("common.cancel", "Cancel")}
				</Button>
				<Button
					onClick={() => {
						onClose();
						onEdit(customer);
					}}
					className="rounded-xl px-8 h-10 bg-primary"
				>
					{t("common.edit", "Edit")}
				</Button>
			</div>

			<Dialog open={isAddPetOpen} onOpenChange={setIsAddPetOpen}>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>
							{t("customers.add_pet_title", "Tambah Hewan Peliharaan")}
						</DialogTitle>
					</DialogHeader>
					<div className="space-y-4 py-2">
						<div className="space-y-2">
							<Label htmlFor="pet-name">
								{t("customers.pet_name", "Nama Hewan")}
							</Label>
							<Input
								id="pet-name"
								value={newPet.name}
								onChange={(e) =>
									setNewPet((prev) => ({ ...prev, name: e.target.value }))
								}
							/>
						</div>
						<div className="space-y-2">
							<Label htmlFor="pet-species">
								{t("customers.pet_species", "Jenis")}
							</Label>
							<Select
								value={newPet.species}
								onValueChange={(value) =>
									setNewPet((prev) => ({
										...prev,
										species: value as TPetSpecies,
									}))
								}
							>
								<SelectTrigger id="pet-species">
									<SelectValue />
								</SelectTrigger>
								<SelectContent>
									{PET_SPECIES.map((species) => (
										<SelectItem key={species} value={species}>
											{species}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
						</div>
						<div className="space-y-2">
							<Label htmlFor="pet-photo">
								{t("customers.pet_photo", "Foto (opsional)")}
							</Label>
							<Input
								id="pet-photo"
								type="file"
								accept="image/*"
								onChange={(e) =>
									setNewPet((prev) => ({
										...prev,
										file: e.target.files ? (e.target.files[0] ?? null) : null,
									}))
								}
							/>
						</div>
					</div>
					<DialogFooter>
						<Button variant="outline" onClick={() => setIsAddPetOpen(false)}>
							{t("common.cancel", "Batal")}
						</Button>
						<Button
							onClick={handleAddPet}
							disabled={
								!newPet.name.trim() ||
								petPhotoUpload.state.status === "uploading" ||
								petPhotoUpload.state.status === "validating" ||
								petPhotoUpload.state.status === "confirming" ||
								addPetMutation.isPending
							}
						>
							{addPetMutation.isPending ||
							petPhotoUpload.state.status === "uploading"
								? t("common.saving", "Menyimpan...")
								: t("common.save", "Simpan")}
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>
		</div>
	);
};
