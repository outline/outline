"use client";

import type React from "react";
import { useTransition } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "@/components/ui";
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

const ActionButton: React.FC<ActionButtonProps> = ({
	children,
	popupContent,
	title,
	onConfirm,
	...props
}) => {
	const [isLoading, startLoading] = useTransition();
	const { t, i18n } = useTranslation();

	const handleConfirm = () => {
		startLoading(async () => {
			const data = await onConfirm();
			if (data.error)
				toast.error(i18n.t("common.error_title"), {
					description: data.message ?? t("common.error"),
				});
			else
				toast.success(i18n.t("common.success_title"), {
					description: data.message ?? t("common.success"),
				});
		});
	};

	return (
		<AlertDialog {...(isLoading ? { open: true } : {})}>
			<AlertDialogTrigger asChild>
				<Button {...props}>{children}</Button>
			</AlertDialogTrigger>
			<AlertDialogContent>
				<AlertDialogHeader>
					<AlertDialogTitle>{title}</AlertDialogTitle>
					<AlertDialogDescription asChild>
						{popupContent}
					</AlertDialogDescription>
				</AlertDialogHeader>
				<AlertDialogFooter>
					<AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel>
					<AlertDialogAction disabled={isLoading} onClick={handleConfirm}>
						{isLoading ? (
							<span className="size-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
						) : (
							t("common.confirm")
						)}
					</AlertDialogAction>
				</AlertDialogFooter>
			</AlertDialogContent>
		</AlertDialog>
	);
};

export interface ActionButtonProps extends React.ComponentProps<typeof Button> {
	/** @public Button content */
	children: React.ReactNode;
	/** @public Content to show in popup */
	popupContent: React.ReactNode;
	/** @public Confirmation dialog title */
	title?: string;
	/** @public Additional CSS class names */
	className?: string;
	/** @public Variant of the button */
	variant?:
		| "default"
		| "destructive"
		| "outline"
		| "secondary"
		| "ghost"
		| "link";
	/** @public Size of the button */
	size?: "default" | "sm" | "lg" | "icon";
	/** @public Whether the button is disabled */
	disabled?: boolean;
	/** @public Function to execute on confirmation */
	onConfirm: () => Promise<{
		message?: string;
		error?: boolean;
	}>;
}

export default ActionButton;
