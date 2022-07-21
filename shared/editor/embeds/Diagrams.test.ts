import Diagrams from "./Diagrams";

describe("Diagrams", () => {
  const match = Diagrams.ENABLED[0];

  test("to be enabled on viewer link", () => {
    expect(
      "https://viewer.diagrams.net/?target=blank&nav=1#ABCDefgh_A12345-6789".match(
        match
      )
    ).toBeTruthy();
  });

  test("to not be enabled on the proxy path", () => {
    expect("https://app.diagrams.net/proxy?url=malicious".match(match)).toBe(
      null
    );
  });

  test("to not be enabled elsewhere", () => {
    expect("https://app.diagrams.net/#ABCDefgh_A12345-6789".match(match)).toBe(
      null
    );
  });
});
