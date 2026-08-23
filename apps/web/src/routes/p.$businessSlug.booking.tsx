import { useMutation, useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "@/components/ui";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
	createPortalBooking,
	getPortalBranchesBySlug,
	getPortalBySlug,
	getPortalServicesBySlug,
} from "@/lib/api/portal.functions";
import { QUERY_POLICY } from "@/shared/cache/cache-policy";
import { queryKeys } from "@/shared/cache/query-keys";
import { Skeleton } from "@/components/ui/skeleton";
import { extractErrorMessage } from "@/shared/utils/error";
import { SuccessState } from "@/ui";

export const Route = createFileRoute("/p/$businessSlug/booking")({
	validateSearch: (search: Record<string, unknown>) => ({
		serviceId:
			typeof search.serviceId === "string" ? search.serviceId : undefined,
	}),
	component: PortalBookingPage,
});

export function resolvePreselectedServiceId(
	requestedServiceId: string | undefined,
	services: readonly { id: string }[] | undefined,
): string | undefined {
	if (!requestedServiceId) return undefined;
	if (!services?.some((s) => s.id === requestedServiceId)) return undefined;
	return requestedServiceId;
}

export function shouldApplyPreselectedService(
	resolved: string | undefined,
	currentServiceId: string,
): boolean {
	return resolved !== undefined && currentServiceId === "";
}

function PortalBookingPage() {
	const { t } = useTranslation();
	const { businessSlug } = Route.useParams();
	const [formData, setFormData] = useState({
		customerName: "",
		customerPhone: "",
		customerEmail: "",
		petName: "",
		petSpecies: "cat",
		petBreed: "",
		scheduledAt: "",
		notes: "",
		serviceId: "",
		branchId: "",
	});

	const { data: portal, isLoading: isLoadingPortal } = useQuery({
		queryKey: queryKeys.publicPortal.config(businessSlug),
		staleTime: QUERY_POLICY.static.staleTime,
		gcTime: QUERY_POLICY.static.gcTime,
		queryFn: () => getPortalBySlug({ data: businessSlug }),
	});

	const { data: services = [], isLoading: isLoadingServices } = useQuery({
		queryKey: queryKeys.publicPortal.services(businessSlug),
		queryFn: () => getPortalServicesBySlug({ data: businessSlug }),
		enabled: !!portal,
	});

	const { serviceId: preselectedServiceId } = Route.useSearch();

	useEffect(() => {
		const resolved = resolvePreselectedServiceId(
			preselectedServiceId,
			services,
		);
		if (!shouldApplyPreselectedService(resolved, formData.serviceId)) return;
		setFormData((prev) => ({ ...prev, serviceId: resolved as string }));
	}, [preselectedServiceId, services, formData.serviceId]);

	const { data: branches = [], isLoading: isLoadingBranches } = useQuery({
		queryKey: queryKeys.publicPortal.branches(businessSlug),
		queryFn: () => getPortalBranchesBySlug({ data: businessSlug }),
		enabled: !!portal,
	});

	// Auto-select the only available branch so the user can still submit quickly
	// while still allowing manual override when multiple branches exist.
	useEffect(() => {
		const onlyBranch = branches[0];
		if (branches.length === 1 && onlyBranch && !formData.branchId) {
			setFormData((prev) => ({ ...prev, branchId: onlyBranch.id }));
		}
	}, [branches, formData.branchId]);

	const [isSubmitted, setIsSubmitted] = useState(false);

	const createBookingMutation = useMutation({
		mutationFn: createPortalBooking,
		onSuccess: () => {
			setIsSubmitted(true);
			// Optional: scroll to top for better UX
			window.scrollTo({ top: 0, behavior: "smooth" });
		},
		onError: (error) => {
			toast.error(t("common.error"), {
				description: extractErrorMessage(error, t("common.error")),
			});
		},
	});

	const handleSubmit = (e: React.FormEvent) => {
		e.preventDefault();
		if (!portal) return;

		if (branches.length > 0 && !formData.branchId) {
			toast.error(t("common.error"), {
				description: t("boarding_form.validation.branch_required", {
					defaultValue: "Silakan pilih cabang",
				}),
			});
			return;
		}

		createBookingMutation.mutate({
			data: {
				businessId: portal.tenantId,
				branchId: formData.branchId || undefined,
				serviceId: formData.serviceId || undefined,
				customerName: formData.customerName,
				customerPhone: formData.customerPhone,
				customerEmail: formData.customerEmail || undefined,
				petName: formData.petName,
				petSpecies: formData.petSpecies,
				petBreed: formData.petBreed || undefined,
				scheduledAt: new Date(formData.scheduledAt),
				notes: formData.notes || undefined,
				idempotencyKey: crypto.randomUUID(),
			},
		});
	};

	if (isLoadingPortal) {
		return (
			<div className="min-h-screen bg-neutral-50/50 py-10 px-6">
				<div className="max-w-lg mx-auto space-y-6">
					<div className="text-center space-y-2">
						<Skeleton className="h-6 w-48 rounded-lg mx-auto" />
						<Skeleton className="h-4 w-64 rounded-lg mx-auto" />
					</div>
					<div className="bg-white rounded-2xl border border-neutral-200 shadow-sm p-6 space-y-4">
						{[1, 2, 3, 4, 5].map((i) => (
							<Skeleton key={i} className="h-11 w-full rounded-lg" />
						))}
						<Skeleton className="h-12 w-full rounded-xl" />
					</div>
				</div>
			</div>
		);
	}

	if (!portal?.isActive) {
		return (
			<div className="min-h-screen flex items-center justify-center p-6 text-center">
				<div className="max-w-md space-y-4">
					<h1 className="text-2xl font-bold text-neutral-900">
						{t("portal.no_bookings")}
					</h1>
					<p className="mt-2 text-neutral-500">{t("error.not_found")}</p>
				</div>
			</div>
		);
	}

	return (
		<div className="min-h-screen bg-neutral-50 py-12 px-4">
			<div className="max-w-md mx-auto">
				{isSubmitted ? (
					<div className="bg-white p-6 rounded-xl shadow-sm">
						<SuccessState
							title={t("success.saved")}
							description={t("boarding_form.success.message")}
						/>
					</div>
				) : (
					<>
						<div className="text-center mb-8">
							<h1 className="text-3xl font-bold text-neutral-900">
								{t("portal.online_booking")}
							</h1>
							<p className="mt-2 text-neutral-500">{t("portal.description")}</p>
						</div>

						<form
							onSubmit={handleSubmit}
							className="space-y-6 bg-white p-6 rounded-xl shadow-sm"
						>
							<div className="space-y-4">
								<h2 className="text-lg font-semibold text-neutral-900">
									{t("boarding_form.steps.owner.title")}
								</h2>

								<div>
									<label
										className="block text-sm font-medium text-neutral-700 mb-1"
										htmlFor="ownerName"
									>
										{t("boarding_form.labels.owner_name")} *
									</label>
									<Input
										id="ownerName"
										value={formData.customerName}
										onChange={(e) =>
											setFormData({ ...formData, customerName: e.target.value })
										}
										placeholder={t("boarding_form.placeholders.owner_name")}
										required
									/>
								</div>

								<div>
									<label
										className="block text-sm font-medium text-neutral-700 mb-1"
										htmlFor="ownerPhone"
									>
										{t("boarding_form.labels.owner_phone")} *
									</label>
									<div className="flex rounded-md border border-neutral-200 focus-within:ring-2 focus-within:ring-neutral-900 focus-within:ring-offset-2 transition-all h-10 overflow-hidden bg-white">
										<span className="flex items-center px-3 bg-neutral-100 text-neutral-500 border-r border-neutral-200 text-[14px] font-medium select-none">
											+62
										</span>
										<input
											id="ownerPhone"
											type="tel"
											value={formData.customerPhone}
											onChange={(e) => {
												let val = e.target.value.replace(/\D/g, "");
												if (val.startsWith("0")) val = val.substring(1);
												if (val.startsWith("62")) val = val.substring(2);
												setFormData({
													...formData,
													customerPhone: val,
												});
											}}
											placeholder={t("boarding_form.placeholders.owner_phone")}
											className="flex-1 bg-transparent px-3 text-[14px] outline-none placeholder:text-muted-foreground min-w-0"
											required
										/>
									</div>
								</div>

								<div>
									<label
										className="block text-sm font-medium text-neutral-700 mb-1"
										htmlFor="ownerEmail"
									>
										{t("settings.email")} ({t("common.optional")})
									</label>
									<Input
										id="ownerEmail"
										type="email"
										value={formData.customerEmail}
										onChange={(e) =>
											setFormData({
												...formData,
												customerEmail: e.target.value,
											})
										}
										placeholder="email@example.com"
									/>
								</div>
							</div>

							<div className="space-y-4">
								<h2 className="text-lg font-semibold text-neutral-900">
									{t("boarding_form.steps.pets.title")}
								</h2>

								<div>
									<label
										className="block text-sm font-medium text-neutral-700 mb-1"
										htmlFor="petName"
									>
										{t("boarding_form.labels.pet_name")} *
									</label>
									<Input
										id="petName"
										value={formData.petName}
										onChange={(e) =>
											setFormData({ ...formData, petName: e.target.value })
										}
										placeholder={t("boarding_form.placeholders.pet_name")}
										required
									/>
								</div>

								<div>
									<label
										className="block text-sm font-medium text-neutral-700 mb-1"
										htmlFor="petKind"
									>
										{t("boarding_form.labels.pet_kind")}
									</label>
									<Select
										value={formData.petSpecies}
										onValueChange={(value) =>
											setFormData({ ...formData, petSpecies: value })
										}
									>
										<SelectTrigger id="petKind">
											<SelectValue />
										</SelectTrigger>
										<SelectContent>
											<SelectItem value="cat">{t("boarding.cat")}</SelectItem>
											<SelectItem value="dog">{t("boarding.dog")}</SelectItem>
											<SelectItem value="rabbit">
												{t("boarding.rabbit")}
											</SelectItem>
											<SelectItem value="other">
												{t("boarding.other")}
											</SelectItem>
										</SelectContent>
									</Select>
								</div>

								<div>
									<label
										className="block text-sm font-medium text-neutral-700 mb-1"
										htmlFor="petBreed"
									>
										{t("boarding_form.labels.pet_breed")} (
										{t("common.optional")})
									</label>
									<Input
										id="petBreed"
										value={formData.petBreed}
										onChange={(e) =>
											setFormData({ ...formData, petBreed: e.target.value })
										}
										placeholder="cth: Persia, Anggora"
									/>
								</div>
							</div>

							<div className="space-y-4">
								<h2 className="text-lg font-semibold text-neutral-900">
									{t("boarding_form.steps.schedule.title")}
								</h2>

								{!isLoadingBranches && branches.length > 0 && (
									<div>
										<label
											className="block text-sm font-medium text-neutral-700 mb-1"
											htmlFor="branchId"
										>
											{t("nav.branches")} *
										</label>
										<Select
											value={formData.branchId}
											onValueChange={(value) =>
												setFormData({ ...formData, branchId: value })
											}
										>
											<SelectTrigger id="branchId">
												<SelectValue placeholder={t("common.select_option")} />
											</SelectTrigger>
											<SelectContent>
												{branches.map((branch) => (
													<SelectItem key={branch.id} value={branch.id}>
														{branch.name}
													</SelectItem>
												))}
											</SelectContent>
										</Select>
									</div>
								)}

								{!isLoadingServices && services.length > 0 && (
									<div>
										<label
											className="block text-sm font-medium text-neutral-700 mb-1"
											htmlFor="serviceId"
										>
											{t("portal.portal_services")} ({t("common.optional")})
										</label>
										<Select
											value={formData.serviceId}
											onValueChange={(value) =>
												setFormData({ ...formData, serviceId: value })
											}
										>
											<SelectTrigger id="serviceId">
												<SelectValue placeholder={t("common.select_option")} />
											</SelectTrigger>
											<SelectContent>
												{services.map((service) => (
													<SelectItem key={service.id} value={service.id}>
														{service.name} - Rp{" "}
														{service.price.toLocaleString("id-ID")}
													</SelectItem>
												))}
											</SelectContent>
										</Select>
									</div>
								)}

								<div>
									<label
										className="block text-sm font-medium text-neutral-700 mb-1"
										htmlFor="checkinDate"
									>
										{t("boarding.checkin_date")} *
									</label>
									<Input
										id="checkinDate"
										type="datetime-local"
										value={formData.scheduledAt}
										onChange={(e) =>
											setFormData({ ...formData, scheduledAt: e.target.value })
										}
										required
									/>
								</div>

								<div>
									<label
										className="block text-sm font-medium text-neutral-700 mb-1"
										htmlFor="notes"
									>
										{t("common.description")} ({t("common.optional")})
									</label>
									<Textarea
										id="notes"
										value={formData.notes}
										onChange={(e) =>
											setFormData({ ...formData, notes: e.target.value })
										}
										placeholder="..."
										rows={3}
									/>
								</div>
							</div>

							<Button
								type="submit"
								className="w-full"
								disabled={createBookingMutation.isPending}
							>
								{createBookingMutation.isPending
									? t("common.processing")
									: t("common.submit")}
							</Button>
						</form>
					</>
				)}
			</div>
		</div>
	);
}
