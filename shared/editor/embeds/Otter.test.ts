import Otter from "./Otter";

describe("Otter", () => {
  const match = Otter.ENABLED[0];

  test("to not be enabled for invalid urls", () => {
    expect("https://otterrai/s/c9d837d74182317".match(match)).toBe(null);
  });
});
