/* eslint-disable flowtype/require-valid-file-annotation */
import ToriiCatalog from "./ToriiCatalog";

describe("ToriiCatalog", () => {
  const match = Figma.ENABLED[0];
  test("to be enabled on file link", () => {
    expect(
      "https://catalog.toriihq.com/toriihq".match(match)
    ).toBeTruthy();
  });

  test("to not be enabled elsewhere", () => {
    expect("https://www.toriihq.com".match(match)).toBe(null);
    expect("https://www.toriihq.com/product".match(match)).toBe(null);
  });
});
