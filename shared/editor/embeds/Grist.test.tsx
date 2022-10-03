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
      "https://docs.getgrist.com/sg5V93LuAije/Untitled-document/p/22?embed=true".match(
        match
      )
    ).toBeTruthy();
    expect(
      "https://templates.getgrist.com/doc/afterschool-program".match(match)
    ).toBeTruthy();
  });

  test("to not be enabled elsewhere", () => {
    // Self hosted not yet supported
    expect(
      "http://grist.my.host.com/o/docs/doc/new~5cCkr6CtMArdA62ohSy5xB/p/1?embed=true".match(
        match
      )
    ).toBe(null);
    expect(
      "https://my.get.grist.com/doc/afterschool-program?embed=true".match(match)
    ).toBe(null);
  });
});
