import Grist from "./Grist";

describe("Grist", () => {
  const match = Grist.ENABLED[0];

  test("to be enabled on share link", () => {
    expect(
      "https://templates.getgrist.com/doc/afterschool-program/p/2?embed=true".match(
        match
      )
    ).toBeTruthy();
    expect(
      "http://grist.my.host.com/o/docs/doc/new~5cCkr6CtMArdA62ohSy5xB/p/1?embed=true".match(
        match
      )
    ).toBeTruthy();
  });

  test("to not be enabled elsewhere", () => {
    expect(
      "https://templates.getgrist.com/doc/afterschool-program".match(match)
    ).toBe(null);
    expect(
      "https://templates.getgrist.com/doc/afterschool-program?embed=true".match(
        match
      )
    ).toBe(null);
    expect(
      "https://templates.getgrist.com/doc/afterschool-program/p/?embed=true".match(
        match
      )
    ).toBe(null);
  });
});
