/* eslint-disable flowtype/require-valid-file-annotation */
import YouTube from "./YouTube";

describe("YouTube", () => {
  const match = YouTube.ENABLED[0];
  test("to be enabled on video link", () => {
    expect(
      "https://www.youtube.com/watch?v=dQw4w9WgXcQ".match(match)
    ).toBeTruthy();
  });

  test("to be enabled on embed link", () => {
    expect(
      "https://www.youtube.com/embed?v=dQw4w9WgXcQ".match(match)
    ).toBeTruthy();
  });

  test("to be enabled on shortlink", () => {
    expect("https://youtu.be/dQw4w9WgXcQ".match(match)).toBeTruthy();
  });

  test("to not be enabled elsewhere", () => {
    expect("https://youtu.be".match(match)).toBe(null);
    expect("https://youtube.com".match(match)).toBe(null);
    expect("https://www.youtube.com".match(match)).toBe(null);
    expect("https://www.youtube.com/logout".match(match)).toBe(null);
    expect("https://www.youtube.com/feed/subscriptions".match(match)).toBe(
      null
    );
  });
});
