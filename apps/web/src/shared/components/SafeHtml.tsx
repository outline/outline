import { sanitizeHtml } from "@/shared/utils/sanitize-html";

type SafeHtmlProps = {
	readonly html: string | null | undefined;
	readonly className?: string;
	readonly fallback?: string;
};

/**
 * Renders user-provided rich-text HTML after allowlist sanitization.
 * Always use this instead of a raw `dangerouslySetInnerHTML` for any
 * value that originated from user input (addresses, notes, descriptions).
 */
export function SafeHtml({ html, className, fallback = "-" }: SafeHtmlProps) {
	const raw = html && html.trim() ? html : fallback;
	return (
		<div
			className={className}
			// biome-ignore lint/security/noDangerouslySetInnerHtml: input is allowlist-sanitized by sanitizeHtml (js-xss)
			dangerouslySetInnerHTML={{ __html: sanitizeHtml(raw) }}
		/>
	);
}
