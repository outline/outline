/* eslint-disable flowtype/require-valid-file-annotation */
import GoogleColab from "./GoogleColab";

describe("GoogleColab", () => {
  const match = GoogleColab.ENABLED[0];
  test("to be enabled on share link", () => {
    expect(
      "https://colab.research.google.com/drive/1322xJFbaxmjeBy-Y_MTnBxdmUEihdqsu".match(
        match
      )
    ).toBeTruthy();
  });

  test("to not be enabled elsewhere", () => {
    expect("https://colab.research.google.com/".match(match)).toBe(null);
    expect("https://google.com/".match(match)).toBe(null);
  });
});
