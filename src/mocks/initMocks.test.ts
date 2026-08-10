import { describe, expect, it } from "vitest";
import { MOCK_ENV } from "./initMocks";

describe("the mock environment", () => {
  it("names the app", () => {
    // Pages read env.APP_NAME through i18next interpolation; when it is
    // missing they render the literal "{{appName}}" to the reader.
    expect(MOCK_ENV.APP_NAME).toBeTruthy();
    expect(typeof MOCK_ENV.APP_NAME).toBe("string");
  });

  it("provides everything the app reads off the environment", () => {
    // Keys the React app reaches for; a missing one surfaces as an
    // unsubstituted placeholder or a crash rather than a sensible default.
    const required = [
      "APP_NAME",
      "ENVIRONMENT",
      "URL",
      "COLLABORATION_URL",
      "CDN_URL",
      "DEFAULT_LANGUAGE",
      "MAX_UPLOAD_SIZE",
    ];

    required.forEach((key) => {
      expect(MOCK_ENV[key]).toBeDefined();
    });
  });
});
