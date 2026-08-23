import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { toast } from "@/components/ui";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { portalApi } from "@/lib/api/portal.functions";
import type { PortalConfigData } from "@/lib/types";
import { i18n } from "@/shared/i18n/i18n.config";
import { useSession } from "@/shared/hooks";
import { useUploadController } from "@/shared/upload/use-upload-controller";
import { uploadFile } from "@/shared/utils/upload";
import { Input } from "@/ui";

export function SettingsTab() {
	const queryClient = useQueryClient();
	const { t } = useTranslation();

	const { data: config } = useQuery({
		queryKey: ["portalConfig"],
		queryFn: () => portalApi.getPortalConfig(),
	});

	const updateMutation = useMutation({
		mutationFn: (data: Partial<PortalConfigData>) =>
			portalApi.updatePortalConfig({ data }),
		onSuccess: () => {
			toast.success(i18n.t("common.success_title"), {
				description: t("toast.portal.save_success_desc"),
			});
			queryClient.invalidateQueries({ queryKey: ["portalConfig"] });
		},
		onError: () =>
			toast.error(i18n.t("common.error_title"), {
				description: t("toast.portal.save_error_desc"),
			}),
	});

	const { session } = useSession();

	const logoUpload = useUploadController(async (file) => {
		if (!session?.businessId) throw new Error("Missing businessId");
		return { url: await uploadFile("portal-assets", file, session.businessId) };
	});

	const updateLogoMutation = useMutation({
		mutationFn: (logoUrl: string) =>
			portalApi.updatePortalConfig({ data: { logoUrl } }),
		onSuccess: () => {
			toast.success(i18n.t("common.success_title"), {
				description: t("toast.portal.save_success_desc"),
			});
			queryClient.invalidateQueries({ queryKey: ["portalConfig"] });
		},
		onError: () =>
			toast.error(i18n.t("common.error_title"), {
				description: t("toast.portal.save_error_desc"),
			}),
	});

	const handleLogoUpload = async (file: File) => {
		const result = await logoUpload.upload(file);
		if (result.status !== "success") return;
		updateLogoMutation.mutate(result.url);
	};

	if (!config) return <Skeleton className="h-40 w-full rounded-lg" />;

	return (
		<div className="bg-white rounded-lg border border-neutral-200 p-6 space-y-6">
			<h3 className="text-lg font-bold text-neutral-900">
				{t("portal.title")}
			</h3>

			<div className="space-y-4">
				<div className="space-y-2">
					<label
						htmlFor="portal-logo"
						className="text-sm font-medium text-neutral-700"
					>
						{t("portal.logo_label", "Logo Portal")}
					</label>
					<div className="flex items-center gap-4">
						<div className="w-16 h-16 rounded-lg border border-neutral-200 bg-neutral-50 flex items-center justify-center overflow-hidden flex-shrink-0">
							{config.logoUrl ? (
								<img
									src={config.logoUrl}
									alt="Portal logo"
									className="w-full h-full object-contain"
								/>
							) : (
								<span className="text-neutral-400 text-[10px]">No Logo</span>
							)}
						</div>
						<input
							id="portal-logo"
							type="file"
							accept="image/*"
							onChange={(e) => {
								if (e.target.files?.[0]) handleLogoUpload(e.target.files[0]);
							}}
							disabled={
								logoUpload.state.status === "uploading" ||
								logoUpload.state.status === "validating" ||
								logoUpload.state.status === "confirming"
							}
							className="text-[12px] file:mr-3 file:py-1.5 file:px-3 file:rounded-full file:border-0 file:text-[11px] file:font-semibold file:bg-mint-green/10 file:text-mint-green hover:file:bg-mint-green/20 disabled:opacity-50 cursor-pointer"
						/>
					</div>
				</div>

				<div className="space-y-2">
					<label
						htmlFor="portal-slug"
						className="text-sm font-medium text-neutral-700"
					>
						{t("portal.slug")}
					</label>
					<div className="flex items-center gap-2">
						<Input
							id="portal-slug"
							type="text"
							value={config.slug || ""}
							onChange={(e) => updateMutation.mutate({ slug: e.target.value })}
							placeholder={t("portal.slug_placeholder")}
							className="flex-1"
						/>
						<span className="text-sm text-neutral-500">.pawsi.id</span>
					</div>
				</div>

				<div className="flex items-center justify-between">
					<div>
						<div className="font-medium text-neutral-900">
							{t("portal.enable_portal")}
						</div>
						<div className="text-sm text-neutral-500">
							{t("portal.enable_portal_desc")}
						</div>
					</div>
					<Switch
						checked={config?.isActive ?? false}
						onCheckedChange={(checked) =>
							updateMutation.mutate({ is_active: checked })
						}
					/>
				</div>

				<div className="flex items-center justify-between">
					<div>
						<div className="font-medium text-neutral-900">
							{t("portal.online_booking")}
						</div>
						<div className="text-sm text-neutral-500">
							{t("portal.online_booking_desc")}
						</div>
					</div>
					<Switch
						checked={config?.bookingEnabled ?? false}
						onCheckedChange={(checked) =>
							updateMutation.mutate({ booking_enabled: checked })
						}
					/>
				</div>

				<div className="flex items-center justify-between">
					<div>
						<div className="font-medium text-neutral-900">
							{t("portal.mandatory_deposit")}
						</div>
						<div className="text-sm text-neutral-500">
							{t("portal.mandatory_deposit_desc")}
						</div>
					</div>
					<Switch
						checked={config?.depositRequired ?? false}
						onCheckedChange={(checked) =>
							updateMutation.mutate({ deposit_required: checked })
						}
					/>
				</div>

				{config?.depositRequired && (
					<div className="space-y-2">
						<label
							htmlFor="deposit-amount"
							className="text-sm font-medium text-neutral-700"
						>
							{t("common.deposit_amount")}
						</label>
						<Input
							id="deposit-amount"
							type="number"
							value={config.depositAmount ?? 0}
							onChange={(e) =>
								updateMutation.mutate({
									deposit_amount: Number(e.target.value),
								})
							}
							min={0}
						/>
					</div>
				)}
			</div>
		</div>
	);
}
