import { useMutation, useQueryClient } from "@tanstack/react-query";
import React from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from "@/components/ui/dialog";
import { SignaturePad } from "@/components/ui/signature-pad";
import type { SessionInfo } from "@/domain/identity/auth/auth.functions";
import { updateBusiness } from "@/lib/api/user.functions";
import { invalidateBusinessSettings } from "@/shared/cache/invalidation";
import { useUploadController } from "@/shared/upload/use-upload-controller";
import { uploadFile } from "@/shared/utils/upload";

export type TBusinessAssetsFormProps = {
	readonly session: SessionInfo | null;
};

export function BusinessAssetsForm({ session }: TBusinessAssetsFormProps) {
	const [signatureDialogOpen, setSignatureDialogOpen] = React.useState(false);
	const queryClient = useQueryClient();
	const { t } = useTranslation();

	const businessMutation = useMutation({
		mutationFn: (data: { logoUrl?: string; signatureUrl?: string }) => {
			const payload: {
				businessId: string;
				name: string;
				logoUrl?: string;
				signatureUrl?: string;
			} = {
				businessId: session?.businessId || "",
				name: session?.businessName || "",
			};
			if (data.logoUrl !== undefined) payload.logoUrl = data.logoUrl;
			if (data.signatureUrl !== undefined)
				payload.signatureUrl = data.signatureUrl;

			return updateBusiness({ data: payload });
		},
		onSuccess: () => {
			invalidateBusinessSettings(queryClient);
		},
	});

	const logoUpload = useUploadController(async (file) => {
		if (!session?.businessId) throw new Error("Missing businessId");
		return {
			url: await uploadFile("public-assets", file, session.businessId),
		};
	});

	const signatureUpload = useUploadController(async (file) => {
		if (!session?.businessId) throw new Error("Missing businessId");
		return {
			url: await uploadFile("public-assets", file, session.businessId),
		};
	});

	const handleLogoUpload = async (file: File) => {
		if (!session?.businessId) return;
		const result = await logoUpload.upload(file);
		if (result.status !== "success") return;
		await businessMutation.mutateAsync({
			logoUrl: result.url,
			...(session.businessSignatureUrl && {
				signatureUrl: session.businessSignatureUrl,
			}),
		});
	};

	const handleSignatureUpload = async (file: File) => {
		if (!session?.businessId) return false;
		const result = await signatureUpload.upload(file);
		if (result.status !== "success") return false;
		await businessMutation.mutateAsync({
			...(session.businessLogoUrl && { logoUrl: session.businessLogoUrl }),
			signatureUrl: result.url,
		});
		return true;
	};

	const handleSaveSignature = async (signature: string) => {
		const arr = signature.split(",");
		const mimeMatch = (arr[0] || "").match(/:(.*?);/);
		const mime = mimeMatch?.[1] || "image/png";
		const bstr = atob(arr[1] || "");
		let n = bstr.length;
		const u8arr = new Uint8Array(n);
		while (n--) {
			u8arr[n] = bstr.charCodeAt(n);
		}
		const file = new File([u8arr], "signature.png", { type: mime });
		const didSave = await handleSignatureUpload(file);
		if (didSave) {
			setSignatureDialogOpen(false);
		}
	};

	return (
		<div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
			{/* Logo Upload */}
			<div className="p-4 border border-neutral-200 rounded-[8px] bg-neutral-50/50">
				<label
					htmlFor="upload-logo"
					className="block text-[12px] font-medium text-neutral-600 uppercase tracking-wide mb-3"
				>
					{t("settings.logo_label")}
				</label>
				<div className="flex items-center gap-4">
					<div className="w-16 h-16 rounded-lg border border-neutral-200 bg-white flex items-center justify-center overflow-hidden flex-shrink-0">
						{session?.businessLogoUrl ? (
							<img
								src={session.businessLogoUrl}
								alt="Logo"
								className="w-full h-full object-contain"
							/>
						) : (
							<span className="text-neutral-400 text-[10px]">No Logo</span>
						)}
					</div>
					<div className="flex-1">
						<input
							id="upload-logo"
							type="file"
							accept="image/*"
							onChange={(e) => {
								if (e.target.files?.[0]) {
									handleLogoUpload(e.target.files[0]);
								}
							}}
							disabled={
								logoUpload.state.status === "uploading" ||
								logoUpload.state.status === "validating" ||
								logoUpload.state.status === "confirming" ||
								!session?.isAdmin
							}
							className="text-[12px] file:mr-3 file:py-1.5 file:px-3 file:rounded-full file:border-0 file:text-[11px] file:font-semibold file:bg-mint-green/10 file:text-mint-green hover:file:bg-mint-green/20 disabled:opacity-50 cursor-pointer"
						/>
						{(logoUpload.state.status === "uploading" ||
							logoUpload.state.status === "validating" ||
							logoUpload.state.status === "confirming") && (
							<span className="block mt-1 text-[11px] text-mint-green/80 animate-pulse">
								Uploading...
							</span>
						)}
					</div>
				</div>
			</div>

			{/* Signature Upload */}
			<div className="p-4 border border-neutral-200 rounded-[8px] bg-neutral-50/50">
				<label
					htmlFor="upload-signature"
					className="block text-[12px] font-medium text-neutral-600 uppercase tracking-wide mb-3"
				>
					{t("settings.signature_label")}
				</label>
				<div className="flex gap-4">
					{session?.businessSignatureUrl ? (
						<div className="w-[120px] h-[60px] rounded-lg border border-neutral-200 bg-white flex items-center justify-center overflow-hidden">
							<img
								src={session.businessSignatureUrl}
								alt="Signature"
								className="w-full h-full object-contain"
							/>
						</div>
					) : (
						<div className="w-[120px] h-[60px] rounded-lg border border-neutral-200 border-dashed bg-neutral-50 flex items-center justify-center">
							<span className="text-[10px] text-neutral-400">
								{t("settings.no_signature")}
							</span>
						</div>
					)}

					<div className="flex flex-col justify-center gap-1">
						<Dialog
							open={signatureDialogOpen}
							onOpenChange={(open) => {
								const busy =
									signatureUpload.state.status === "uploading" ||
									signatureUpload.state.status === "validating" ||
									signatureUpload.state.status === "confirming";
								!busy && setSignatureDialogOpen(open);
							}}
						>
							<DialogTrigger asChild>
								<Button
									variant="outline"
									size="sm"
									disabled={
										!session?.isAdmin ||
										signatureUpload.state.status === "uploading" ||
										signatureUpload.state.status === "validating" ||
										signatureUpload.state.status === "confirming"
									}
									className="h-8 text-[11px]"
								>
									{session?.businessSignatureUrl
										? t("settings.change_signature")
										: t("settings.create_signature")}
								</Button>
							</DialogTrigger>
							<DialogContent className="sm:max-w-[425px]">
								<DialogHeader>
									<DialogTitle>
										{t("settings.create_signature_title")}
									</DialogTitle>
								</DialogHeader>
								<div className="mt-2 relative">
									<div className="text-[12px] text-neutral-500 mb-4">
										{t("settings.signature_hint")}
									</div>
									<SignaturePad
										size="sm"
										onSave={handleSaveSignature}
										className="border border-neutral-200 rounded-lg bg-white"
									/>
									{(signatureUpload.state.status === "uploading" ||
										signatureUpload.state.status === "validating" ||
										signatureUpload.state.status === "confirming") && (
										<div className="absolute inset-0 top-[30px] bg-white/60 backdrop-blur-[1px] flex items-center justify-center rounded-lg z-10 border border-neutral-200">
											<span className="text-[13px] font-medium animate-pulse text-neutral-800">
												{t("common.saving")}
											</span>
										</div>
									)}
								</div>
							</DialogContent>
						</Dialog>
						{(signatureUpload.state.status === "uploading" ||
							signatureUpload.state.status === "validating" ||
							signatureUpload.state.status === "confirming") && (
							<span className="text-[10px] text-mint-green/80 animate-pulse font-medium mt-1">
								{t("common.saving")}
							</span>
						)}
					</div>
				</div>
			</div>
		</div>
	);
}
