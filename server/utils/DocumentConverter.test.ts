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

describe("docXToMarkdown", () => {
  describe("tables with Word-style headers", () => {
    it("should detect h1 tags in first row as header", async () => {
      const docxBuffer = Buffer.from(""); 
      
      const html = `<table><tbody><tr><td><h1>Col1</h1></td><td><h1>Col2</h1></td><td><h1>Col3</h1></td></tr><tr><td><p>Data1</p></td><td><p>Data2</p></td><td><p>Data3</p></td></tr></tbody></table>`;
      
      const turndownService = require("./turndown").default;
      const result = turndownService.turndown(html);
      
      const lines = result.trim().split('\n').filter((line: string) => line.trim());
      
      expect(lines[0]).toContain('Col1');
      expect(lines[0]).toContain('Col2');
      expect(lines[1]).toMatch(/\|\s*:?---/); 
      expect(lines[2]).toContain('Data1');
      expect(lines.length).toBe(3);
    });

    it("should detect h2-h6 tags in first row as header", async () => {
      const turndownService = require("./turndown").default;
      
      const html = `<table><tbody><tr><td><h2>Header1</h2></td><td><h3>Header2</h3></td></tr><tr><td><p>Row1</p></td><td><p>Row2</p></td></tr></tbody></table>`;
      const result = turndownService.turndown(html);
      
      const lines = result.trim().split('\n').filter((line: string) => line.trim());
      
      expect(lines[0]).toContain('Header1');
      expect(lines[1]).toMatch(/\|\s*:?---/);
      expect(lines[2]).toContain('Row1');
      expect(lines.length).toBe(3);
    });

    it("should add empty header when no heading tags present", async () => {
      const turndownService = require("./turndown").default;
      
      const html = `<table><tbody><tr><td><p>Data1</p></td><td><p>Data2</p></td></tr><tr><td><p>Data3</p></td><td><p>Data4</p></td></tr></tbody></table>`;
      const result = turndownService.turndown(html);
      
      const lines = result.trim().split('\n').filter((line: string) => line.trim());
      
      expect(lines[0]).toMatch(/\|\s+\|/); 
      expect(lines[1]).toMatch(/\|\s*:?---/);
      expect(lines[2]).toContain('Data1');
      expect(lines.length).toBe(4); 
    });

    it("should respect existing th tags as headers", async () => {
      const turndownService = require("./turndown").default;
      
      const html = `<table><thead><tr><th>Header1</th><th>Header2</th></tr></thead><tbody><tr><td>Data1</td><td>Data2</td></tr></tbody></table>`;
      const result = turndownService.turndown(html);
      
      const lines = result.trim().split('\n').filter((line: string) => line.trim());
      
      expect(lines[0]).toContain('Header1');
      expect(lines[1]).toMatch(/\|\s*:?---/);
      expect(lines[2]).toContain('Data1');
      expect(lines.length).toBe(3);
    });
  });
});
