/* eslint-disable flowtype/require-valid-file-annotation */
import Excalidraw from "./Excalidraw";

describe("Excalidraw", () => {
  const match = Excalidraw.ENABLED[0];
  test("to be enabled on shared link", () => {
    expect(
      "https://excalidraw.com/#json=4852506454654976,baUz3ykua6CQZ13UE9dO1A".match(
        match
      )
    ).toBeTruthy();
  });

  test("to not be enabled elsewhere", () => {
    expect("https://excalidraw.com/#json".match(match)).toBe(null);
    expect("https://excalidraw.com".match(match)).toBe(null);
    expect("https://excalidraw.com/blog".match(match)).toBe(null);
    expect("http://excalidraw.com".match(match)).toBe(null);
  });
});
