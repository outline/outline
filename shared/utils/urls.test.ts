import { urlRegex } from "./urls";

describe("#urlRegex", () => {
  it("should return undefined for invalid urls", () => {
    expect(urlRegex(undefined)).toBeUndefined();
    expect(urlRegex(null)).toBeUndefined();
    expect(urlRegex("invalid url!")).toBeUndefined();
  });

  it("should return corresponding regex otherwise", () => {
    const regex = urlRegex("https://docs.google.com");
    expect(regex?.source).toBe(/https:\/\/docs\.google\.com/.source);
  });
});
