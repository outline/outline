import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import {
	GalleryAddLinear as AddPhoto,
	GalleryLinear,
	TrashBinMinimalisticLinear as Trash,
} from "solar-icon-set";
import { toast } from "@/components/ui";
import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import {
	addBoardingDailyPhoto,
	getBoardingDailyPhotos,
} from "@/lib/api/boardings.functions";
import { QUERY_POLICY } from "@/shared/cache/cache-policy";
import { queryKeys } from "@/shared/cache/query-keys";
import { useLanguage } from "@/shared/i18n";
import { i18n } from "@/shared/i18n/i18n.config";
import { useUploadController } from "@/shared/upload/use-upload-controller";
import { extractErrorMessage } from "@/shared/utils/error";
import { formatDate } from "@/shared/utils/format";
import { uploadFile } from "@/shared/utils/upload";
import { EmptyState } from "@/ui";

export const BoardingDailyPhotos = ({ boardingId }: { boardingId: string }) => {
	const { t } = useTranslation();
	const { language } = useLanguage();
	const queryClient = useQueryClient();
	const fileInputRef = useRef<HTMLInputElement>(null);

	const [isAddOpen, setIsAddOpen] = useState(false);
	const [newPhoto, setNewPhoto] = useState<{
		file: File | null;
		caption: string;
	}>({
		file: null,
		caption: "",
	});
	const photoUpload = useUploadController(async (file) => ({
		url: await uploadFile("boarding-photos", file, boardingId),
	}));

	const { data: photos = [], isLoading } = useQuery({
		queryKey: queryKeys.boardings.photos(boardingId),
		staleTime: QUERY_POLICY.operational.staleTime,
		gcTime: QUERY_POLICY.operational.gcTime,
		queryFn: () => getBoardingDailyPhotos({ data: boardingId }),
	});

	const addPhotoMutation = useMutation({
		mutationFn: (data: { photoUrl: string; caption: string }) =>
			addBoardingDailyPhoto({
				data: {
					boardingId,
					photoUrl: data.photoUrl,
					caption: data.caption,
					takenDate: new Date(),
				},
			}),
		onSuccess: () => {
			toast.success(i18n.t("common.success_title"), {
				description: t("toast.boarding.photo_add_success"),
			});
			queryClient.invalidateQueries({
				queryKey: queryKeys.boardings.photos(boardingId),
			});
			setIsAddOpen(false);
			setNewPhoto({ file: null, caption: "" });
		},
		onError: (error) => {
			toast.error(i18n.t("common.error_title"), {
				description: extractErrorMessage(
					error,
					t("toast.boarding.photo_add_error"),
				),
			});
		},
	});

	const handleUploadAndSave = async () => {
		if (!newPhoto.file) return;

		const result = await photoUpload.upload(newPhoto.file);

		if (result.status !== "success") {
			if (result.status === "error") {
				toast.error(i18n.t("common.error_title"), {
					description: result.message,
				});
			}
			return;
		}

		addPhotoMutation.mutate({
			photoUrl: result.url,
			caption: newPhoto.caption,
		});
	};

	return (
		<div className="bg-white rounded-2xl border border-neutral-200 overflow-hidden flex flex-col">
			<div className="p-6 border-b border-neutral-100 flex items-center justify-between">
				<div>
					<h3 className="text-lg font-bold text-neutral-900 tracking-tight">
						{t("boarding.daily_photos_title")}
					</h3>
					<p className="text-sm text-neutral-500 mt-1">
						{t("boarding.daily_photos_desc")}
					</p>
				</div>
				<Button
					size="sm"
					className="rounded-xl"
					onClick={() => setIsAddOpen(true)}
				>
					<AddPhoto className="w-4 h-4 mr-2" /> {t("boarding.upload_photo")}
				</Button>
			</div>

			<div className="p-6">
				{isLoading ? (
					<div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
						{[1, 2, 3].map((i) => (
							<Skeleton key={i} className="aspect-square w-full rounded-xl" />
						))}
					</div>
				) : photos.length === 0 ? (
					<EmptyState
						title={t("boarding.no_photos_title")}
						description={t("boarding.no_photos_desc")}
						icon={GalleryLinear}
					/>
				) : (
					<div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
						{photos.map((photo) => (
							<div
								key={photo.id}
								className="group relative rounded-xl border border-neutral-200 overflow-hidden bg-white shadow-sm hover:shadow-md transition-all"
							>
								<div className="aspect-square w-full overflow-hidden bg-neutral-100 relative">
									<img
										src={photo.photoUrl}
										alt={photo.caption || undefined}
										className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
									/>
									<div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-4">
										<Button
											size="icon"
											variant="destructive"
											className="h-8 w-8 rounded-lg ml-auto shadow-sm"
										>
											<Trash className="w-4 h-4" />
										</Button>
									</div>
								</div>
								<div className="p-4">
									<div className="text-[12px] font-bold text-neutral-500 mb-1">
										{formatDate(new Date(photo.takenDate), language, {
											dateStyle: "long",
										})}
									</div>
									<p className="text-[13px] text-neutral-800 line-clamp-2 leading-relaxed">
										{photo.caption}
									</p>
								</div>
							</div>
						))}
					</div>
				)}
			</div>

			<Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>{t("boarding.upload_daily_photo_title")}</DialogTitle>
						<DialogDescription>
							{t("boarding.upload_daily_photo_desc")}
						</DialogDescription>
					</DialogHeader>
					<div className="space-y-4 py-4">
						<div className="space-y-2">
							<Label>{t("boarding.select_photo")}</Label>
							<Input
								type="file"
								accept="image/jpeg, image/png, image/webp"
								ref={fileInputRef}
								onChange={(e) =>
									setNewPhoto({
										...newPhoto,
										file: e.target.files ? (e.target.files[0] ?? null) : null,
									})
								}
							/>
						</div>
						<div className="space-y-2">
							<Label>{t("boarding.caption_label")}</Label>
							<Textarea
								placeholder={t("boarding.caption_placeholder")}
								value={newPhoto.caption}
								onChange={(e) =>
									setNewPhoto({ ...newPhoto, caption: e.target.value })
								}
							/>
						</div>
					</div>
					<DialogFooter>
						<Button variant="outline" onClick={() => setIsAddOpen(false)}>
							{t("common.cancel")}
						</Button>
						<Button
							onClick={handleUploadAndSave}
							disabled={
								!newPhoto.file ||
								photoUpload.state.status === "uploading" ||
								photoUpload.state.status === "validating" ||
								photoUpload.state.status === "confirming" ||
								addPhotoMutation.isPending
							}
						>
							{photoUpload.state.status === "uploading" ||
							photoUpload.state.status === "validating" ||
							photoUpload.state.status === "confirming" ||
							addPhotoMutation.isPending
								? t("common.uploading")
								: t("boarding.upload_save")}
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>
		</div>
	);
};
