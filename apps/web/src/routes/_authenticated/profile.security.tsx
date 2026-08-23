import { createFileRoute } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { toast } from "@/components/ui";
import { changePassword, setPin } from "@/lib/api/user.functions";
import {
	PasswordSettingsDocType,
	PinSettingsDocType,
} from "@/lib/form-builder/examples/profile-settings.doctype";
import FormBuilder from "@/lib/form-builder/form-builder";
import { i18n } from "@/shared/i18n/i18n.config";

export const Route = createFileRoute("/_authenticated/profile/security")({
	component: ProfileSecurityPage,
});

function ProfileSecurityPage() {
	const { t } = useTranslation();

	const handlePasswordSubmit = async (data: Record<string, unknown>) => {
		if (data.password && data.currentPassword) {
			try {
				await changePassword({
					data: {
						currentPassword: String(data.currentPassword),
						password: String(data.password),
					},
				});
				toast.success(i18n.t("common.success_title"), {
					description: i18n.t("toast.password_updated"),
				});
				return { message: "Success" };
			} catch (_err) {
				toast.error(i18n.t("toast.password_update_failed"), {
					description: i18n.t("toast.wrong_current_password"),
				});
				return { error: true, message: "Gagal mengubah password." };
			}
		}
		return { message: "No password provided" };
	};

	const handlePinSubmit = async (data: Record<string, unknown>) => {
		if (data.pin && data.currentPassword) {
			try {
				await setPin({
					data: {
						currentPassword: String(data.currentPassword),
						pin: String(data.pin),
					},
				});
				toast.success(i18n.t("common.success_title"), {
					description: i18n.t("toast.pin_updated"),
				});
				return { message: "Success" };
			} catch (_err) {
				toast.error(i18n.t("toast.pin_update_failed"), {
					description: i18n.t("toast.wrong_current_password"),
				});
				return { error: true, message: "Gagal mengubah PIN." };
			}
		}
		return { message: "No PIN provided" };
	};

	return (
		<div className="max-w-2xl mx-auto space-y-8 animate-in fade-in duration-300">
			<div>
				<h3 className="text-[14px] font-bold text-neutral-900 mb-1">
					{t("profile_page.password_title")}
				</h3>
				<p className="text-[12px] text-neutral-500 mb-6">
					{t("profile_page.password_desc")}
				</p>
				<FormBuilder
					doctype={PasswordSettingsDocType}
					mode="create"
					initialValues={{}}
					onSubmit={handlePasswordSubmit}
				/>
			</div>

			<div className="pt-8 border-t border-neutral-100">
				<h3 className="text-[14px] font-bold text-neutral-900 mb-1">
					{t("profile_page.pin_title")}
				</h3>
				<p className="text-[12px] text-neutral-500 mb-6">
					{t("profile_page.pin_desc")}
				</p>
				<FormBuilder
					doctype={PinSettingsDocType}
					mode="create"
					initialValues={{}}
					onSubmit={handlePinSubmit}
				/>
			</div>

			<div className="pt-8 border-t border-neutral-100">
				<h3 className="text-[14px] font-bold text-neutral-900 mb-1">
					{t("profile_page.active_sessions")}
				</h3>
				<p className="text-[12px] text-neutral-500 mb-6">
					{t("profile_page.active_sessions_desc")}
				</p>

				<div className="bg-neutral-50 border border-neutral-200 rounded-md p-4 flex items-center justify-between">
					<div className="flex items-center gap-3">
						<div className="w-10 h-10 bg-white border border-neutral-200 rounded flex items-center justify-center">
							<span className="text-[10px] font-bold text-neutral-400">
								MAC
							</span>
						</div>
						<div>
							<p className="text-[13px] font-bold text-neutral-900">
								MacBook Pro - {t("profile_page.current_device")}
							</p>
							<p className="text-[11px] text-neutral-500">
								Batam, Indonesia • Safari
							</p>
						</div>
					</div>
					<div className="text-[11px] font-bold text-emerald-600 bg-emerald-50 px-2 py-1 rounded">
						{t("profile_page.active_status")}
					</div>
				</div>
			</div>
		</div>
	);
}
