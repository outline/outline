import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import {
	StarLinear as BusinessIcon,
	CheckCircleLinear as Check,
	WidgetLinear as FreeIcon,
	InfoCircleLinear as InfoIcon,
	CrownMinimalisticLinear as ProIcon,
} from "solar-icon-set";
import { toast } from "@/components/ui";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { paymentsApi } from "@/lib/api/payments.functions";
import { subscriptionsApi } from "@/lib/api/subscriptions.functions";
import { APP_CONFIG, SAAS_LIMITS } from "@/lib/constants";
import { queryKeys } from "@/shared/cache/query-keys";
import { useLanguage } from "@/shared/i18n";
import { i18n } from "@/shared/i18n/i18n.config";
import { cn, formatCurrency, formatDate } from "@/shared/utils";
import { extractErrorMessage } from "@/shared/utils/error";
import { ErrorState, PageHeader } from "@/ui";

export const Route = createFileRoute("/_authenticated/settings/billing")({
	head: () => ({
		meta: [
			{
				title: `${i18n.t("billing.title", "Tagihan & Paket")} — ${APP_CONFIG.name}`,
			},
			{
				name: "description",
				content: i18n.t("settings_page.description"),
			},
		],
	}),
	component: BillingPage,
});

function BillingPage() {
	const { t } = useTranslation();
	const queryClient = useQueryClient();
	const { language } = useLanguage();
	const [billingCycle, setBillingCycle] = useState<"monthly" | "yearly">(
		"monthly",
	);
	const [isProcessing, setIsProcessing] = useState(false);

	const {
		data: subscription,
		isLoading: isLoadingSub,
		isError: isErrorSub,
		refetch: refetchSub,
	} = useQuery({
		queryKey: queryKeys.billing.subscription(),
		queryFn: () => subscriptionsApi.getSubscription(),
	});

	const {
		data: usage,
		isLoading: isLoadingUsage,
		isError: isErrorUsage,
		refetch: refetchUsage,
	} = useQuery({
		queryKey: queryKeys.billing.usageMetrics(),
		queryFn: () => subscriptionsApi.getUsageMetrics(),
	});

	const {
		data: billingHistory = [],
		isError: isErrorHistory,
		refetch: refetchHistory,
	} = useQuery({
		queryKey: queryKeys.billing.billingHistory(),
		queryFn: () => paymentsApi.getBillingHistory(),
	});

	const upgradeMutation = useMutation({
		mutationFn: async ({
			plan,
			billingCycle,
		}: {
			plan: "free" | "pro" | "business";
			billingCycle: "monthly" | "yearly";
		}) => {
			setIsProcessing(true);
			try {
				const result = await paymentsApi.createSubscriptionPayment({
					data: { plan, billingCycle },
				});
				return result;
			} finally {
				setIsProcessing(false);
			}
		},
		onSuccess: (result) => {
			if (result.snapToken && typeof window !== "undefined" && window.snap) {
				window.snap.pay(result.snapToken, {
					onSuccess: async () => {
						await paymentsApi.handlePaymentCallback({
							data: {
								orderId: result.orderId,
								transactionStatus: "capture",
								transactionId: `TXN-${Date.now()}`,
								paymentMethod: "credit_card",
							},
						});
						queryClient.invalidateQueries({
							queryKey: queryKeys.billing.subscription(),
						});
						toast.success(t("toast.billing.payment_success_title"), {
							description: t("toast.billing.payment_success_desc"),
						});
					},
					onPending: () => {
						toast.info(t("toast.billing.payment_pending_title"), {
							description: t("toast.billing.payment_pending_desc"),
						});
					},
					onError: () => {
						toast.error(t("toast.billing.payment_error_title"), {
							description: t("toast.billing.payment_error_desc"),
						});
					},
					onClose: () => {
						toast.info(t("toast.billing.payment_cancelled_title"), {
							description: t("toast.billing.payment_cancelled_desc"),
						});
					},
				});
			} else {
				toast.error(t("toast.billing.system_error_title"), {
					description: t("toast.billing.system_error_desc"),
				});
			}
		},
		onError: (error: Error) => {
			toast.error(t("toast.billing.create_error_title"), {
				description: extractErrorMessage(
					error,
					t("toast.billing.create_error_desc"),
				),
			});
		},
	});

	const currentPlan = subscription?.plan || "free";
	const limits =
		SAAS_LIMITS[currentPlan as keyof typeof SAAS_LIMITS] || SAAS_LIMITS.free;

	const usageItems = [
		{
			label: t("billing.usage.products"),
			current: usage?.products || 0,
			limit: limits.products,
			unit: t("billing.usage.skus"),
		},
		{
			label: t("billing.usage.staff"),
			current: usage?.staff || 0,
			limit: limits.staff,
			unit: t("billing.usage.members"),
		},
		{
			label: t("billing.usage.boardings"),
			current: usage?.activeBoardings || 0,
			limit: limits.activeBoardings,
			unit: t("billing.usage.boarding_units"),
		},
	];

	const handleUpgrade = (plan: "free" | "pro" | "business") => {
		if (currentPlan === plan) return;
		upgradeMutation.mutate({ plan, billingCycle });
	};

	return (
		<div className="flex flex-col flex-1 animate-in fade-in duration-500">
			<PageHeader
				title={t("billing.history_title", "Paket & Tagihan")}
				description={t(
					"billing.history_desc",
					"Kelola paket berlangganan dan riwayat tagihan.",
				)}
			/>

			<div className="p-6 lg:p-8 max-w-4xl mx-auto w-full space-y-8 flex-1">
				{isLoadingSub || isLoadingUsage ? (
					<div className="space-y-6">
						<Skeleton className="h-32 rounded-lg" />
						<div className="grid grid-cols-1 md:grid-cols-3 gap-4">
							<Skeleton className="h-64 rounded-lg" />
							<Skeleton className="h-64 rounded-lg" />
							<Skeleton className="h-64 rounded-lg" />
						</div>
					</div>
				) : isErrorSub || isErrorUsage ? (
					<ErrorState
						onRetry={() => {
							refetchSub();
							refetchUsage();
						}}
						className="mt-8 mx-auto"
					/>
				) : (
					<>
						{/* Current Plan Overview */}
						<section className="bg-neutral-900 text-white rounded-lg p-6  overflow-hidden relative">
							<div className="absolute right-0 top-0 opacity-10 -translate-y-4 translate-x-4">
								<ProIcon className="w-48 h-48" />
							</div>
							<div className="relative z-10 space-y-4">
								<div className="flex items-center gap-3">
									<div className="w-10 h-10 rounded-lg bg-white/10 flex items-center justify-center">
										<ProIcon className="w-6 h-6 text-mint-green" />
									</div>
									<div>
										<div className="text-[12px] font-medium text-white/60 uppercase tracking-widest">
											{t("billing.current_plan")}
										</div>
										<h2 className="text-xl font-bold uppercase tracking-tight">
											{currentPlan} {t("billing.package")}
										</h2>
									</div>
								</div>

								<div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-4 border-t border-white/10">
									{usageItems.map((item) => {
										const percent =
											item.limit === Number.POSITIVE_INFINITY
												? 0
												: (item.current / item.limit) * 100;

										return (
											<div key={item.label} className="space-y-2">
												<div className="flex justify-between text-[12px]">
													<span className="text-white/60">{item.label}</span>
													<span className="font-medium text-white">
														{item.current} /{" "}
														{item.limit === Number.POSITIVE_INFINITY
															? "∞"
															: item.limit}
													</span>
												</div>
												<Progress
													value={percent}
													className="h-1.5 bg-white/10"
													indicatorClassName={cn(
														percent > 90 ? "bg-rose-500" : "bg-mint-green",
													)}
												/>
											</div>
										);
									})}
								</div>
							</div>
						</section>

						{/* Billing Cycle Toggle */}
						<section className="space-y-6">
							<div className="text-center space-y-4">
								<h3 className="text-[18px] font-bold text-neutral-900">
									{t("billing.upgrade_business")}
								</h3>
								<p className="text-[14px] text-neutral-500">
									{t("billing.choose_plan_desc")}
								</p>

								{/* Billing Cycle Toggle */}
								<div className="inline-flex items-center bg-neutral-100 rounded-lg p-1">
									<Button
										size="sm"
										variant={billingCycle === "monthly" ? "default" : "ghost"}
										onClick={() => setBillingCycle("monthly")}
										className="text-[12px] font-bold"
									>
										{t("billing.monthly")}
									</Button>
									<Button
										size="sm"
										variant={billingCycle === "yearly" ? "default" : "ghost"}
										onClick={() => setBillingCycle("yearly")}
										className="text-[12px] font-bold"
									>
										{t("billing.yearly")}
										<span className="ml-1 text-xs text-emerald-600 font-bold">
											{t("billing.save_2_months")}
										</span>
									</Button>
								</div>
							</div>

							<div className="grid grid-cols-1 md:grid-cols-3 gap-6">
								{/* Free Plan */}
								<PricingCard
									title="Free"
									price={0}
									icon={FreeIcon}
									description={t("billing.plans.free.desc")}
									features={[
										t("billing.plans.free.f1"),
										t("billing.plans.free.f2"),
										t("billing.plans.free.f3"),
										t("billing.plans.free.f4"),
									]}
									isCurrent={currentPlan === "free"}
									onSelect={() => {}}
									isProcessing={false}
									language={language}
								/>

								{/* Pro Plan */}
								<PricingCard
									title="Pro"
									price={billingCycle === "monthly" ? 388000 : 3880000}
									icon={ProIcon}
									description={t("billing.plans.pro.desc")}
									features={[
										t("billing.plans.pro.f1"),
										t("billing.plans.pro.f2"),
										t("billing.plans.pro.f3"),
										t("billing.plans.pro.f4"),
										t("billing.advanced_reports"),
									]}
									highlight
									isCurrent={currentPlan === "pro"}
									onSelect={() => handleUpgrade("pro")}
									isProcessing={isProcessing}
									period={billingCycle === "monthly" ? "/bln" : "/thn"}
									language={language}
								/>

								{/* Business Plan */}
								<PricingCard
									title="Business"
									price={billingCycle === "monthly" ? 888000 : 8880000}
									icon={BusinessIcon}
									description={t("billing.plans.business.desc")}
									features={[
										t("billing.plans.business.f1"),
										t("billing.plans.business.f2"),
										t("billing.plans.business.f3"),
										t("billing.plans.business.f4"),
										t("billing.plans.business.f5"),
									]}
									isCurrent={currentPlan === "business"}
									onSelect={() => handleUpgrade("business")}
									isProcessing={isProcessing}
									period={billingCycle === "monthly" ? "/bln" : "/thn"}
									language={language}
								/>
							</div>
						</section>

						{/* Billing History */}
						{isErrorHistory ? (
							<section className="space-y-4">
								<h3 className="text-lg font-bold text-neutral-900">
									{t("billing.payment_history")}
								</h3>
								<ErrorState
									onRetry={() => refetchHistory()}
									className="border border-neutral-200"
								/>
							</section>
						) : (
							billingHistory.length > 0 && (
								<section className="space-y-4">
									<h3 className="text-lg font-bold text-neutral-900">
										{t("billing.payment_history")}
									</h3>
									<div className="bg-white rounded-lg border border-neutral-200 overflow-hidden">
										<div className="divide-y divide-neutral-100">
											{billingHistory.slice(0, 5).map((event, index) => (
												<div
													key={index}
													className="px-4 py-3 flex items-center justify-between"
												>
													<div>
														<div className="font-medium text-neutral-900 text-sm">
															{event.eventType === "subscription_created"
																? t("billing.history.upgrade")
																: event.eventType === "plan_changed"
																	? t("billing.history.change")
																	: event.eventType}
														</div>
														<div className="text-xs text-neutral-500">
															{formatDate(event.createdAt, language)}
														</div>
													</div>
													<div className="text-right">
														<div className="font-bold text-sm">
															{formatCurrency(event.amount, language)}
														</div>
														<div
															className={cn(
																"text-xs font-medium",
																event.status === "success"
																	? "text-emerald-600"
																	: event.status === "pending"
																		? "text-amber-600"
																		: "text-rose-600",
															)}
														>
															{event.status === "success"
																? i18n.t("common.success_title")
																: event.status === "pending"
																	? "Pending"
																	: t("billing.history.failed")}
														</div>
													</div>
												</div>
											))}
										</div>
									</div>
								</section>
							)
						)}

						<div className="bg-blue-50 border border-blue-100 rounded-lg p-4 flex gap-3">
							<InfoIcon className="w-5 h-5 text-blue-600 flex-shrink-0" />
							<div className="text-[13px] text-blue-800 leading-relaxed">
								<span className="font-bold">{t("billing.payment_info")}:</span>{" "}
								{t("billing.payment_info_desc")}
							</div>
						</div>
					</>
				)}
			</div>
		</div>
	);
}

function PricingCard({
	title,
	price,
	description,
	features,
	icon: Icon,
	highlight,
	isCurrent,
	onSelect,
	isProcessing,
	period = "/bln",
	language,
}: {
	title: string;
	price: number;
	description: string;
	features: string[];
	icon: React.ComponentType<{ className?: string }>;
	highlight?: boolean;
	isCurrent?: boolean;
	onSelect: () => void;
	isProcessing: boolean;
	period?: string;
	language: string;
}) {
	const { t } = useTranslation();

	return (
		<div
			className={cn(
				"relative rounded-lg border p-6 flex flex-col space-y-6 transition-all",
				highlight
					? "border-mint-green  ring-1 ring-mint-green"
					: "border-neutral-200 bg-white",
				isCurrent && "opacity-80",
			)}
		>
			{highlight && (
				<div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-mint-green text-ink-black text-[10px] font-bold uppercase tracking-widest px-3 py-1 rounded-full ">
					{t("billing.most_popular")}
				</div>
			)}

			<div className="space-y-4 flex-1">
				<div className="flex items-center gap-3">
					<div
						className={cn(
							"w-10 h-10 rounded-lg flex items-center justify-center",
							highlight
								? "bg-mint-green/10 text-mint-green"
								: "bg-neutral-100 text-neutral-400",
						)}
					>
						<Icon className="w-6 h-6" />
					</div>
					<h4 className="text-lg font-bold text-neutral-900">{title}</h4>
				</div>

				<div className="space-y-1">
					<div className="flex items-baseline gap-1">
						<span className="text-3xl font-bold text-neutral-900">
							{formatCurrency(price, language as "id" | "en")}
						</span>
						<span className="text-[14px] text-neutral-500">{period}</span>
					</div>
					<p className="text-[13px] text-neutral-500 leading-snug">
						{description}
					</p>
				</div>

				<ul className="space-y-3 pt-4">
					{features.map((f) => (
						<li
							key={f}
							className="flex items-start gap-3 text-[13px] text-neutral-600"
						>
							<Check className="w-4 h-4 text-mint-green mt-0.5" />
							{f}
						</li>
					))}
				</ul>
			</div>

			<Button
				disabled={isCurrent || isProcessing}
				onClick={onSelect}
				variant={isCurrent ? "outline" : highlight ? "default" : "default"}
				className={cn(
					"w-full",
					isCurrent && "bg-neutral-100 text-neutral-400 cursor-default",
					highlight && "bg-mint-green text-ink-black hover:bg-emerald-400",
				)}
			>
				{isCurrent
					? t("billing.current_active_plan")
					: isProcessing
						? t("billing.processing")
						: t("billing.select_plan", { title })}
			</Button>
		</div>
	);
}
