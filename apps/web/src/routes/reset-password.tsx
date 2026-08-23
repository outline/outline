import {
	createFileRoute,
	Link,
	useNavigate,
	useSearch,
} from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "@/components/ui";
import { Button } from "@/components/ui/button";
import { confirmPasswordReset } from "@/lib/api/password-reset.functions";
import { APP_CONFIG } from "@/lib/constants";
import { FormBuilder } from "@/lib/form-builder";
import { ResetPasswordDocType } from "@/lib/form-builder/examples/reset-password.doctype";
import { i18n } from "@/shared/i18n/i18n.config";
import { extractErrorMessage } from "@/shared/utils/error";
import { SuccessState } from "@/ui";

export const Route = createFileRoute("/reset-password")({
	head: () => ({
		meta: [
			{ title: `${i18n.t("reset_password_page.title")} — ${APP_CONFIG.name}` },
			{
				name: "description",
				content: i18n.t("reset_password_page.meta_description"),
			},
		],
	}),
	component: ResetPasswordPage,
});

function ResetPasswordPage() {
	const { t } = useTranslation();
	const navigate = useNavigate();
	const search = useSearch({ from: Route.id });
	const [isChecking, setIsChecking] = useState(true);
	const [hasToken, setHasToken] = useState(false);
	const [isSubmitted, setIsSubmitted] = useState(false);
	const [formError, setFormError] = useState<string | null>(null);
	const errorRef = useRef<HTMLDivElement>(null);

	const token = (search as { token?: string }).token;

	useEffect(() => {
		if (token) {
			setHasToken(true);
			setIsChecking(false);
			return;
		}

		setIsChecking(false);
		toast.error(t("common.error"), {
			description: t("reset_password_page.error_invalid_session"),
		});
		navigate({ to: "/forgot-password" });
	}, [token, navigate, t]);

	const handleSubmit = async (values: Record<string, unknown>) => {
		setFormError(null);
		const password = values.password as string;
		const confirmPassword = values.confirm_password as string;

		if (password !== confirmPassword) {
			const message = t("reset_password_page.error_mismatch");
			setFormError(message);
			setTimeout(() => errorRef.current?.focus(), 0);
			return { message, error: true };
		}

		try {
			await confirmPasswordReset({
				data: { token: token ?? "", newPassword: password },
			});
		} catch (error) {
			const message = extractErrorMessage(error, t("common.error"));
			setFormError(message);
			setTimeout(() => errorRef.current?.focus(), 0);
			return {
				message,
				error: true,
			};
		}

		setIsSubmitted(true);
		return { message: t("reset_password_page.success_message") };
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
						{isSubmitted ? (
							<SuccessState
								title={t("reset_password_page.success_title")}
								description={t("reset_password_page.success_description")}
								action={
									<Link to="/login" className="w-full">
										<Button className="w-full">
											{t("reset_password_page.login")}
										</Button>
									</Link>
								}
							/>
						) : isChecking ? (
							<div className="space-y-4 animate-pulse">
								<div className="h-8 bg-neutral-100 rounded w-3/4" />
								<div className="h-4 bg-neutral-100 rounded w-full" />
								<div className="h-10 bg-neutral-100 rounded w-full" />
								<div className="h-10 bg-neutral-100 rounded w-full" />
							</div>
						) : !hasToken ? (
							<div className="text-center space-y-4">
								<h1 className="text-[28px] font-semibold text-ink-black tracking-[-0.28px]">
									{t("reset_password_page.heading")}
								</h1>
								<p className="text-[15px] text-true-black/60">
									{t("reset_password_page.error_invalid_session")}
								</p>
								<Button asChild className="w-full">
									<Link to="/forgot-password">
										{t("forgot_password_page.title")}
									</Link>
								</Button>
							</div>
						) : (
							<>
								<h1 className="text-[28px] font-semibold text-ink-black tracking-[-0.28px] mb-2">
									{t("reset_password_page.heading")}
								</h1>
								<p className="text-[15px] text-true-black/60 mb-8">
									{i18n.t("auth.reset_password_instructions")}
								</p>

								{formError ? (
									<div
										ref={errorRef}
										tabIndex={-1}
										role="alert"
										aria-live="assertive"
										className="mb-6 rounded-[4px] border border-red-200 bg-red-50 p-4 text-[14px] text-red-700 outline-none focus:ring-2 focus:ring-red-300"
									>
										<p className="font-medium">
											{t(
												"reset_password_page.error_title",
												"Tidak dapat mengatur ulang kata sandi",
											)}
										</p>
										<p className="mt-1">{formError}</p>
									</div>
								) : null}

								<FormBuilder
									doctype={ResetPasswordDocType}
									mode="create"
									onSubmit={handleSubmit}
								/>
							</>
						)}
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
						{t("reset_password_page.hero_heading")}
					</h2>
					<p className="mt-4 text-[16px] text-paper-white/80 leading-[1.6]">
						{t("reset_password_page.hero_subtext")}
					</p>
				</div>
			</div>
		</div>
	);
}
