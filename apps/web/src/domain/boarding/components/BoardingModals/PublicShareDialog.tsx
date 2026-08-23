import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import type { SessionInfo } from "@/domain/identity/auth/auth.functions";

export type TPublicShareDialogProps = {
	readonly isOpen: boolean;
	readonly onOpenChange: (open: boolean) => void;
	readonly session: SessionInfo | null;
	readonly publicLink: string;
	readonly onCopy: (text: string) => void;
};

export function PublicShareDialog({
	isOpen,
	onOpenChange,
	session,
	publicLink,
	onCopy,
}: TPublicShareDialogProps) {
	const { t } = useTranslation();

	return (
		<Dialog open={isOpen} onOpenChange={onOpenChange}>
			<DialogContent className="sm:max-w-md">
				<DialogHeader>
					<DialogTitle>{t("boarding.public_link")}</DialogTitle>
				</DialogHeader>
				<div className="space-y-4 py-4">
					{!session ? (
						<div className="space-y-4">
							<Skeleton className="h-4 w-full rounded-lg" />
							<div className="flex items-center gap-2">
								<Skeleton className="h-9 flex-1 rounded-lg" />
								<Skeleton className="h-9 w-20 rounded-lg" />
							</div>
							<Skeleton className="h-9 w-full rounded-lg" />
						</div>
					) : !publicLink ? (
						<div className="p-4 bg-rose-50 text-rose-600 rounded-lg text-sm border border-rose-100">
							{t("boarding.share_error")}
						</div>
					) : (
						<>
							<p className="text-sm text-neutral-500">
								{t("boarding.share_description")}
							</p>
							<div className="flex items-center gap-2">
								<Input readOnly value={publicLink} className="bg-neutral-50" />
								<Button onClick={() => onCopy(publicLink)}>
									{t("common.copy")}
								</Button>
							</div>
							<div className="pt-2">
								<Button variant="outline" className="w-full" asChild>
									<a href={publicLink} target="_blank" rel="noreferrer">
										{t("common.view")}
									</a>
								</Button>
							</div>
						</>
					)}
				</div>
			</DialogContent>
		</Dialog>
	);
}
