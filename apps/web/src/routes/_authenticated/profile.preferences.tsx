import { createFileRoute } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { useLanguage } from "@/shared/i18n";

export const Route = createFileRoute("/_authenticated/profile/preferences")({
	component: ProfilePreferencesPage,
});

function ProfilePreferencesPage() {
	const { t } = useTranslation();
	const { language, changeLanguage } = useLanguage();

	return (
		<div className="max-w-2xl mx-auto space-y-8 animate-in fade-in duration-300">
			<div>
				<h3 className="text-[14px] font-bold text-neutral-900 mb-1">
					{t("profile_page.language_preferences")}
				</h3>
				<p className="text-[12px] text-neutral-500 mb-6">
					{t("profile_page.language_desc")}
				</p>

				<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
					{[
						{
							code: "id",
							label: t("profile_page.lang_id_label"),
							desc: t("profile_page.lang_id_desc"),
						},
						{
							code: "en",
							label: t("profile_page.lang_en_label"),
							desc: t("profile_page.lang_en_desc"),
						},
						{
							code: "jv",
							label: t("profile_page.lang_jv_label"),
							desc: t("profile_page.lang_jv_desc"),
						},
						{
							code: "bjn",
							label: t("profile_page.lang_bjn_label"),
							desc: t("profile_page.lang_bjn_desc"),
						},
					].map((lang) => (
						<div
							key={lang.code}
							onClick={() =>
								changeLanguage(
									lang.code as import("@/shared/types/i18n.types").TLanguage,
								)
							}
							className={`p-4 rounded-lg border cursor-pointer transition-all ${
								language === lang.code
									? "border-neutral-900 bg-neutral-50 ring-1 ring-neutral-900"
									: "border-neutral-200 hover:border-neutral-300 bg-white"
							}`}
						>
							<div className="flex items-center justify-between mb-1">
								<span className="text-[13px] font-bold text-neutral-900">
									{lang.label}
								</span>
								{language === lang.code && (
									<div className="w-2 h-2 rounded-full bg-neutral-900" />
								)}
							</div>
							<p className="text-[11px] text-neutral-500">{lang.desc}</p>
						</div>
					))}
				</div>
			</div>

			<div className="pt-8 border-t border-neutral-100">
				<h3 className="text-[14px] font-bold text-neutral-900 mb-1">
					{t("profile_page.theme_title")}
				</h3>
				<p className="text-[12px] text-neutral-500 mb-6">
					{t("profile_page.theme_desc")}
				</p>

				<div className="grid grid-cols-3 gap-4">
					<div className="cursor-pointer">
						<div className="h-24 rounded-lg border-2 border-neutral-900 bg-white mb-2 relative overflow-hidden flex items-center justify-center">
							<div className="w-1/2 h-full bg-neutral-50 border-r border-neutral-200" />
						</div>
						<p className="text-[12px] font-bold text-neutral-900 text-center">
							{t("profile_page.theme_light")}
						</p>
					</div>
					<div className="cursor-pointer opacity-50">
						<div className="h-24 rounded-lg border-2 border-neutral-200 bg-neutral-900 mb-2 relative overflow-hidden flex items-center justify-center">
							<div className="w-1/2 h-full bg-neutral-800 border-r border-neutral-700" />
						</div>
						<p className="text-[12px] font-bold text-neutral-500 text-center">
							{t("profile_page.theme_dark")}
						</p>
					</div>
					<div className="cursor-pointer opacity-50">
						<div className="h-24 rounded-lg border-2 border-neutral-200 bg-gradient-to-r from-white to-neutral-900 mb-2" />
						<p className="text-[12px] font-bold text-neutral-500 text-center">
							{t("profile_page.theme_system")}
						</p>
					</div>
				</div>
			</div>
		</div>
	);
}
