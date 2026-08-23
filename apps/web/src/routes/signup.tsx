import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { toast } from "@/components/ui";
import { signup } from "@/domain/identity/auth/auth.functions";
import { APP_CONFIG } from "@/lib/constants";
import { FormBuilder } from "@/lib/form-builder";
import { SignupDocType } from "@/lib/form-builder/examples/signup.doctype";
import { i18n } from "@/shared/i18n/i18n.config";
import { extractErrorMessage } from "@/shared/utils/error";

export const Route = createFileRoute("/signup")({
	head: () => ({
		meta: [
			{ title: `${i18n.t("signup_page.title")} — ${APP_CONFIG.name}` },
			{
				name: "description",
				content: i18n.t("signup_page.meta_description"),
			},
		],
	}),
	component: SignupPage,
});

function SignupPage() {
	const { t } = useTranslation();
	const navigate = useNavigate();

	const handleSubmit = async (values: Record<string, unknown>) => {
		try {
			await signup({
				data: {
					email: values.email as string,
					password: values.password as string,
					fullName: values.full_name as string,
					businessName: values.business_name as string,
				},
			});
		} catch (error) {
			return {
				message: extractErrorMessage(error, t("common.error")),
				error: true,
			};
		}

		toast.success(t("signup_page.success_message", "Akun berhasil dibuat"), {
			description: t(
				"signup_page.auto_login_success",
				"Anda telah masuk secara otomatis.",
			),
		});
		navigate({ to: "/dashboard" });

		return {
			message: t("signup_page.success_message", "Akun berhasil dibuat"),
		};
	};

	return (
		<div className="min-h-screen bg-paper-white flex flex-row-reverse font-inter">
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
							{t("signup_page.heading")}
						</h1>
						<p className="text-[15px] text-true-black/60 mb-8">
							{i18n.t("auth.signup_subtitle")}
						</p>

						<FormBuilder
							doctype={SignupDocType}
							mode="create"
							onSubmit={handleSubmit}
						/>

						<p className="mt-8 text-center text-[13px] text-true-black/60">
							{t("signup_page.have_account")}{" "}
							<Link
								to="/login"
								className="text-ink-black font-medium hover:underline"
							>
								{t("signup_page.login_here")}
							</Link>
						</p>
					</div>
				</main>
			</div>

			<div className="hidden md:flex flex-1 relative bg-ink-black overflow-hidden items-end p-12">
				<img
					src="https://images.unsplash.com/photo-1513360371669-4adf3dd7dff8?q=80&w=2000&auto=format&fit=crop"
					alt="Cat profile"
					className="absolute inset-0 w-full h-full object-cover opacity-60 mix-blend-luminosity"
				/>
				<div className="absolute inset-0 bg-gradient-to-t from-ink-black via-ink-black/40 to-transparent" />
				<div className="relative z-20 max-w-lg">
					<div className="w-12 h-1 bg-mint-green mb-6 rounded-full" />
					<h2 className="text-[36px] font-semibold text-paper-white tracking-tight leading-[1.15]">
						{t("signup_page.hero_heading")}
					</h2>
					<p className="mt-4 text-[16px] text-paper-white/80 leading-[1.6]">
						{t("signup_page.hero_subtext")}
					</p>
				</div>
			</div>
		</div>
	);
}
