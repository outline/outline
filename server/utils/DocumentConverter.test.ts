import { DocumentConverter } from "./DocumentConverter";

describe("csvToMarkdown", () => {
  it("should convert csv to markdown with comma", async () => {
    const csv = `name,age
John,25
Jane,24`;

    const markdown = `| name | age |
| --- | --- |
| John | 25 |
| Jane | 24 |
`;

    expect(await DocumentConverter.csvToMarkdown(csv)).toEqual(markdown);
  });

  it("should convert csv to markdown with semicolon", async () => {
    const csv = `name;age
John;25
"Joan ""the bone"", Anne";24`;

    const markdown = `| name | age |
| --- | --- |
| John | 25 |
| Joan "the bone", Anne | 24 |
`;

    expect(await DocumentConverter.csvToMarkdown(csv)).toEqual(markdown);
  });
});
