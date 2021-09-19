/* eslint-disable flowtype/require-valid-file-annotation */
import Spotify from "./Spotify";

describe("Spotify", () => {
  const match = Spotify.ENABLED[0];
  test("to be enabled on song link", () => {
    expect(
      "https://open.spotify.com/track/29G1ScCUhgjgI0H72qN4DE?si=DxjEUxV2Tjmk6pSVckPDRg".match(
        match
      )
    ).toBeTruthy();
  });

  test("to be enabled on playlist link", () => {
    expect(
      "https://open.spotify.com/user/spotify/playlist/29G1ScCUhgjgI0H72qN4DE?si=DxjEUxV2Tjmk6pSVckPDRg".match(
        match
      )
    ).toBeTruthy();
  });

  test("to not be enabled elsewhere", () => {
    expect("https://spotify.com".match(match)).toBe(null);
    expect("https://open.spotify.com".match(match)).toBe(null);
    expect("https://www.spotify.com".match(match)).toBe(null);
  });
});
