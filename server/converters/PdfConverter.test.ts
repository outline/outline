import { PdfConverter } from "./PdfConverter";

const processPdf = vi.hoisted(() => vi.fn());

vi.mock("@firecrawl/pdf-inspector", () => ({ processPdf }));

/** Stand in for a PDF, the parser itself is mocked in this file. */
const buffer = Buffer.from("%PDF-1.4");

describe("PdfConverter", () => {
  beforeEach(() => {
    processPdf.mockReset();
  });

  it("should convert underline tags to underline markdown", async () => {
    processPdf.mockReturnValue({
      markdown: "<u>BILLING, AUTHORIZATION AND CYCLE RESERVATIONS</u>\n",
    });

    const result = await PdfConverter.toMarkdown(buffer);

    expect(result).toEqual(
      "__BILLING, AUTHORIZATION AND CYCLE RESERVATIONS__\n"
    );
  });

  it("should move whitespace outside of the underline delimiters", async () => {
    processPdf.mockReturnValue({ markdown: "Signed by <u> Jane Doe </u>." });

    const result = await PdfConverter.toMarkdown(buffer);

    expect(result).toEqual("Signed by  __Jane Doe__ .");
  });

  it("should remove unpaired and empty underline tags", async () => {
    processPdf.mockReturnValue({
      markdown: "An <u>unclosed tag\nand an empty <u></u> one</u>",
    });

    const result = await PdfConverter.toMarkdown(buffer);

    expect(result).toEqual("An unclosed tag\nand an empty  one");
  });

  it("should throw when the file is not a Buffer", async () => {
    await expect(PdfConverter.toMarkdown("not a buffer")).rejects.toThrow(
      /Unsupported PDF file/
    );
  });

  it("should throw when the pdf holds no text", async () => {
    processPdf.mockReturnValue({ markdown: "  \n" });

    await expect(PdfConverter.toMarkdown(buffer)).rejects.toThrow(/no text/);
  });

  it("should throw when the parser fails", async () => {
    processPdf.mockImplementation(() => {
      throw new Error("Not a PDF: file appears to be plain text");
    });

    await expect(PdfConverter.toMarkdown(buffer)).rejects.toThrow(
      /error parsing the PDF file: Not a PDF/
    );
  });
});
