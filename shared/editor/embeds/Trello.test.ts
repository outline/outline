import Trello from "./Trello";

describe("Trello", () => {
  const match = Trello.ENABLED[0];

  test("to not be enabled for invalid urls", () => {
    expect("https://trelloocom/c/c9d837d74182317".match(match)).toBe(null);
  });
});
