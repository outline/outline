/* eslint-disable flowtype/require-valid-file-annotation */
import Vimeo from "./Vimeo";

describe("Vimeo", () => {
  const match = Vimeo.ENABLED[0];
  test("to be enabled on video link", () => {
    expect("https://vimeo.com/265045525".match(match)).toBeTruthy();
  });

  test("to not be enabled elsewhere", () => {
    expect("https://vimeo.com".match(match)).toBe(null);
    expect("https://www.vimeo.com".match(match)).toBe(null);
    expect("https://vimeo.com/upgrade".match(match)).toBe(null);
    expect("https://vimeo.com/features/video-marketing".match(match)).toBe(
      null
    );
  });
});
