import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

describe("password-reset server function validation", () => {
	it("does not compose concrete layers or run Effect directly", async () => {
		const source = await readFile(
			join(process.cwd(), "src/lib/api/password-reset.functions.ts"),
			"utf8",
		);

		expect(source).not.toMatch(/process\.env/);
		expect(source).not.toMatch(/ConsoleEmailAdapterLive/);
		expect(source).not.toMatch(/Effect\.runPromise/);
		expect(source).not.toMatch(/Layer\.provideMerge/);
	});
});
