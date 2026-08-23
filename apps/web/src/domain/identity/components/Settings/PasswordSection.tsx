import { KeyLinear as KeyIcon } from "solar-icon-set";
import { toast } from "@/components/ui";
import { changePassword } from "@/lib/api/user.functions";
import { FormBuilder } from "@/lib/form-builder";
import { PasswordSettingsDocType } from "@/lib/form-builder/examples/profile-settings.doctype";
import { i18n } from "@/shared/i18n/i18n.config";
import { extractErrorMessage } from "@/shared/utils/error";

export const PasswordSection = () => {
	return (
		<section className="space-y-4 pt-4 border-t border-neutral-100">
			<div className="flex items-center gap-2 text-[14px] font-medium text-neutral-900 px-1">
				<KeyIcon className="w-4 h-4 text-neutral-400" />
				{i18n.t("settings.security", "Keamanan & Kata Sandi")}
			</div>
			<div className="bg-white border border-neutral-200/80 rounded-lg overflow-hidden">
				<div className="p-5">
					<p className="text-[12px] text-neutral-500 mb-4">
						{i18n.t(
							"settings.password_hint",
							"Perbarui kata sandi Anda untuk menjaga keamanan akun. Pastikan kata sandi baru cukup kuat.",
						)}
					</p>
					<FormBuilder
						doctype={PasswordSettingsDocType}
						mode="create"
						initialValues={{}}
						onSubmit={async (values) => {
							try {
								const currentPassword = String(values.currentPassword ?? "");
								const password = String(values.password);
								if (!currentPassword || !password) {
									return {
										message: extractErrorMessage(null, i18n.t("common.error")),
										error: true,
									};
								}

								await changePassword({
									data: { currentPassword, password },
								});

								toast.success(i18n.t("common.success_title"), {
									description: i18n.t("toast.password_updated"),
								});
								return { message: "Success", reset: true };
							} catch (err) {
								return {
									message: extractErrorMessage(err, i18n.t("common.error")),
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
