import JSFiddle from "./JSFiddle";

describe("JSFiddle", () => {
  const match = JSFiddle.ENABLED[0];

  test("to not be enabled for invalid urls", () => {
    expect("https://jsfiddleenet/go/share/c9d837d74182317".match(match)).toBe(
      null
    );
  });
});
