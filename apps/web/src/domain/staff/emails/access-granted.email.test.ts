import { describe, expect, it } from "vitest";
import { buildAccessGrantedEmail } from "./access-granted.email";

describe("buildAccessGrantedEmail", () => {
	it("names the branch and role in the body", () => {
		const result = buildAccessGrantedEmail("Cabang Pramuka", "kasir");
		expect(result.text).toContain("Cabang Pramuka");
		expect(result.text).toContain("kasir");
		expect(result.subject.length).toBeGreaterThan(0);
	});
});
