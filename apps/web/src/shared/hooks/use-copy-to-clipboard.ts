import { useCallback } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "@/components/ui";
import { i18n } from "@/shared/i18n/i18n.config";

/**
 * Hook to copy text to clipboard and show a toast notification
 */
export const useCopyToClipboard = () => {
	const { t } = useTranslation();

	const copy = useCallback(
		async (text: string, description?: string) => {
			if (!navigator.clipboard) {
				console.warn("Clipboard API not available");
				return false;
			}

			try {
				await navigator.clipboard.writeText(text);
				toast.success(t("common.success"), {
					description: description || t("common.copy"),
				});
				return true;
			} catch (error) {
				console.error("Failed to copy!", error);
				toast.error(i18n.t("common.copy_error_title"), {
					description: i18n.t("common.copy_error_desc"),
				});
				return false;
			}
		},
		[t],
	);

	return copy;
};
