import { toast } from "@/components/ui";
import { extractErrorMessage } from "@/shared/utils/error";

export function showErrorToast(
	error: unknown,
	title: string,
	fallback?: string,
) {
	toast.error(title, {
		description: extractErrorMessage(error, fallback),
	});
}

export function showSuccessToast(title: string, description?: string) {
	toast.success(title, { description });
}
