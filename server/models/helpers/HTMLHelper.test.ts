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
});
