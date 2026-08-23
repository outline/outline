import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { requestPasswordReset } from "@/lib/api/password-reset.functions";
import { APP_CONFIG } from "@/lib/constants";
import { FormBuilder } from "@/lib/form-builder";
import { ForgotPasswordDocType } from "@/lib/form-builder/examples/forgot-password.doctype";
import { i18n } from "@/shared/i18n/i18n.config";
import { extractErrorMessage } from "@/shared/utils/error";

export const Route = createFileRoute("/forgot-password")({
	head: () => ({
		meta: [
			{ title: `${i18n.t("forgot_password_page.title")} — ${APP_CONFIG.name}` },
			{
				name: "description",
				content: i18n.t("forgot_password_page.meta_description"),
			},
		],
	}),
	component: ForgotPasswordPage,
});

function ForgotPasswordPage() {
	const { t } = useTranslation();
	const [success, setSuccess] = useState(false);

	const handleSubmit = async (values: Record<string, unknown>) => {
		const emailValue = values.email as string;

		try {
			await requestPasswordReset({ data: { email: emailValue } });
		} catch (error) {
			return {
				message: extractErrorMessage(error, t("common.error")),
				error: true,
			};
		}

		setSuccess(true);
		return { message: t("forgot_password_page.success_toast") };
	};

	return (
		<div className="min-h-screen bg-paper-white flex font-inter">
			<div className="flex-1 flex flex-col w-full md:max-w-md lg:max-w-lg xl:max-w-xl mx-auto relative z-10 bg-paper-white ">
				<header className="flex h-16 items-center px-8 border-b border-mist-gray/50">
					<Link
						to="/"
						className="flex items-center gap-2 text-ink-black hover:opacity-80 transition-opacity"
					>
						<div className="w-4 h-4 bg-mint-green rounded-[3px]" />
						<span className="text-[14px] font-bold tracking-tight uppercase">
							{APP_CONFIG.name}
						</span>
					</Link>
				</header>

				<main className="flex-1 flex items-center justify-center p-8">
					<div className="w-full max-w-[360px]">
						<h1 className="text-[28px] font-semibold text-ink-black tracking-[-0.28px] mb-2">
							{t("forgot_password_page.heading")}
						</h1>
						<p className="text-[15px] text-true-black/60 mb-8">
							{t("forgot_password_page.subheading")}
						</p>

						{success ? (
							<div className="bg-mint-green/10 text-mint-green p-4 rounded-[4px] border border-mint-green/20 mb-6">
								<p className="text-[14px] font-medium">
									{t("forgot_password_page.success_msg")}
								</p>
							</div>
						) : (
							<FormBuilder
								doctype={ForgotPasswordDocType}
								mode="create"
								onSubmit={handleSubmit}
							/>
						)}

						<p className="mt-8 text-center text-[13px] text-true-black/60">
							{t("forgot_password_page.remember_password")}{" "}
							<Link
								to="/login"
								className="text-ink-black font-medium hover:underline"
							>
								{t("forgot_password_page.login")}
							</Link>
						</p>
					</div>
				</main>
			</div>

			<div className="hidden md:flex flex-1 relative bg-ink-black overflow-hidden items-end p-12">
				<img
					src="https://images.unsplash.com/photo-1514888286974-6c03e2ca1dba?q=80&w=2000&auto=format&fit=crop"
					alt="Cat resting"
					className="absolute inset-0 w-full h-full object-cover opacity-60 mix-blend-luminosity"
				/>
				<div className="absolute inset-0 bg-gradient-to-t from-ink-black via-ink-black/50 to-transparent" />

				<div className="relative z-20 max-w-lg">
					<div className="w-12 h-1 bg-mint-green mb-6 rounded-full" />
					<h2 className="text-[36px] font-semibold text-paper-white tracking-tight leading-[1.15]">
						{t("forgot_password_page.hero_heading")}
					</h2>
					<p className="mt-4 text-[16px] text-paper-white/80 leading-[1.6]">
						{t("forgot_password_page.hero_subtext")}
					</p>
				</div>
			</div>
		</div>
	);
}
