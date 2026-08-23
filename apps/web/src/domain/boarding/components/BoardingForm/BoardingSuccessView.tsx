import { Link } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import {
	CalendarLinear as Calendar,
	CheckCircleLinear as CheckCircle2,
	MapPointLinear as MapPin,
	PawLinear as PawPrint,
	UserLinear as User,
} from "solar-icon-set";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/shared/utils";
import { Button, PageHeader } from "@/ui";
import { SafeHtml } from "@/shared/components/SafeHtml";
import type { TBoardingRegistrationState } from "../../hooks/useBoardingRegistration";
import { styles } from "./BoardingForm.styles";

export type TBoardingSuccessViewProps = {
	readonly state: TBoardingRegistrationState;
	readonly branches: readonly { id: string; name: string }[];
	readonly onReset: () => void;
};

export const BoardingSuccessView = ({
	state,
	branches,
	onReset,
}: TBoardingSuccessViewProps) => {
	const { t } = useTranslation();
	const branchName =
		branches.find((b) => b.id === state.branchId)?.name || "Main Branch";

	return (
		<div className={styles.container}>
			<PageHeader
				title={t("boarding_form.breadcrumb.registration_complete")}
				description={t(
					"boarding.registration_complete_subtitle",
					"Pendaftaran penitipan hewan telah berhasil disimpan.",
				)}
				docHref="/docs/boarding"
				breadcrumbs={[
					{
						label: t("boarding_form.breadcrumb.business_name"),
						href: "/dashboard",
					},
					{ label: t("boarding_form.breadcrumb.registration_complete") },
				]}
			/>
			<div className={styles.content}>
				<div className="mx-auto max-w-2xl animate-in fade-in slide-in-from-bottom-4 duration-500">
					<div className={styles.card}>
						<div className={styles.successHeader}>
							<div className={styles.successIcon}>
								<CheckCircle2 className="h-8 w-8" />
							</div>
							<h1 className={styles.successTitle}>
								{t("boarding_form.success.title")}
							</h1>
							<p className="text-[16px] text-true-black/60 mt-2">
								{t("boarding_form.success.message")}
							</p>
						</div>

						<div className={styles.successBody}>
							<div className="grid gap-6 sm:grid-cols-2">
								<div className={styles.summaryItem}>
									<div className={styles.summaryLabel}>
										<User className="h-4 w-4" />{" "}
										{t("boarding_form.summary.owner")}
									</div>
									<p className={styles.summaryValue}>{state.ownerName}</p>
									<p className={styles.summaryDetail}>{state.ownerPhone}</p>
								</div>
								<div className={styles.summaryItem}>
									<div className={styles.summaryLabel}>
										<MapPin className="h-4 w-4" />{" "}
										{t("boarding_form.summary.branch")}
									</div>
									<p className={styles.summaryValue}>{branchName}</p>
									<SafeHtml
										html={state.ownerAddress}
										className={cn(
											styles.summaryDetail,
											"[&>p]:m-0 [&>p]:leading-normal",
										)}
									/>
								</div>
							</div>

							<Separator className="bg-mist-gray" />

							<div className="space-y-4">
								<div className={styles.summaryLabel}>
									<PawPrint className="h-4 w-4" />{" "}
									{t("boarding_form.summary.pets_registered")} (
									{state.pets.length})
								</div>
								<div className="grid gap-3">
									{state.pets.map((pet) => (
										<div
											key={pet.id}
											className="flex items-center justify-between rounded-[8px] border border-mist-gray p-4 bg-[#fafafa]"
										>
											<div>
												<p className="font-semibold text-ink-black text-[16px]">
													{pet.name}
												</p>
												<p className="text-[14px] text-true-black/60 mt-1">
													{t(`boarding.${pet.kind}`, pet.kind)}
													{pet.breed ? ` • ${pet.breed}` : ""}
												</p>
												{pet.notes && (
													<p className="text-[12px] text-true-black/40 mt-1 italic">
														{t("boarding_form.labels.pet_notes")}: {pet.notes}
													</p>
												)}
											</div>
											<span
												className={cn(
													"text-[12px] font-medium px-2 py-1 rounded-[4px]",
													pet.vaccinated === "yes"
														? "bg-mint-green/10 text-mint-green"
														: "bg-mist-gray text-true-black/60",
												)}
											>
												{pet.vaccinated === "yes"
													? t("boarding_form.summary.vaccinated")
													: t("boarding_form.summary.not_vaccinated")}
											</span>
										</div>
									))}
								</div>
							</div>

							<Separator className="bg-mist-gray" />

							<div className="grid gap-6 sm:grid-cols-2">
								<div className={styles.summaryItem}>
									<div className={styles.summaryLabel}>
										<Calendar className="h-4 w-4" />{" "}
										{t("boarding_form.summary.check_in")}
									</div>
									<p className="font-medium text-[16px] text-ink-black mt-2">
										{state.checkInDate}
									</p>
								</div>
								<div className={styles.summaryItem}>
									<div className={styles.summaryLabel}>
										<Calendar className="h-4 w-4" />{" "}
										{t("boarding_form.summary.est_out")}
									</div>
									<p className="font-medium text-[16px] text-ink-black mt-2">
										{state.estimatedCheckOutDate || "-"}
									</p>
								</div>
							</div>
						</div>

						<div className="bg-[#fafafa] border-t border-mist-gray p-6 flex flex-col sm:flex-row gap-4">
							<Link
								to="/dashboard"
								className="flex-1 flex items-center justify-center border border-neutral-200 text-neutral-800 rounded-lg px-4 py-2 hover:bg-neutral-50 transition-colors"
							>
								{t("boarding.back_dashboard")}
							</Link>
							<Button
								type="button"
								onClick={onReset}
								variant="outline"
								className="flex-1"
							>
								{t("boarding.register_again")}
							</Button>
						</div>
					</div>
				</div>
			</div>
		</div>
	);
};
