import { FilterXSS } from "xss";

/**
 * Allowlist sanitizer for the small set of rich-text produced by the
 * TipTap editor behind `long_text` fields (addresses, notes, product
 * descriptions). Only basic block/inline formatting survives; scripts,
 * event handlers, unknown tags, and javascript: hrefs are stripped.
 *
 * Uses js-xss (pure JS) rather than DOMPurify because this runs during
 * SSR on Cloudflare Workers, where jsdom (DOMPurify's server backend) is
 * not available.
 */
const filter = new FilterXSS({
	whiteList: {
		p: [],
		br: [],
		strong: [],
		b: [],
		em: [],
		i: [],
		u: [],
		ul: [],
		ol: [],
		li: [],
		a: ["href", "target", "rel"],
	},
	// Non-allowlisted tags are removed entirely (not escaped)...
	stripIgnoreTag: true,
	// ...and for script/style the tag *body* is removed too, so the code
	// inside a stripped <script> doesn't leak through as text.
	stripIgnoreTagBody: ["script", "style"],
});

export function sanitizeHtml(dirty: string | null | undefined): string {
	if (typeof dirty !== "string") return "";
	return filter.process(dirty);
}
