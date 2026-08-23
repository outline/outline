import { useCallback, useState } from "react";
import { createBranch, updateBranch } from "@/lib/api/branches.functions";
import { extractErrorMessage } from "@/shared/utils/error";
import type {
	CreateBranchCommand,
	UpdateBranchCommand,
} from "../../branch.schemas";
import type { TBranch } from "../../branch.types";

export type TUseBranchFormProps = {
	readonly branch?: TBranch;
	readonly onSuccess?: (branch: TBranch) => void;
	readonly onCancel?: () => void;
};

export type TUseBranchFormResult = {
	readonly formData: {
		readonly name: string;
		readonly address: string;
		readonly phone: string;
	};
	readonly isLoading: boolean;
	readonly errors: Record<string, string>;
	readonly setField: (field: string, value: string) => void;
	readonly submit: (e: React.FormEvent) => void;
};

export const useBranchForm = ({
	branch,
	onSuccess,
}: TUseBranchFormProps): TUseBranchFormResult => {
	const [formData, setFormData] = useState({
		name: branch?.name ?? "",
		address: branch?.address ?? "",
		phone: branch?.phone ?? "",
	});
	const [isLoading, setIsLoading] = useState(false);
	const [errors, setErrors] = useState<Record<string, string>>({});

	const setField = useCallback((field: string, value: string) => {
		setFormData((prev) => ({ ...prev, [field]: value }));
		setErrors((prev) => {
			const next = { ...prev };
			delete next[field];
			return next;
		});
	}, []);

	const validate = useCallback((): boolean => {
		const newErrors: Record<string, string> = {};
		if (!formData.name.trim()) newErrors.name = "Nama cabang wajib diisi";
		if (formData.name.length > 100) newErrors.name = "Maksimal 100 karakter";
		if (formData.address.length > 500)
			newErrors.address = "Maksimal 500 karakter";
		if (formData.phone.length > 20) newErrors.phone = "Maksimal 20 karakter";

		setErrors(newErrors);
		return Object.keys(newErrors).length === 0;
	}, [formData]);

	const submit = useCallback(
		async (e: React.FormEvent) => {
			e.preventDefault();
			if (!validate()) return;

			setIsLoading(true);
			try {
				let result: TBranch;
				if (branch) {
					const command: UpdateBranchCommand = {
						id: branch.id,
						...formData,
						address: formData.address || null,
						phone: formData.phone || null,
						email: branch.email,
						whatsappNumber: branch.whatsappNumber,
						streetAddress: branch.streetAddress,
						addressLocality: branch.addressLocality,
						addressRegion: branch.addressRegion,
						postalCode: branch.postalCode,
						addressCountry: branch.addressCountry,
						latitude: branch.latitude,
						longitude: branch.longitude,
						operatingHours: branch.operatingHours,
					};
					await updateBranch({ data: command });
					result = { ...branch, ...formData } as TBranch;
				} else {
					const command: CreateBranchCommand = {
						...formData,
						address: formData.address || null,
						phone: formData.phone || null,
						email: null,
						whatsappNumber: null,
						streetAddress: null,
						addressLocality: null,
						addressRegion: null,
						postalCode: null,
						addressCountry: null,
						latitude: null,
						longitude: null,
						operatingHours: null,
					};
					result = (await createBranch({
						data: command,
					})) as unknown as TBranch;
				}

				onSuccess?.(result);
			} catch (err) {
				const message = extractErrorMessage(
					err,
					"Terjadi kesalahan saat menyimpan cabang.",
				);
				setErrors({ form: message });
			} finally {
				setIsLoading(false);
			}
		},
		[formData, branch, onSuccess, validate],
	);

	return {
		formData,
		isLoading,
		errors,
		setField,
		submit,
	};
};
