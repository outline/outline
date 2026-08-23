import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "@/components/ui";
import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import {
	addGroomingPhoto,
	getGroomingAppointmentDetail,
} from "@/lib/api/grooming.functions";
import { queryKeys } from "@/shared/cache/query-keys";
import { i18n } from "@/shared/i18n/i18n.config";
import { useUploadController } from "@/shared/upload/use-upload-controller";
import { extractErrorMessage } from "@/shared/utils/error";
import { uploadFile } from "@/shared/utils/upload";

export type TGroomingAppointmentDetailProps = {
	readonly appointmentId: string | null;
	readonly onClose: () => void;
};

export const GroomingAppointmentDetail = ({
	appointmentId,
	onClose,
}: TGroomingAppointmentDetailProps) => {
	const { t } = useTranslation();
	const queryClient = useQueryClient();
	const [photoType, setPhotoType] = useState<"before" | "after">("before");
	const [pendingFile, setPendingFile] = useState<File | null>(null);

	const detailQuery = useQuery({
		queryKey: queryKeys.grooming.appointmentDetail(appointmentId ?? ""),
		queryFn: () =>
			getGroomingAppointmentDetail({
				data: { appointmentId: appointmentId ?? "" },
			}),
		enabled: !!appointmentId,
	});

	const photoUpload = useUploadController(async (file) => ({
		url: await uploadFile("grooming-photos", file, appointmentId ?? ""),
	}));

	const addPhotoMutation = useMutation({
		mutationFn: (input: { photoUrl: string; photoType: "before" | "after" }) =>
			addGroomingPhoto({
				data: {
					appointmentId: appointmentId ?? "",
					photoUrl: input.photoUrl,
					photoType: input.photoType,
				},
			}),
		onSuccess: () => {
			toast.success(i18n.t("common.success_title"), {
				description: t(
					"grooming.photo_add_success",
					"Foto berhasil ditambahkan",
				),
			});
			queryClient.invalidateQueries({
				queryKey: queryKeys.grooming.appointmentDetail(appointmentId ?? ""),
			});
			setPendingFile(null);
			photoUpload.reset();
		},
		onError: (error) => {
			toast.error(i18n.t("common.error_title"), {
				description: extractErrorMessage(
					error,
					t("grooming.photo_add_error", "Gagal menambahkan foto"),
				),
			});
		},
	});

	const handleUpload = async () => {
		if (!pendingFile) return;
		const result = await photoUpload.upload(pendingFile);
		if (result.status !== "success") return;
		addPhotoMutation.mutate({ photoUrl: result.url, photoType });
	};

	const isBusy =
		photoUpload.state.status === "uploading" ||
		photoUpload.state.status === "validating" ||
		photoUpload.state.status === "confirming" ||
		addPhotoMutation.isPending;

	return (
		<Dialog open={!!appointmentId} onOpenChange={(open) => !open && onClose()}>
			<DialogContent className="max-w-lg">
				<DialogHeader>
					<DialogTitle>
						{t("grooming.appointment_detail_title", "Detail Appointment")}
					</DialogTitle>
				</DialogHeader>

				{detailQuery.isLoading ? (
					<Skeleton className="h-40 w-full rounded-lg" />
				) : detailQuery.data ? (
					<div className="space-y-4">
						<div className="grid grid-cols-2 gap-4">
							{(["before", "after"] as const).map((type) => {
								const photosOfType = detailQuery.data.photos.filter(
									(p) => p.photoType === type,
								);
								return (
									<div key={type} className="space-y-2">
										<div className="text-[12px] font-bold text-neutral-500 uppercase">
											{type === "before"
												? t("grooming.photo_before", "Sebelum")
												: t("grooming.photo_after", "Sesudah")}
										</div>
										{photosOfType.length === 0 ? (
											<p className="text-[12px] text-neutral-400">
												{t("grooming.no_photos", "Belum ada foto")}
											</p>
										) : (
											<div className="grid grid-cols-2 gap-2">
												{photosOfType.map((photo) => (
													<img
														key={photo.id}
														src={photo.photoUrl}
														alt={type}
														className="aspect-square w-full object-cover rounded-lg border border-neutral-200"
													/>
												))}
											</div>
										)}
									</div>
								);
							})}
						</div>

						<div className="border-t border-neutral-100 pt-4 space-y-3">
							<div className="space-y-2">
								<Label htmlFor="grooming-photo-type">
									{t("grooming.photo_type", "Jenis Foto")}
								</Label>
								<Select
									value={photoType}
									onValueChange={(value) =>
										setPhotoType(value as "before" | "after")
									}
								>
									<SelectTrigger id="grooming-photo-type">
										<SelectValue />
									</SelectTrigger>
									<SelectContent>
										<SelectItem value="before">
											{t("grooming.photo_before", "Sebelum")}
										</SelectItem>
										<SelectItem value="after">
											{t("grooming.photo_after", "Sesudah")}
										</SelectItem>
									</SelectContent>
								</Select>
							</div>
							<div className="space-y-2">
								<Label htmlFor="grooming-photo-file">
									{t("grooming.select_photo", "Pilih Foto")}
								</Label>
								<Input
									id="grooming-photo-file"
									type="file"
									accept="image/jpeg, image/png, image/webp"
									onChange={(e) =>
										setPendingFile(
											e.target.files ? (e.target.files[0] ?? null) : null,
										)
									}
								/>
							</div>
							<Button
								className="w-full"
								onClick={handleUpload}
								disabled={!pendingFile || isBusy}
							>
								{isBusy
									? t("common.uploading", "Mengunggah...")
									: t("grooming.upload_photo", "Unggah Foto")}
							</Button>
						</div>
					</div>
				) : null}
			</DialogContent>
		</Dialog>
	);
};
