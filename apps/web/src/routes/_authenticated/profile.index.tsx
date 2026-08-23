import { createFileRoute } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { CameraBold as CameraIcon } from "solar-icon-set";
import { toast } from "@/components/ui";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { updateEmail, updateProfile } from "@/lib/api/user.functions";
import { ProfileSettingsDocType } from "@/lib/form-builder/examples/profile-settings.doctype";
import FormBuilder from "@/lib/form-builder/form-builder";
import { useSession } from "@/shared/hooks";
import { i18n } from "@/shared/i18n/i18n.config";

export const Route = createFileRoute("/_authenticated/profile/")({
	component: ProfileGeneralPage,
});

function ProfileGeneralPage() {
	const { t } = useTranslation();
	const { session } = useSession();

	const handleSubmit = async (data: Record<string, unknown>) => {
		try {
			await updateProfile({
				data: {
					fullName: data.full_name as string,
					...(data.phone_number
						? { phoneNumber: data.phone_number as string }
						: {}),
				},
			});
		} catch (_err) {
			toast.error(i18n.t("common.error_title"), {
				description: t("profile_page.toast_update_error"),
			});
			return { error: true, message: t("profile_page.toast_update_error") };
		}

		if (data.email) {
			try {
				await updateEmail({ data: { email: String(data.email) } });
			} catch (_err) {
				toast.error(i18n.t("common.error_title"), {
					description: t("profile_page.toast_email_error"),
				});
				return { error: true, message: t("profile_page.toast_email_error") };
			}
		}

		toast.success(i18n.t("common.success_title"), {
			description: t("profile_page.toast_update_success"),
		});
		return { message: "Success" };
	};

	return (
		<div className="max-w-2xl mx-auto space-y-8 animate-in fade-in duration-300">
			<div>
				<h3 className="text-[14px] font-bold text-neutral-900 mb-1">
					{t("profile_page.photo_title")}
				</h3>
				<p className="text-[12px] text-neutral-500 mb-4">
					{t("profile_page.photo_desc")}
				</p>

				<div className="flex items-center gap-6">
					<div className="relative group cursor-pointer">
						<Avatar className="w-20 h-20 border border-neutral-200">
							<AvatarImage src={undefined} alt={session?.email || "User"} />
							<AvatarFallback className="text-xl bg-neutral-100 text-neutral-500">
								{session?.email?.charAt(0).toUpperCase() || "U"}
							</AvatarFallback>
						</Avatar>
						<div className="absolute inset-0 bg-black/40 rounded-full opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
							<CameraIcon className="w-6 h-6 text-white" />
						</div>
					</div>
					<div className="flex flex-col gap-2">
						<div className="flex gap-2">
							<Button size="sm" className="h-8 text-[12px] px-3 font-semibold">
								{t("profile_page.change_photo")}
							</Button>
							<Button
								size="sm"
								variant="secondary"
								className="h-8 text-[12px] px-3 font-semibold"
							>
								{t("profile_page.remove_photo")}
							</Button>
						</div>
						<p className="text-[11px] text-neutral-400">
							{t("profile_page.photo_hint")}
						</p>
					</div>
				</div>
			</div>

			<div className="pt-6 border-t border-neutral-100">
				<h3 className="text-[14px] font-bold text-neutral-900 mb-1">
					{t("profile_page.personal_info_title")}
				</h3>
				<p className="text-[12px] text-neutral-500 mb-6">
					{t("profile_page.personal_info_desc")}
				</p>
				<FormBuilder
					doctype={ProfileSettingsDocType}
					mode="create"
					initialValues={{
						full_name: session?.fullName ?? "",
						phone_number: "",
						email: session?.email ?? "",
					}}
					onSubmit={handleSubmit}
				/>
			</div>
		</div>
	);
}
