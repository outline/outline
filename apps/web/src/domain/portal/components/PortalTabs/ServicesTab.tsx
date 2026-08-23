import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { TrashBinMinimalisticLinear as TrashIcon } from "solar-icon-set";
import { toast } from "@/components/ui";
import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { portalApi } from "@/lib/api/portal.functions";
import { useLanguage } from "@/shared/i18n";
import { i18n } from "@/shared/i18n/i18n.config";
import { formatCurrency } from "@/shared/utils";
import { ActionButton, Input } from "@/ui";

export function ServicesTab() {
	const queryClient = useQueryClient();
	const { t } = useTranslation();
	const { language } = useLanguage();
	const [isAdding, setIsAdding] = useState(false);
	const [newService, setNewService] = useState<{
		name: string;
		description: string;
		durationMinutes: number;
		price: number;
		category: "freshwater" | "saltwater" | "terrarium" | "other" | "";
	}>({
		name: "",
		description: "",
		durationMinutes: 30,
		price: 0,
		category: "",
	});

	const { data: services = [] } = useQuery({
		queryKey: ["portalServices"],
		queryFn: () => portalApi.getPortalServices(),
	});

	const createMutation = useMutation({
		mutationFn: (
			data: Omit<typeof newService, "category"> & {
				category?:
					| "freshwater"
					| "saltwater"
					| "terrarium"
					| "other"
					| undefined;
			},
		) => portalApi.createPortalService({ data }),
		onSuccess: () => {
			toast.success(i18n.t("common.success_title"), {
				description: t("toast.portal.add_success_desc"),
			});
			queryClient.invalidateQueries({ queryKey: ["portalServices"] });
			setIsAdding(false);
			setNewService({
				name: "",
				description: "",
				durationMinutes: 30,
				price: 0,
				category: "",
			});
		},
	});

	const deleteMutation = useMutation({
		mutationFn: portalApi.deletePortalService,
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["portalServices"] });
		},
	});

	return (
		<div className="space-y-4">
			<div className="flex justify-between items-center">
				<h3 className="text-lg font-bold text-neutral-900">
					{t("portal.portal_services")}
				</h3>
				<Button size="sm" onClick={() => setIsAdding(true)}>
					{t("portal.add_service")}
				</Button>
			</div>

			<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
				{services.map((service) => (
					<div
						key={service.id}
						className="bg-white rounded-lg border border-neutral-200 p-4"
					>
						<div className="flex justify-between items-start mb-2">
							<div>
								<div className="font-bold text-neutral-900">{service.name}</div>
								<div className="text-sm text-neutral-500">
									{service.description || "-"}
								</div>
								{service.category && (
									<span className="inline-block mt-1 text-xs px-2 py-0.5 rounded-full bg-blue-50 text-blue-700">
										{t(`portal.category_${service.category}`)}
									</span>
								)}
							</div>
							<ActionButton
								size="icon"
								variant="ghost"
								title={t("common.delete_service")}
								popupContent={
									<p>{t("common.delete_confirm", { name: service.name })}</p>
								}
								onConfirm={async () => {
									await deleteMutation.mutateAsync({ data: service.id });
									return { message: t("success.deleted") };
								}}
							>
								<TrashIcon className="w-4 h-4" text-neutral-500 />
							</ActionButton>
						</div>
						<div className="flex justify-between items-center mt-4">
							<div className="text-sm text-neutral-500">
								{service.durationMinutes} {t("portal.service_duration_unit")}
							</div>
							<div className="text-lg font-bold text-emerald-600">
								{formatCurrency(service.price, language)}
							</div>
						</div>
					</div>
				))}
			</div>

			<Dialog open={isAdding} onOpenChange={setIsAdding}>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>{t("portal.add_service")}</DialogTitle>
					</DialogHeader>
					<div className="space-y-4 py-4">
						<div className="space-y-2">
							<label htmlFor="service-name" className="text-sm font-medium">
								{t("portal.service_name")}
							</label>
							<Input
								id="service-name"
								type="text"
								value={newService.name}
								onChange={(e) =>
									setNewService({ ...newService, name: e.target.value })
								}
							/>
						</div>
						<div className="space-y-2">
							<label htmlFor="service-desc" className="text-sm font-medium">
								{t("common.description")}
							</label>
							<Textarea
								id="service-desc"
								value={newService.description}
								onChange={(e) =>
									setNewService({ ...newService, description: e.target.value })
								}
								rows={2}
							/>
						</div>
						<div className="space-y-2">
							<label htmlFor="service-category" className="text-sm font-medium">
								{t("portal.service_category")}
							</label>
							<Select
								value={newService.category}
								onValueChange={(value) =>
									setNewService({
										...newService,
										category: value as typeof newService.category,
									})
								}
							>
								<SelectTrigger id="service-category">
									<SelectValue
										placeholder={t("portal.service_category_placeholder")}
									/>
								</SelectTrigger>
								<SelectContent>
									<SelectItem value="freshwater">
										{t("portal.category_freshwater")}
									</SelectItem>
									<SelectItem value="saltwater">
										{t("portal.category_saltwater")}
									</SelectItem>
									<SelectItem value="terrarium">
										{t("portal.category_terrarium")}
									</SelectItem>
									<SelectItem value="other">
										{t("portal.category_other")}
									</SelectItem>
								</SelectContent>
							</Select>
						</div>
						<div className="grid grid-cols-2 gap-4">
							<div className="space-y-2">
								<label
									htmlFor="service-duration"
									className="text-sm font-medium"
								>
									{t("portal.service_duration")}
								</label>
								<Input
									id="service-duration"
									type="number"
									value={newService.durationMinutes}
									onChange={(e) =>
										setNewService({
											...newService,
											durationMinutes: Number(e.target.value),
										})
									}
									min={15}
								/>
							</div>
							<div className="space-y-2">
								<label htmlFor="service-price" className="text-sm font-medium">
									{t("common.price_label")}
								</label>
								<Input
									id="service-price"
									type="number"
									value={newService.price}
									onChange={(e) =>
										setNewService({
											...newService,
											price: Number(e.target.value),
										})
									}
									min={0}
								/>
							</div>
						</div>
					</div>
					<DialogFooter>
						<Button variant="outline" onClick={() => setIsAdding(false)}>
							{t("common.cancel")}
						</Button>
						<Button
							onClick={() =>
								createMutation.mutate({
									...newService,
									category: newService.category || undefined,
								})
							}
							disabled={
								!newService.name ||
								newService.price <= 0 ||
								!newService.category
							}
						>
							{t("common.save")}
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>
		</div>
	);
}
