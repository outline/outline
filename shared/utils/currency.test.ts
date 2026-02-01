import { isCurrency, parseCurrency } from "./currency";

describe("isCurrency", () => {
  it("recognizes USD format", () => {
    expect(isCurrency("$100")).toBe(true);
    expect(isCurrency("$400")).toBe(true);
    expect(isCurrency("$3000")).toBe(true);
    expect(isCurrency("$1,234.56")).toBe(true);
    expect(isCurrency("$1234.56")).toBe(true);
  });

  it("recognizes Euro format", () => {
    expect(isCurrency("€100")).toBe(true);
    expect(isCurrency("100€")).toBe(true);
    expect(isCurrency("€1.234,56")).toBe(true);
    expect(isCurrency("1.234,56€")).toBe(true);
  });

  it("recognizes other currency symbols", () => {
    expect(isCurrency("£500")).toBe(true);
    expect(isCurrency("¥1000")).toBe(true);
    expect(isCurrency("₹50,000")).toBe(true);
    expect(isCurrency("R$1.234,56")).toBe(true);
  });

  it("recognizes negative currency values", () => {
    expect(isCurrency("-$100")).toBe(true);
    expect(isCurrency("($100)")).toBe(true);
    expect(isCurrency("-€50")).toBe(true);
  });

  it("returns false for non-currency values", () => {
    expect(isCurrency("100")).toBe(false);
    expect(isCurrency("hello")).toBe(false);
    expect(isCurrency("")).toBe(false);
    expect(isCurrency("1,234.56")).toBe(false);
  });
});

describe("parseCurrency", () => {
  it("parses USD format", () => {
    expect(parseCurrency("$100")).toBe(100);
    expect(parseCurrency("$400")).toBe(400);
    expect(parseCurrency("$3000")).toBe(3000);
    expect(parseCurrency("$1,234.56")).toBe(1234.56);
    expect(parseCurrency("$1234.56")).toBe(1234.56);
    expect(parseCurrency("$0.99")).toBe(0.99);
  });

  it("parses Euro format (European style)", () => {
    expect(parseCurrency("€100")).toBe(100);
    expect(parseCurrency("100€")).toBe(100);
    expect(parseCurrency("€1.234,56")).toBe(1234.56);
    expect(parseCurrency("1.234,56€")).toBe(1234.56);
    expect(parseCurrency("€1234,56")).toBe(1234.56);
  });

  it("parses other currencies", () => {
    expect(parseCurrency("£500")).toBe(500);
    expect(parseCurrency("¥1000")).toBe(1000);
    expect(parseCurrency("₹50,000")).toBe(50000);
    expect(parseCurrency("R$1.234,56")).toBe(1234.56);
  });

  it("parses negative values", () => {
    expect(parseCurrency("-$100")).toBe(-100);
    expect(parseCurrency("($100)")).toBe(-100);
    expect(parseCurrency("-€50")).toBe(-50);
    expect(parseCurrency("($1,234.56)")).toBe(-1234.56);
  });

  it("handles whitespace", () => {
    expect(parseCurrency("  $100  ")).toBe(100);
    expect(parseCurrency("$ 100")).toBe(100);
    expect(parseCurrency("100 €")).toBe(100);
  });

  it("returns null for invalid values", () => {
    expect(parseCurrency("")).toBe(null);
    expect(parseCurrency("hello")).toBe(null);
    expect(parseCurrency("abc$123")).toBe(null);
  });

  it("handles large numbers", () => {
    expect(parseCurrency("$1,000,000.00")).toBe(1000000);
    expect(parseCurrency("€1.000.000,00")).toBe(1000000);
  });

  it("sorts currency values correctly", () => {
    const values = ["$400", "$3000", "$100", "$50"];
    const sorted = values.sort((a, b) => {
      const aVal = parseCurrency(a);
      const bVal = parseCurrency(b);
      if (aVal !== null && bVal !== null) {
        return aVal - bVal;
      }
      return 0;
    });
    expect(sorted).toEqual(["$50", "$100", "$400", "$3000"]);
  });

  it("sorts currency values in descending order correctly", () => {
    const values = ["$400", "$3000", "$100", "$50"];
    const sorted = values.sort((a, b) => {
      const aVal = parseCurrency(a);
      const bVal = parseCurrency(b);
      if (aVal !== null && bVal !== null) {
        return bVal - aVal; // descending
      }
      return 0;
    });
    expect(sorted).toEqual(["$3000", "$400", "$100", "$50"]);
  });
});
