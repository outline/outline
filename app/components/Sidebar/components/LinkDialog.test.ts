import { toLinkUrl } from "./LinkDialog";

describe("toLinkUrl", () => {
  it("should return urls with a protocol", () => {
    expect(toLinkUrl("https://example.com/page")).toBe(
      "https://example.com/page"
    );
    expect(toLinkUrl("  https://example.com  ")).toBe("https://example.com");
  });

  it("should add a protocol to www urls", () => {
    expect(toLinkUrl("www.example.com")).toBe("https://www.example.com");
  });

  it("should not treat titles as urls", () => {
    expect(toLinkUrl("Meeting notes")).toBe(undefined);
    expect(toLinkUrl("example.com")).toBe(undefined);
    expect(toLinkUrl("Notes: https://example.com")).toBe(undefined);
    expect(toLinkUrl("")).toBe(undefined);
  });

  it("should not accept unsafe protocols", () => {
    expect(toLinkUrl("javascript:alert(1)")).toBe(undefined);
  });
});
