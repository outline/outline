import GoogleDrawings from "./GoogleDrawings";

describe("GoogleDrawings", () => {
  const match = GoogleDrawings.ENABLED[0];

  test("to be enabled on share link", () => {
    expect(
      "https://docs.google.com/drawings/d/1zELtJ4HSCnjGCGSoCgqGe3F8p6o7R8Vjk8MDR6dKf-U/edit".match(
        match
      )
    ).toBeTruthy();
    expect(
      "https://docs.google.com/drawings/d/1zELtJ4HSCnjGCGSoCgqGe3F8p6o7R8Vjk8MDR6dKf-U/edit?usp=sharing".match(
        match
      )
    ).toBeTruthy();
  });

  test("to not be enabled elsewhere", () => {
    expect(
      "https://docs.google.com/drawings/d/e/2PACF-1vRtzIzEWN6svSrIYZq-kq2XZEN6WaOFXHbPKRLXNOFRlxLIdJg0Vo6RfretGqs9SzD-fUazLeS594Kw/pub?w=960&h=720".match(
        match
      )
    ).toBe(null);
    expect("https://docs.google.com/drawings".match(match)).toBe(null);
    expect("https://docs.google.com".match(match)).toBe(null);
    expect("https://www.google.com".match(match)).toBe(null);
    expect(
      "https://docssgoogle.com/drawings/d/1zDMtJ4HSCnjGCGSoCgqGe3F8p6o7R8Vjk8MDR6dKf-U/edit".match(
        match
      )
    ).toBe(null);
    expect(
      "https://docs.googleecom/drawings/d/1zDMtJ4HSCnjGCGSoCgqGe3F8p6o7R8Vjk8MDR6dKf-U/edit".match(
        match
      )
    ).toBe(null);
  });
});
