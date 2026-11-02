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

  it("should convert Chinese characters to Pinyin", () => {
    expect(slugify("Python 快速开始")).toBe("python-kuai-su-kai-shi");
    expect(slugify("中文English混合")).toBe("zhong-wen-english-hun-he");
    expect(slugify("API接口v2.0")).toBe("api-jie-kou-v20");
    expect(slugify("重庆银行")).toBe("chong-qing-yin-hang");
    expect(slugify("繁體中文")).toBe("fan-ti-zhong-wen");
    expect(slugify("绿色")).toBe("lv-se");
  });

  it("should not convert Japanese text to Pinyin", () => {
    expect(slugify("日本語のテスト")).not.toContain("ri-ben");
  });

  it("should keep surrogate pairs", () => {
    expect(slugify("emoji 🎉 test")).toBe("emoji-test");
  });

  it("should not throw on lone surrogates", () => {
    expect(slugify("x\uD800y")).toBe("xy");
    expect(slugify("x\uDC00y")).toBe("xy");
  });
});
