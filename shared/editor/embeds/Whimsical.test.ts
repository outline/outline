import Whimsical from "./Whimsical";

describe("Whimsical", () => {
  const match = Whimsical.ENABLED[0];

  test("to not be enabled for invalid urls", () => {
    expect("https://whimsicallcom/a-c9d837d74182317".match(match)).toBe(null);
  });
});
