import { useQuery } from "@tanstack/react-query";
import { useCallback, useState } from "react";
import { getBranches } from "@/lib/api/branches.functions";
import { inviteStaff } from "@/lib/api/staff.functions";
import type { TUserRole } from "@/shared/types/common.types";
import { extractErrorMessage } from "@/shared/utils/error";
import type { InviteStaffCommand } from "../../staff.schemas";

export type TUseInviteFormProps = {
	readonly onSuccess?: () => void;
	readonly onCancel: () => void;
};

export const useInviteForm = ({ onSuccess }: TUseInviteFormProps) => {
	const [formData, setFormData] = useState({
		email: "",
		branchId: "",
		role: "staff_daycare" as TUserRole,
	});
	const [isLoading, setIsLoading] = useState(false);
	const [errors, setErrors] = useState<Record<string, string>>({});

	const { data: branches = [] } = useQuery({
		queryKey: ["branches"],
		queryFn: () => getBranches(),
	});

	const setField = useCallback((field: string, value: string | TUserRole) => {
		setFormData((prev) => ({ ...prev, [field]: value }));
	}, []);

	const submit = useCallback(
		async (e: React.FormEvent) => {
			e.preventDefault();
			setIsLoading(true);
			setErrors({});

			try {
				const command: InviteStaffCommand = {
					...formData,
				};
				await inviteStaff({ data: command });
				onSuccess?.();
			} catch (err) {
				const message = extractErrorMessage(err, "Gagal menambah anggota");
				setErrors({ form: message });
			} finally {
				setIsLoading(false);
			}
		},
		[formData, onSuccess],
	);

	return {
		formData,
		branches,
		isLoading,
		errors,
		setField,
		submit,
	};
};
