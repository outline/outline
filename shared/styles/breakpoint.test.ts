import { breakpoint } from "./breakpoint";

const render = (rules: ReturnType<ReturnType<typeof breakpoint>>) =>
  rules.join("").replace(/\s+/g, " ").trim();

describe("breakpoint", () => {
  it("should wrap styles in a min-width media query", () => {
    expect(render(breakpoint("tablet")`color: red;`)).toEqual(
      "@media (min-width: 46.0625em) { color: red; }"
    );
  });

  it("should not wrap styles when the minimum is zero", () => {
    expect(render(breakpoint("mobile")`color: red;`)).toEqual("color: red;");
  });

  it("should wrap styles in a range media query", () => {
    expect(render(breakpoint("mobile", "tablet")`color: red;`)).toEqual(
      "@media (min-width: 0em) and (max-width: 46em) { color: red; }"
    );
  });

  it("should keep prop interpolations", () => {
    const rules = breakpoint("tablet")<{ $color: string }>`
      color: ${(props) => props.$color};
    `;
    expect(rules.some((rule) => typeof rule === "function")).toBe(true);
  });
});
