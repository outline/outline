import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import {
	LetterLinear as EmailIcon,
	ShieldUserLinear as Shield,
	UserCircleLinear as UserIcon,
} from "solar-icon-set";
import type { SessionInfo } from "@/domain/identity/auth/auth.functions";
import { updateProfile } from "@/lib/api/user.functions";
import { FormBuilder } from "@/lib/form-builder";
import { ProfileSettingsDocType } from "@/lib/form-builder/examples/profile-settings.doctype";
import { extractErrorMessage } from "@/shared/utils/error";

export type TProfileSectionProps = {
	readonly session: SessionInfo | null;
};

export const ProfileSection = ({ session }: TProfileSectionProps) => {
	const { t } = useTranslation();
	const queryClient = useQueryClient();

	const profileMutation = useMutation({
		mutationFn: (data: { fullName: string }) => updateProfile({ data }),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["session"] });
			queryClient.invalidateQueries({ queryKey: ["session-info"] });
		},
	});

	return (
		<section className="space-y-4">
			<div className="flex items-center gap-2 text-[14px] font-medium text-neutral-900 px-1">
				<UserIcon className="w-4 h-4 text-neutral-400" />
				{t("settings.personal_info")}
			</div>
			<div className="bg-white border border-neutral-200/80 rounded-lg  overflow-hidden">
				<div className="p-5">
					<div className="mb-4">
						<div className="block text-[12px] font-medium text-neutral-500 uppercase tracking-wide mb-1.5">
							{t("settings.email")}
						</div>
						<div className="h-9 px-3 flex items-center bg-neutral-50 border border-neutral-200 rounded-[6px] text-[13px] text-neutral-500 gap-2 cursor-not-allowed">
							<EmailIcon className="w-3.5 h-3.5 text-neutral-400" />
							{session?.email || "—"}
						</div>
					</div>
					<div className="mb-4">
						<div className="block text-[12px] font-medium text-neutral-500 uppercase tracking-wide mb-1.5">
							{t("settings.role")}
						</div>
						<div className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-amber-50 text-amber-700 border border-amber-100 rounded-full text-[11px] font-bold uppercase tracking-wider">
							<Shield className="w-3 h-3" />
							{session?.isAdmin
								? t("settings.role_admin")
								: t("settings.role_staff")}
						</div>
					</div>
					<FormBuilder
						doctype={ProfileSettingsDocType}
						mode="edit"
						initialValues={{ full_name: session?.fullName || "" }}
						onSubmit={async (values) => {
							try {
								await profileMutation.mutateAsync({
									fullName: values.full_name as string,
								});
								return { message: t("common.success") };
							} catch (err) {
								return {
									message: extractErrorMessage(err, t("common.error")),
									error: true,
								};
							}
						}}
					/>
				</div>
			</div>
		</section>
	);
};
