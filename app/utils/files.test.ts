import { extname, toDropzoneAccept } from "./files";

describe("#extname", () => {
  it("should extract file extension from string", () => {
    expect(extname("one.doc")).toBe(".doc");
    expect(extname("one.test.ts")).toBe(".ts");
    expect(extname(".DS_Store")).toBe("");
    expect(extname("directory/one.pdf")).toBe(".pdf");
    expect(extname("../relative/one.doc")).toBe(".doc");
    expect(extname(".hidden/directory/one.txt")).toBe(".txt");
  });
});

describe("#toDropzoneAccept", () => {
  it("should group extensions under the first mime type", () => {
    expect(
      toDropzoneAccept(["image/heic", ".heic", "image/heif", ".heif"])
    ).toEqual({
      "image/heic": [".heic", ".heif"],
      "image/heif": [],
    });
  });
});
