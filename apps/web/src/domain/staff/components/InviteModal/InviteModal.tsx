import { useQuery } from "@tanstack/react-query";
import { useCallback } from "react";
import { useTranslation } from "react-i18next";
import { getBranches } from "@/lib/api/branches.functions";
import { inviteStaff } from "@/lib/api/staff.functions";
import type { TDocType } from "@/lib/form-builder";
import { FormBuilder } from "@/lib/form-builder";
import { extractErrorMessage } from "@/shared/utils/error";
import { Modal } from "@/ui";
import type { InviteStaffCommand } from "../../staff.schemas";

export type TInviteModalProps = {
	readonly onCancel: () => void;
	readonly onSuccess?: () => void;
	readonly onDirtyChange?: (isDirty: boolean) => void;
	readonly hideModal?: boolean;
};

export const InviteModal = ({
	onCancel,
	onSuccess,
	onDirtyChange,
	hideModal = false,
}: TInviteModalProps) => {
	const { t } = useTranslation();

	// ... (inviteDocType logic remains same)
	const { data: branches = [] } = useQuery({
		queryKey: ["branches"],
		queryFn: () => getBranches(),
	});

	// Build dynamic DocType with branch options
	const inviteDocType: TDocType = {
		name: "InviteStaff",
		module: "Staff",
		description: "Undang anggota tim baru",
		icon: "👤",
		fields: [
			{
				fieldname: "section_info",
				fieldtype: "section_break",
				label: "Informasi Anggota",
			},
			{
				fieldname: "email",
				fieldtype: "text",
				label: "Alamat Email",
				placeholder: "email@contoh.com",
				required: true,
				max_length: 255,
				tooltip: "Email akan dikirim undangan untuk bergabung",
			},
			{
				fieldname: "branch_id",
				fieldtype: "select",
				label: "Tugaskan ke Cabang",
				required: true,
				placeholder: "Pilih cabang...",
				tooltip: "Cabang tempat anggota ini akan bertugas",
				options: branches.map((b) => ({
					value: b.id,
					label: b.name,
				})),
			},
			{
				fieldname: "role",
				fieldtype: "select",
				label: "Peran Akses (RBAC)",
				required: true,
				default_value: "staff_daycare",
				tooltip: "Menentukan level akses anggota di sistem",
				options: [
					{
						value: "owner",
						label: "Owner",
						description: "Akses penuh ke semua fitur",
					},
					{
						value: "manager",
						label: "Manager",
						description: "Kelola operasional dan laporan",
					},
					{
						value: "kasir",
						label: "Kasir",
						description: "Akses POS dan transaksi",
					},
					{
						value: "staff_daycare",
						label: "Staff Daycare",
						description: "Kelola boarding dan hewan",
					},
				],
			},
		],
	};

	const handleSubmit = useCallback(
		async (values: Record<string, unknown>) => {
			try {
				const command: InviteStaffCommand = {
					email: values.email as string,
					branchId: values.branch_id as string,
					role: values.role as InviteStaffCommand["role"],
				};
				await inviteStaff({ data: command });
				onSuccess?.();
				return { message: "Undangan berhasil dikirim" };
			} catch (err) {
				const message = extractErrorMessage(err, "Gagal menambah anggota");
				return { message, error: true };
			}
		},
		[onSuccess],
	);

	const form = (
		<FormBuilder
			doctype={inviteDocType}
			mode="create"
			onSubmit={handleSubmit}
			onCancel={onCancel}
			onDirtyChange={onDirtyChange || (() => {})}
		/>
	);

	if (hideModal) return form;

	return (
		<Modal
			isOpen={true}
			onClose={onCancel}
			title={t("staff.add_member_team")}
			subtitle="Pastikan pengguna sudah mendaftar akun di sistem."
		>
			{form}
		</Modal>
	);
};
