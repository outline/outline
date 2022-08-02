import Gist from "./Gist";

describe("Gist", () => {
  const match = Gist.ENABLED[0];

  test("to be enabled on gist link", () => {
    expect(
      "https://gist.github.com/wmertens/0b4fd66ca7055fd290ecc4b9d95271a9".match(
        match
      )
    ).toBeTruthy();
    expect(
      "https://gist.github.com/n3n/eb51ada6308b539d388c8ff97711adfa".match(
        match
      )
    ).toBeTruthy();
    expect(
      "https://gist.github.com/ShubhanjanMedhi-dev/900c9c14093611898a4a085938bb90d9".match(
        match
      )
    ).toBeTruthy();
  });

  test("to not be enabled elsewhere", () => {
    expect(
      "https://gistigithub.com/n3n/eb51ada6308b539d388c8ff97711adfa".match(
        match
      )
    ).toBe(null);
    expect(
      "https://gist.githubbcom/n3n/eb51ada6308b539d388c8ff97711adfa".match(
        match
      )
    ).toBe(null);
    expect("https://gist.github.com/tommoor".match(match)).toBe(null);
  });
});
