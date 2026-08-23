import { useState } from "react";
import { useTranslation } from "react-i18next";
import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
	AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";

export type TConfirmDialogProps = {
	/** Trigger element */
	trigger?: React.ReactNode;
	/** Dialog open state (controlled) */
	open?: boolean;
	/** Callback when open state changes */
	onOpenChange?: (open: boolean) => void;
	/** Title text */
	title: string;
	/** Description text */
	description?: string;
	/** Confirm button text */
	confirmText?: string;
	/** Cancel button text */
	cancelText?: string;
	/** Whether confirm button is loading */
	isLoading?: boolean;
	/** Callback when confirmed */
	onConfirm: () => void;
	/** Variant for confirm button */
	variant?: "destructive" | "default";
	/** Additional trigger className */
	triggerClassName?: string;
	/** Children content */
	children?: React.ReactNode;
};

/**
 * Reusable confirmation dialog for dangerous actions.
 * Use for delete, remove, and other destructive operations.
 *
 * @example
 * ```tsx
 *<ConfirmDialog
 *   trigger={<Button>Delete</Button>}
 *   title="Delete Product"
 *   description="Are you sure you want to delete this product? This action cannot be undone."
 *   onConfirm={() => deleteProduct(id)}
 * />
 * ```
 */
export const ConfirmDialog = ({
	trigger,
	open,
	onOpenChange,
	title,
	description,
	confirmText,
	cancelText,
	isLoading = false,
	onConfirm,
	variant = "destructive",
	triggerClassName,
	children,
}: TConfirmDialogProps) => {
	const { t } = useTranslation();
	const [internalOpen, setInternalOpen] = useState(false);

	const isControlled = open !== undefined;
	const isOpen = isControlled ? open : internalOpen;

	const handleOpenChange = (newOpen: boolean) => {
		if (isControlled) {
			onOpenChange?.(newOpen);
		} else {
			setInternalOpen(newOpen);
		}
	};

	const handleConfirm = () => {
		onConfirm();
		// Don't auto-close - let the parent handle it based on loading state
	};

	return (
		<AlertDialog open={isOpen} onOpenChange={handleOpenChange}>
			{trigger && (
				<AlertDialogTrigger asChild>
					{typeof trigger === "string" ? (
						<Button
							variant={variant === "destructive" ? "destructive" : "default"}
							className={triggerClassName}
						>
							{trigger}
						</Button>
					) : (
						<div className={triggerClassName}>{trigger}</div>
					)}
				</AlertDialogTrigger>
			)}
			{children && <AlertDialogTrigger asChild>{children}</AlertDialogTrigger>}
			<AlertDialogContent>
				<AlertDialogHeader>
					<AlertDialogTitle>{title}</AlertDialogTitle>
					{description && (
						<AlertDialogDescription>{description}</AlertDialogDescription>
					)}
				</AlertDialogHeader>
				<AlertDialogFooter>
					<AlertDialogCancel disabled={isLoading}>
						{cancelText ?? t("common.cancel", "Batal")}
					</AlertDialogCancel>
					<AlertDialogAction
						onClick={handleConfirm}
						disabled={isLoading}
						className={
							variant === "destructive"
								? "bg-red-600 hover:bg-red-700 text-white"
								: undefined
						}
					>
						{isLoading ? (
							<span className="flex items-center gap-2">
								<span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
								{t("common.processing", "Memproses...")}
							</span>
						) : (
							(confirmText ?? t("common.confirm", "Konfirmasi"))
						)}
					</AlertDialogAction>
				</AlertDialogFooter>
			</AlertDialogContent>
		</AlertDialog>
	);
};

/**
 * Inline confirm dialog for use within lists or tables.
 * Wraps content with a confirmation trigger.
 */
export type TInlineConfirmProps = {
	/** The element that triggers the confirmation */
	children: React.ReactNode;
	/** Title text */
	title: string;
	/** Description text */
	description?: string;
	/** Confirm button text */
	confirmText?: string;
	/** Callback when confirmed */
	onConfirm: () => void | Promise<void>;
	/** Whether confirm is loading */
	isLoading?: boolean;
	/** Variant for confirm button */
	variant?: "destructive" | "default";
};

export const InlineConfirm = ({
	children,
	title,
	description,
	confirmText,
	onConfirm,
	isLoading = false,
	variant = "destructive",
}: TInlineConfirmProps) => {
	const [open, setOpen] = useState(false);

	const handleConfirm = async () => {
		await onConfirm();
		setOpen(false);
	};

	return (
		<ConfirmDialog
			open={open}
			onOpenChange={setOpen}
			title={title}
			{...(description !== undefined ? { description } : {})}
			{...(confirmText !== undefined ? { confirmText } : {})}
			onConfirm={handleConfirm}
			isLoading={isLoading}
			variant={variant}
		>
			{children}
		</ConfirmDialog>
	);
};
