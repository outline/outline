import slugify from "./slugify";

describe("slugify", () => {
  it("should convert text to a kebab-case slug", () => {
    expect(slugify("Hello World")).toBe("hello-world");
  });

  it("should remove periods", () => {
    expect(slugify("Release v1.2.3")).toBe("release-v123");
  });

  it("should transliterate non-latin characters", () => {
    expect(slugify("Café résumé")).toBe("cafe-resume");
    expect(slugify("Привет мир")).toBe("privet-mir");
    expect(slugify("θεός")).toBe("theos");
  });

  it("should keep surrogate pairs", () => {
    expect(slugify("emoji 🎉 test")).toBe("emoji-test");
  });

  it("should not throw on lone surrogates", () => {
    expect(slugify("x\uD800y")).toBe("xy");
    expect(slugify("x\uDC00y")).toBe("xy");
  });
});
