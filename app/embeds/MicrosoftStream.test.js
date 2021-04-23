/* eslint-disable flowtype/require-valid-file-annotation */
import MicrosoftStream from "./MicrosoftStream";

describe("MicrosoftStream", () => {
  const match = MicrosoftStream.ENABLED[0];
  test("to be enabled on video link", () => {
    expect(
      "https://web.microsoftstream.com/video/92c36847-60a1-4beb-8529-388dfe13531c".match(match)
    ).toBeTruthy();
  });

  test("to be enabled on embed link", () => {
    expect(
      "https://web.microsoftstream.com/embed/video/92c36847-60a1-4beb-8529-388dfe13531c".match(match)
    ).toBeTruthy();
  });
});
