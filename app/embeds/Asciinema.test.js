/* eslint-disable flowtype/require-valid-file-annotation */
import Asciinema from "./Asciinema";

describe("Asciinema", () => {
  const match = Asciinema.ENABLED[0];
  test("to be enabled on asciinema link", () => {
    expect("https://asciinema.org/a/239367".match(match)).toBeTruthy();

    expect(
      "https://asciinema.org/a/573txBhIK4BQscE9DCTIZXyIg".match(match)
    ).toBeTruthy();
  });

  test("to not be enabled elsewhere", () => {
    expect("https://asciinema.org/a/@@@-(".match(match)).toBe(null);
  });
});
