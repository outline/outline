import Iframe from "./Iframe";

describe("Iframe", () => {
  const match = Iframe.ENABLED[0];

  test("to be enabled on any link", () => {
    expect("https://mywebsite".match(match)).toBeTruthy();
    expect("http://mywebsite".match(match)).toBeTruthy();
  });

  test("to not be enabled elsewhere", () => {
    expect("mywebsite".match(match)).toBe(null);
  });
});
