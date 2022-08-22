import { escapeRegExp } from "./escape";

describe("#escapeRegExp", () => {
  it("should escape dots and forward slashes", () => {
    expect(escapeRegExp("https://docs.google.com")).toBe(
      "https:\\/\\/docs\\.google\\.com"
    );
  });

  it("should escape dash and forward slashes", () => {
    expect(escapeRegExp("https://my-site.com")).toBe(
      "https:\\/\\/my\\-site\\.com"
    );
  });
});
