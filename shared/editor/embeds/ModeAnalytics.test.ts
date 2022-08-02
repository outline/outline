import ModeAnalytics from "./ModeAnalytics";

describe("ModeAnalytics", () => {
  const match = ModeAnalytics.ENABLED[0];

  test("to be enabled on report link", () => {
    expect(
      "https://modeanalytics.com/outline/reports/5aca06064f56".match(match)
    ).toBeTruthy();
  });

  test("to not be enabled elsewhere", () => {
    expect("https://modeanalytics.com".match(match)).toBe(null);
    expect("https://modeanalytics.com/outline".match(match)).toBe(null);
    expect("https://modeanalytics.com/outline/reports".match(match)).toBe(null);
    expect(
      "https://modeanalyticsscom/outline/reports/5aca06064f56".match(match)
    ).toBe(null);
    expect(
      "https://wwwwmodeanalytics.com/outline/reports/5aca06064f56".match(match)
    ).toBe(null);
  });
});
