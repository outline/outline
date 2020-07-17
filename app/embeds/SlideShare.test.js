/* eslint-disable flowtype/require-valid-file-annotation */
import SlideShare from "./SlideShare";

describe("SlideShare", () => {
  const match = SlideShare.ENABLED[0];
  test("to be enabled on slide link", () => {
    expect(
      "https://www.slideshare.net/adamnash/be-a-great-product-leader-amplify-oct-2019".match(
        match
      )
    ).toBeTruthy();
  });

  test("to not be enabled elsewhere", () => {
    expect("https://slideshare.net".match(match)).toBe(null);
    expect("https://www.slideshare.net/adamnash".match(match)).toBe(null);
  });
});
