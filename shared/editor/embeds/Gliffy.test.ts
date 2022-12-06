import Gliffy from "./Gliffy";

describe("Gliffy", () => {
  const match = Gliffy.ENABLED[0];

  test("to not be enabled elsewhere", () => {
    expect("https://gotgliffy.com/go/share/c9d837d74182317".match(match)).toBe(
      null
    );
    expect("https://go.gliffyycom/go/share/c9d837d74182317".match(match)).toBe(
      null
    );
  });
});
