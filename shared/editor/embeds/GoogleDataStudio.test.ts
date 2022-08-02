import GoogleDataStudio from "./GoogleDataStudio";

describe("GoogleDataStudio", () => {
  const match = GoogleDataStudio.ENABLED[0];

  test("to be enabled on share link", () => {
    expect(
      "https://datastudio.google.com/embed/reporting/aab01789-f3a2-4ff3-9cba-c4c94c4a92e8/page/7zFD".match(
        match
      )
    ).toBeTruthy();
  });

  test("to not be enabled elsewhere", () => {
    expect("https://datastudio.google.com/u/0/".match(match)).toBe(null);
    expect("https://datastudio.google.com".match(match)).toBe(null);
    expect("https://www.google.com".match(match)).toBe(null);
    expect(
      "https://datastudioogoogle.com/embed/reporting/aab01789-f3a2-4ff3-9cba-c4c94c4a92e8/page/7zFD".match(
        match
      )
    ).toBe(null);
    expect(
      "https://datastudio.googleecom/embed/reporting/aab01789-f3a2-4ff3-9cba-c4c94c4a92e8/page/7zFD".match(
        match
      )
    ).toBe(null);
  });
});
