import { normalizeSidebarContext } from "./SidebarContext";

describe("normalizeSidebarContext", () => {
  test("maps the legacy notebook context to the canonical value", () => {
    expect(normalizeSidebarContext("collections")).toBe("notebooks");
  });

  test("preserves current contexts", () => {
    expect(normalizeSidebarContext("notebooks")).toBe("notebooks");
    expect(normalizeSidebarContext("shared")).toBe("shared");
    expect(normalizeSidebarContext(undefined)).toBeUndefined();
  });
});
