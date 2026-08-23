import * as React from "react";
import { useTranslation } from "react-i18next";
import { Drawer as DrawerPrimitive } from "vaul";
import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { cn } from "@/shared/utils";

type TRightSidebarProps = {
	readonly isOpen: boolean;
	readonly onClose: () => void;
	readonly title: string;
	readonly description?: string;
	readonly children: React.ReactNode;
	readonly footer?: React.ReactNode;
	readonly hasChanges?: boolean;
	readonly onDiscard?: () => void;
	readonly className?: string;
	readonly width?: "sm" | "md" | "lg" | "half" | "full";
	readonly hideHeader?: boolean;
};

const WIDTH_MAP = {
	sm: "sm:max-w-sm",
	md: "sm:max-w-md",
	lg: "sm:max-w-lg",
	half: "sm:!w-[50vw] sm:max-w-[50vw]",
	full: "sm:!w-[calc(100vw-1.5rem)] sm:max-w-[calc(100vw-1.5rem)] sm:!left-3",
} as const;

export function RightSidebar({
	isOpen,
	onClose,
	title,
	description,
	children,
	footer,
	hasChanges = false,
	onDiscard,
	className,
	width = "md",
	hideHeader = false,
}: TRightSidebarProps) {
	const [showGuard, setShowGuard] = React.useState(false);
	const { t } = useTranslation();

	const handleClose = React.useCallback(() => {
		if (hasChanges) {
			setShowGuard(true);
			return;
		}
		onClose();
	}, [hasChanges, onClose]);

	const handleDiscardAndClose = React.useCallback(() => {
		setShowGuard(false);
		onDiscard?.();
		onClose();
	}, [onDiscard, onClose]);

	const handleKeepEditing = React.useCallback(() => {
		setShowGuard(false);
	}, []);

	return (
		<>
			<DrawerPrimitive.Root
				direction="right"
				open={isOpen}
				onOpenChange={(open) => {
					if (!open) handleClose();
				}}
			>
				<DrawerPrimitive.Portal>
					<DrawerPrimitive.Overlay className="fixed inset-0 z-50 bg-black/40 backdrop-blur-[2px]" />
					<DrawerPrimitive.Content
						className={cn(
							"flex flex-col overflow-hidden p-0 outline-none",
							"!fixed !top-3 !bottom-3 !right-3 !h-[calc(100%-1.5rem)] w-full sm:w-[400px] max-w-[calc(100vw-1.5rem)] !rounded-lg border bg-background shadow-2xl z-50",
							WIDTH_MAP[width],
							className,
						)}
					>
						{!hideHeader && (
							<div className="px-5 py-3.5 items-center shrink-0 bg-background text-left border-b">
								<DrawerPrimitive.Title className="text-base font-semibold">
									{title}
								</DrawerPrimitive.Title>
							</div>
						)}
						<div
							className="flex-1 overflow-y-auto px-5 py-5"
							data-vaul-no-drag
							data-radix-scroll-area-viewport
						>
							{description ? (
								<DrawerPrimitive.Description className="text-sm text-muted-foreground mb-5">
									{description}
								</DrawerPrimitive.Description>
							) : (
								<DrawerPrimitive.Description className="sr-only">
									{title} details
								</DrawerPrimitive.Description>
							)}
							{children}
						</div>
						{footer && (
							<div className="px-6 py-4 border-t shrink-0 bg-background sticky bottom-0">
								{footer}
							</div>
						)}
					</DrawerPrimitive.Content>
				</DrawerPrimitive.Portal>
			</DrawerPrimitive.Root>

			<AlertDialog open={showGuard} onOpenChange={setShowGuard}>
				<AlertDialogContent className="rounded-lg border-none shadow-2xl">
					<AlertDialogHeader>
						<AlertDialogTitle>
							{t("common.unsaved_changes", "Perubahan Belum Disimpan")}
						</AlertDialogTitle>
						<AlertDialogDescription>
							{t(
								"common.unsaved_changes_desc",
								"Anda memiliki perubahan yang belum disimpan. Apakah Anda yakin ingin membuang perubahan dan menutup panel?",
							)}
						</AlertDialogDescription>
					</AlertDialogHeader>
					<AlertDialogFooter className="mt-6 gap-3">
						<AlertDialogCancel
							onClick={handleKeepEditing}
							className="h-11 rounded-lg border-neutral-200 text-[13px] font-medium mt-0"
						>
							{t("common.keep_editing", "Lanjut Mengedit")}
						</AlertDialogCancel>
						<AlertDialogAction
							onClick={handleDiscardAndClose}
							className="h-11 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-[13px] font-bold shadow-lg shadow-rose-200"
						>
							{t("common.discard_changes", "Buang Perubahan")}
						</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>
		</>
	);
}
