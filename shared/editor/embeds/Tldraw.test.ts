import Tldraw from "./Tldraw";

describe("Tldraw", () => {
  const match = Tldraw.ENABLED[0];

  test("to not be enabled elsewhere", () => {
    expect("https://wwwwtldraw.com/r/c9d837d74182317".match(match)).toBe(null);
    expect("https://www.tldrawwcom/r/c9d837d74182317".match(match)).toBe(null);
  });
});
