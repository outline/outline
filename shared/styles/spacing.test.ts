import spacing, { resolveSpacing, space } from "./spacing";

describe("spacing", () => {
  it("matches the expected scale exactly", () => {
    // Changing any of these values is a visual change to every component
    // using the token and must be reviewed as such.
    expect(spacing).toEqual({
      xxs: 2,
      xs: 4,
      sm: 6,
      md: 8,
      lg: 12,
      xl: 16,
      xxl: 24,
      xxxl: 32,
    });
  });

  it("is strictly ascending", () => {
    const values = Object.values(spacing);
    for (let i = 1; i < values.length; i++) {
      expect(values[i]).toBeGreaterThan(values[i - 1]);
    }
  });
});

describe("resolveSpacing", () => {
  it("resolves token names to pixels", () => {
    expect(resolveSpacing("md")).toBe(8);
    expect(resolveSpacing("xxs")).toBe(2);
  });

  it("passes raw numbers through", () => {
    expect(resolveSpacing(10)).toBe(10);
    expect(resolveSpacing(0)).toBe(0);
  });
});

describe("space", () => {
  it("builds CSS shorthand values from tokens", () => {
    expect(space("md", "xxl", "xxl")).toBe("8px 24px 24px");
  });

  it("renders zero without a unit", () => {
    expect(space(0, "md")).toBe("0 8px");
  });

  it("accepts raw numbers", () => {
    expect(space(10)).toBe("10px");
    expect(space("xs", 10)).toBe("4px 10px");
  });
});
