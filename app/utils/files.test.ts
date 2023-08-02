import { extname } from "./files";

describe("#extname", () => {
  test("should extract file extension from string", () => {
    expect(extname("one.doc")).toBe(".doc");
    expect(extname("one.test.ts")).toBe(".ts");
    expect(extname(".DS_Store")).toBe("");
    expect(extname("directory/one.pdf")).toBe(".pdf");
    expect(extname("../relative/one.doc")).toBe(".doc");
    expect(extname(".hidden/directory/one.txt")).toBe(".txt");
  });
});
