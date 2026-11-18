const descriptor = (name: "toWellFormed" | "isWellFormed") =>
  Object.getOwnPropertyDescriptor(String.prototype, name);

const nativeToWellFormed = descriptor("toWellFormed");
const nativeIsWellFormed = descriptor("isWellFormed");

const inputs = [
  "",
  "plain",
  "emoji 🎉 test",
  "x\uD800y",
  "x\uDC00y",
  "\uDC00\uDC00",
  "\uD800𐀀",
  "end\uD83D",
  "\uDE00start",
];

describe("polyfills", () => {
  beforeAll(async () => {
    // @ts-expect-error Removing native methods to exercise the polyfills.
    delete String.prototype.toWellFormed;
    // @ts-expect-error Removing native methods to exercise the polyfills.
    delete String.prototype.isWellFormed;
    await import("./polyfills");
  });

  afterAll(() => {
    if (nativeToWellFormed && nativeIsWellFormed) {
      Object.defineProperty(
        String.prototype,
        "toWellFormed",
        nativeToWellFormed
      );
      Object.defineProperty(
        String.prototype,
        "isWellFormed",
        nativeIsWellFormed
      );
    }
  });

  it("should polyfill String.prototype.toWellFormed", () => {
    expect(descriptor("toWellFormed")?.value).not.toBe(
      nativeToWellFormed?.value
    );
    for (const input of inputs) {
      expect(input.toWellFormed()).toBe(nativeToWellFormed?.value.call(input));
    }
  });

  it("should polyfill String.prototype.isWellFormed", () => {
    expect(descriptor("isWellFormed")?.value).not.toBe(
      nativeIsWellFormed?.value
    );
    for (const input of inputs) {
      expect(input.isWellFormed()).toBe(nativeIsWellFormed?.value.call(input));
    }
  });
});
