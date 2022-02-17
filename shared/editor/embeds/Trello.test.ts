import Trello from "./Trello";

describe("Trello", () => {
  const match = Trello.ENABLED[0];

  test("to be enabled on valid board link", () => {
    expect(
      "https://trello.com/b/board".match(
        match
      )
    ).toBeTruthy();
  });
  test("to be enabled on valid card link", () => {
    expect(
      "https://trello.com/c/card".match(
        match
      )
    ).toBeTruthy();
  });

  test("to not be enabled elsewhere", () => {
    expect("https://trello.com/invalid".match(match)).toBe(null);
  });
});
