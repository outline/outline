import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { Skeleton } from "@/components/ui/skeleton";
import { getBoardingById } from "@/lib/api/boardings.functions";
import { BoardingEditForm } from "../BoardingEditForm/BoardingEditForm";

export type TEditBoardingPanelProps = {
	readonly boardingId: string;
	readonly onSuccess?: () => void;
	readonly onCancel?: () => void;
	readonly onDirtyChange?: (isDirty: boolean) => void;
};

export function EditBoardingPanel({
	boardingId,
	onSuccess,
	onCancel,
	onDirtyChange,
}: TEditBoardingPanelProps) {
	const { t } = useTranslation();
	const {
		data: boarding,
		isLoading: isLoadingBoarding,
		isError,
	} = useQuery({
		queryKey: ["boarding", boardingId],
		queryFn: () => getBoardingById({ data: boardingId }),
		enabled: !!boardingId,
	});

	if (isLoadingBoarding) {
		return (
			<div className="space-y-4 p-1">
				<Skeleton className="h-5 w-40 rounded-lg" />
				{[1, 2, 3, 4, 5].map((i) => (
					<Skeleton key={i} className="h-11 w-full rounded-lg" />
				))}
			</div>
		);
	}

	if (isError || !boarding) {
		return (
			<div className="flex items-center justify-center h-64">
				<div className="text-[13px] text-red-500">
					{t("boarding.error_details")}
				</div>
			</div>
		);
	}

	return (
		<BoardingEditForm
			boardingId={boardingId}
			initialData={boarding}
			onSuccess={onSuccess}
			onCancel={onCancel}
			onDirtyChange={onDirtyChange}
		/>
	);
}
