import GoogleLookerStudio from "./GoogleLookerStudio";

describe("GoogleLookerStudio", () => {
  const match = GoogleLookerStudio.ENABLED[0];

  test("to be enabled on share link", () => {
    expect(
      "https://lookerstudio.google.com/embed/reporting/aab01789-f3a2-4ff3-9cba-c4c94c4a92e8/page/7zFD".match(
        match
      )
    ).toBeTruthy();
    expect(
      "https://datastudio.google.com/embed/reporting/aab01789-f3a2-4ff3-9cba-c4c94c4a92e8/page/7zFD".match(
        match
      )
    ).toBeTruthy();
  });

  test("to not be enabled elsewhere", () => {
    expect("https://lookerstudio.google.com/u/0/".match(match)).toBe(null);
    expect("https://lookerstudio.google.com".match(match)).toBe(null);
    expect("https://www.google.com".match(match)).toBe(null);
    expect(
      "https://lookerstudioogoogle.com/embed/reporting/aab01789-f3a2-4ff3-9cba-c4c94c4a92e8/page/7zFD".match(
        match
      )
    ).toBe(null);
    expect(
      "https://lookerstudio.googleecom/embed/reporting/aab01789-f3a2-4ff3-9cba-c4c94c4a92e8/page/7zFD".match(
        match
      )
    ).toBe(null);
  });
});
