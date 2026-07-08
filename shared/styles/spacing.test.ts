import spacing, { resolveSpacing } from "./spacing";

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
