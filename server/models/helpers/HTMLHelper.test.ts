import HTMLHelper from "./HTMLHelper";

describe("HTMLHelper", () => {
  const document = `<html>
  <head>
    <style>h1 { color:blue; }</style>
  </head>
  <body>
    <h1>Big Text</h1>
  </body>
</html>`;
  describe("inlineCSS", () => {
    it("should inline CSS from style tags", async () => {
      const result = await HTMLHelper.inlineCSS(document);
      expect(result).toBe(`<html><head>
    
  </head>
  <body>
    <h1 style="color: blue;">Big Text</h1>
  
</body></html>`);
    });
    it("should initialize once", async () => {
      const first = await HTMLHelper.inlineCSS(document);
      const second = await HTMLHelper.inlineCSS(document);
      expect(first).toBe(second);
    });
  });

  describe("inlineImage", () => {
    const redirectUrl = "/api/attachments.redirect?id=123";
    const buffer = Buffer.from("small image");

    it("should inline a small single-referenced image as a data URI", () => {
      const html = `<p><img src="${redirectUrl}"></p>`;
      const result = HTMLHelper.inlineImage(
        html,
        redirectUrl,
        "image/png",
        buffer
      );
      expect(result).toBe(
        `<p><img src="data:image/png;base64,${buffer.toString("base64")}"></p>`
      );
    });

    it("should not inline non-image attachments", () => {
      const html = `<a href="${redirectUrl}">file</a>`;
      const result = HTMLHelper.inlineImage(
        html,
        redirectUrl,
        "application/pdf",
        buffer
      );
      expect(result).toBeNull();
    });

    it("should not inline images larger than the maximum size", () => {
      const html = `<p><img src="${redirectUrl}"></p>`;
      const large = Buffer.alloc(HTMLHelper.maxInlineImageSize + 1);
      const result = HTMLHelper.inlineImage(
        html,
        redirectUrl,
        "image/png",
        large
      );
      expect(result).toBeNull();
    });

    it("should not inline images referenced more than once", () => {
      const html = `<p><img src="${redirectUrl}"><img src="${redirectUrl}"></p>`;
      const result = HTMLHelper.inlineImage(
        html,
        redirectUrl,
        "image/png",
        buffer
      );
      expect(result).toBeNull();
    });

    it("should not inline an empty buffer", () => {
      const html = `<p><img src="${redirectUrl}"></p>`;
      const result = HTMLHelper.inlineImage(
        html,
        redirectUrl,
        "image/png",
        Buffer.from("")
      );
      expect(result).toBeNull();
    });
  });
});
