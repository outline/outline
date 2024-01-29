import { decodeURIComponentSafe } from "./urls";

describe("decodeURIComponentSafe", () => {
  test("to handle % symbols", () => {
    expect(decodeURIComponentSafe("%")).toBe("%");
    expect(decodeURIComponentSafe("%25")).toBe("%");
  });

  test("to correctly account for encoded symbols", () => {
    expect(decodeURIComponentSafe("%7D")).toBe("}");
    expect(decodeURIComponentSafe("%2F")).toBe("/");
  });
});
