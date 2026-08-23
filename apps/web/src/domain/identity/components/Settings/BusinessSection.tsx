import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import {
	BuildingsLinear as Building,
	CopyLinear as CopyIcon,
} from "solar-icon-set";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { SessionInfo } from "@/domain/identity/auth/auth.functions";
import { updateBusiness } from "@/lib/api/user.functions";
import { FormBuilder } from "@/lib/form-builder";
import { BusinessSettingsDocType } from "@/lib/form-builder/examples/business-settings.doctype";
import { useCopyToClipboard } from "@/shared/hooks";
import { extractErrorMessage } from "@/shared/utils/error";
import { BusinessAssetsForm } from "./BusinessAssetsForm";

export type TBusinessSectionProps = {
	readonly session: SessionInfo | null;
};

export const BusinessSection = ({ session }: TBusinessSectionProps) => {
	const { t } = useTranslation();
	const queryClient = useQueryClient();
	const copy = useCopyToClipboard();

	const businessMutation = useMutation({
		mutationFn: (data: { name: string; address?: string; phone?: string }) =>
			updateBusiness({
				data: {
					businessId: session?.businessId || "",
					name: data.name,
					address: data.address,
					phone: data.phone,
				},
			}),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["session"] });
			queryClient.invalidateQueries({ queryKey: ["session-info"] });
		},
	});

	return (
		<section className="space-y-4 pt-4">
			<div className="flex items-center gap-2 text-[14px] font-medium text-neutral-900 px-1">
				<Building className="w-4 h-4 text-neutral-400" />
				{t("settings.business_info")}
			</div>
			<div className="bg-white border border-neutral-200/80 rounded-lg  overflow-hidden">
				<div className="p-5">
					{!session?.isAdmin && (
						<p className="text-[11px] text-neutral-400 mb-4 italic">
							{t("settings.admin_only_hint")}
						</p>
					)}
					<FormBuilder
						doctype={BusinessSettingsDocType}
						mode={session?.isAdmin ? "edit" : "view"}
						initialValues={{
							name: session?.businessName || "",
							address: session?.businessAddress || "",
							phone: session?.businessPhone || "",
						}}
						onSubmit={async (values) => {
							try {
								await businessMutation.mutateAsync({
									name: values.name as string,
									address: values.address as string,
									phone: values.phone as string,
								});
								return { message: t("common.success") };
							} catch (err) {
								return {
									message: extractErrorMessage(err, t("common.error")),
									error: true,
								};
							}
						}}
					/>

					{/* Business Identifiers (Read-only) */}
					<div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6 pt-6 border-t border-neutral-100">
						<div className="space-y-1.5">
							<label
								className="text-[11px] font-bold text-neutral-400 uppercase tracking-wider"
								htmlFor="businessId"
							>
								{t("settings.business_id")}
							</label>
							<div className="flex gap-2">
								<Input
									id="businessId"
									readOnly
									value={session?.businessId || ""}
									className="h-9 text-[12px] font-mono bg-neutral-50 border-neutral-200"
								/>
								<Button
									variant="outline"
									size="icon"
									className="h-9 w-9 shrink-0"
									onClick={() =>
										copy(session?.businessId || "", t("settings.business_id"))
									}
								>
									<CopyIcon className="w-4 h-4" />
								</Button>
							</div>
						</div>
						<div className="space-y-1.5">
							<label
								className="text-[11px] font-bold text-neutral-400 uppercase tracking-wider"
								htmlFor="publicSlug"
							>
								{t("settings.public_slug")}
							</label>
							<div className="flex gap-2">
								<Input
									id="publicSlug"
									readOnly
									value={session?.businessSlug || ""}
									className="h-9 text-[12px] font-mono bg-neutral-50 border-neutral-200"
								/>
								<Button
									variant="outline"
									size="icon"
									className="h-9 w-9 shrink-0"
									onClick={() =>
										copy(session?.businessSlug || "", t("settings.public_slug"))
									}
								>
									<CopyIcon className="w-4 h-4" />
								</Button>
							</div>
						</div>
					</div>

					{/* Custom Upload Form for Assets */}
					<BusinessAssetsForm session={session} />
				</div>
			</div>
		</section>
	);
};
