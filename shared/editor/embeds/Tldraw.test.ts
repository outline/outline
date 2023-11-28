import Tldraw from "./Tldraw";

describe("Tldraw", () => {
  const match = Tldraw.ENABLED[0];

  test("to be enabled on share link", () => {
    expect(
      "https://beta.tldraw.com/r/v2_c_r5WVtGaktE99D3wyFFsoL".match(match)
    ).toBeTruthy();
  });

  test("to be enabled for snapshot link", () => {
    expect(
      "https://beta.tldraw.com/s/v2_c_r5WVtGaktE99D3wyFFsoL".match(match)
    ).toBeTruthy();
  });

  test("to be enabled for read only urls having v", () => {
    expect(
      "https://www.tldraw.com/v/-2VIEZVwrbtdNq0Pmfpf2?viewport=-608%2C-549%2C1998%2C1943&page=page%3AWd7DfjA-igxOMso931W_S".match(
        match
      )
    ).toBeTruthy();
  });

  test("to not be enabled elsewhere", () => {
    expect("https://wwww.tldraw.com/r/c9d837d74182317".match(match)).toBe(null);
    expect("https://wwwwtldraw.com/r/c9d837d74182317".match(match)).toBe(null);
    expect("https://www.tldrawwcom/r/c9d837d74182317".match(match)).toBe(null);
    expect(
      "https://beta.tldraw.com/e/v2_c_r5WVtGaktE99D3wyFFsoL".match(match)
    ).toBe(null);
  });
});
