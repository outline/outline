import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import ScrollArea from "@/components/ui/scroll-area";
import type { TOrderDto } from "@/domain/order/order.dto";
import { getDrafts } from "@/lib/api/orders.functions";
import { formatCurrency } from "@/shared/utils/format";
import { Button } from "@/ui";

export type TDraftsModalProps = {
	readonly isOpen: boolean;
	readonly onClose: () => void;
	readonly onSelect: (draft: TOrderDto) => void;
};

export const DraftsModal = ({
	isOpen,
	onClose,
	onSelect,
}: TDraftsModalProps) => {
	const { data: drafts = [], isLoading } = useQuery({
		queryKey: ["pos", "drafts"],
		queryFn: async () => await getDrafts(),
		enabled: isOpen,
	});

	return (
		<Dialog open={isOpen} onOpenChange={onClose}>
			<DialogContent className="max-w-xl">
				<DialogHeader>
					<DialogTitle>Open Bills / Drafts</DialogTitle>
				</DialogHeader>

				<ScrollArea className="h-[400px] mt-4 pr-4">
					{isLoading ? (
						<div className="flex justify-center py-8 text-neutral-500">
							Loading...
						</div>
					) : drafts.length === 0 ? (
						<div className="flex justify-center py-8 text-neutral-500">
							Tidak ada draft tersimpan.
						</div>
					) : (
						<div className="space-y-3">
							{drafts.map((draft) => (
								<div
									key={draft.id}
									className="p-4 rounded-xl border border-neutral-200 bg-white flex justify-between items-center"
								>
									<div>
										<div className="font-medium text-neutral-900">
											{draft.items.length} item(s) -{" "}
											{formatCurrency(draft.totalAmount, "id")}
										</div>
										<div className="text-xs text-neutral-500 mt-1">
											{format(new Date(draft.createdAt), "dd MMM yyyy, HH:mm")}
										</div>
									</div>
									<Button
										variant="outline"
										size="sm"
										onClick={() => onSelect(draft)}
									>
										Buka
									</Button>
								</div>
							))}
						</div>
					)}
				</ScrollArea>
			</DialogContent>
		</Dialog>
	);
};
