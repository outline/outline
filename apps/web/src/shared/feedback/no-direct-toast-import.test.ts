import { readFileSync } from "node:fs";
import { globSync } from "tinyglobby";
import { describe, expect, it } from "vitest";

/**
 * Toast/error feedback convention guard.
 *
 * Per `docs/tech-architecture.md` and `AGENTS.md`:
 *   - All UI toasts come through `import { toast } from "@/components/ui"`.
 *     The wrapper at `@/components/ui` is the only thing that talks to the
 *     underlying `goey-toast` library.
 *   - Direct `sonner` is forbidden.
 *   - Direct `goey-toast` is forbidden outside the wrapper layer.
 *   - Catch / onError paths must use `extractErrorMessage(err, fallback)`.
 *
 * This test scans every `.tsx` and `.ts` file under `src/` and fails if
 * the convention is violated. Add new allow-listed wrapper files to
 * `ALLOWED_WRAPPER_PATHS` only when introducing a new wrapper module.
 */

const ALLOWED_WRAPPER_PATHS = new Set<string>([
	"src/components/ui/goey-toaster.tsx",
	"src/components/ui/dedup-toast.tsx",
]);

const FORBIDDEN_PATTERNS = [
	{
		pattern: /from\s+["']sonner["']/,
		reason:
			"import 'sonner' directly; use `import { toast } from '@/components/ui'` instead",
	},
	{
		pattern: /from\s+["']goey-toast["']/,
		reason:
			"import 'goey-toast' directly; route through '@/components/ui' wrappers",
	},
	{
		pattern: /from\s+["']@\/components\/ui\/goey-toaster["']/,
		reason:
			"import from '@/components/ui/goey-toaster' directly; use `import { toast } from '@/components/ui'` instead",
	},
] as const;

const FILES = globSync(["src/**/*.{ts,tsx}"], {
	ignore: ["**/*.test.ts", "**/*.test.tsx"],
});

describe("toast and error convention", () => {
	it("does not bypass the @/components/ui toast wrapper", () => {
		const violations = FILES.flatMap((file: string) =>
			FORBIDDEN_PATTERNS.flatMap(
				({ pattern, reason }: { pattern: RegExp; reason: string }) =>
					pattern.test(readFileSync(file, "utf8"))
						? [`${file}: ${reason}`]
						: [],
			),
		).filter((entry: string) => {
			const filePath = entry.split(":")[0] ?? "";
			return !ALLOWED_WRAPPER_PATHS.has(filePath);
		});

		expect(violations).toEqual([]);
	});
});
