import { CSVHelper } from "./csv";

describe("CSVHelper", () => {
  describe("sanitizeValue", () => {
    it("should leave a value unchanged", () => {
      const value = "Hello, World!";
      const sanitizedValue = CSVHelper.sanitizeValue(value);
      expect(sanitizedValue).toBe(value);
    });

    it("should escape formula trigger character", () => {
      expect(CSVHelper.sanitizeValue("@1x2")).toBe(`'@1x2`);
      expect(CSVHelper.sanitizeValue("=1x2")).toBe(`'=1x2`);
      expect(CSVHelper.sanitizeValue("＝1x2")).toBe(`'＝1x2`);
      expect(CSVHelper.sanitizeValue("≠1x2")).toBe(`'≠1x2`);
      expect(CSVHelper.sanitizeValue("+1x2")).toBe(`'+1x2`);
      expect(CSVHelper.sanitizeValue("∑1x2")).toBe(`'∑1x2`);
    });

    it("should remove control characters", () => {
      expect(CSVHelper.sanitizeValue("\u00011x2")).toBe(`1x2`);
    });

    it("should remove zero-width characters", () => {
      expect(CSVHelper.sanitizeValue("\u200B1x2")).toBe(`1x2`);
    });

    it("should remove whitespace characters", () => {
      expect(CSVHelper.sanitizeValue("\u200B1x2")).toBe(`1x2`);
    });
  });

  describe("escapeCSVField", () => {
    it("should escape fields with commas", () => {
      expect(CSVHelper.escapeCSVField("Doe, John")).toBe('"Doe, John"');
    });

    it("should escape fields with quotes", () => {
      expect(CSVHelper.escapeCSVField('John "Johnny" Doe')).toBe(
        '"John ""Johnny"" Doe"'
      );
    });

    it("should escape fields with newlines", () => {
      expect(CSVHelper.escapeCSVField("John\nDoe")).toBe('"John\nDoe"');
    });

    it("should handle null values", () => {
      expect(CSVHelper.escapeCSVField(null)).toBe("");
    });

    it("should handle undefined values", () => {
      expect(CSVHelper.escapeCSVField(undefined)).toBe("");
    });

    it("should handle empty strings", () => {
      expect(CSVHelper.escapeCSVField("")).toBe("");
    });

    it("should leave simple values unchanged", () => {
      expect(CSVHelper.escapeCSVField("John")).toBe("John");
    });
  });

  describe("convertToCSV", () => {
    it("should convert simple data to CSV", () => {
      const data = [
        { id: "1", name: "John Doe", email: "john@example.com" },
        { id: "2", name: "Jane Smith", email: "jane@example.com" },
      ];
      const headers: (keyof (typeof data)[0])[] = ["id", "name", "email"];
      const result = CSVHelper.convertToCSV(data, headers);

      expect(result).toBe(
        "id,name,email\n1,John Doe,john@example.com\n2,Jane Smith,jane@example.com"
      );
    });

    it("should escape fields with commas", () => {
      const data = [{ id: "1", name: "Doe, John", email: "john@example.com" }];
      const headers: (keyof (typeof data)[0])[] = ["id", "name", "email"];
      const result = CSVHelper.convertToCSV(data, headers);

      expect(result).toBe('id,name,email\n1,"Doe, John",john@example.com');
    });

    it("should escape fields with quotes", () => {
      const data = [
        { id: "1", name: 'John "Johnny" Doe', email: "john@example.com" },
      ];
      const headers: (keyof (typeof data)[0])[] = ["id", "name", "email"];
      const result = CSVHelper.convertToCSV(data, headers);

      expect(result).toBe(
        'id,name,email\n1,"John ""Johnny"" Doe",john@example.com'
      );
    });

    it("should escape fields with newlines", () => {
      const data = [{ id: "1", name: "John\nDoe", email: "john@example.com" }];
      const headers: (keyof (typeof data)[0])[] = ["id", "name", "email"];
      const result = CSVHelper.convertToCSV(data, headers);

      expect(result).toBe('id,name,email\n1,"John\nDoe",john@example.com');
    });

    it("should handle empty values", () => {
      const data = [{ id: "1", name: "", email: null as unknown as string }];
      const headers: (keyof (typeof data)[0])[] = ["id", "name", "email"];
      const result = CSVHelper.convertToCSV(data, headers);

      expect(result).toBe("id,name,email\n1,,");
    });

    it("should handle undefined values", () => {
      const data = [
        {
          id: "1",
          name: undefined as unknown as string,
          email: "john@example.com",
        },
      ];
      const headers: (keyof (typeof data)[0])[] = ["id", "name", "email"];
      const result = CSVHelper.convertToCSV(data, headers);

      expect(result).toBe("id,name,email\n1,,john@example.com");
    });

    it("should handle empty data array", () => {
      const data: { id: string; name: string }[] = [];
      const headers: (keyof (typeof data)[0])[] = ["id", "name"];
      const result = CSVHelper.convertToCSV(data, headers);

      expect(result).toBe("id,name\n");
    });

    it("should handle different data types", () => {
      const data = [{ id: 1, active: true, date: new Date("2024-01-01") }];
      const headers: (keyof (typeof data)[0])[] = ["id", "active", "date"];
      const result = CSVHelper.convertToCSV(data, headers);

      // Should convert all types to strings
      expect(result).toContain("1");
      expect(result).toContain("true");
      expect(result).toContain("2024");
    });

    it("should sanitize formula trigger characters", () => {
      const data = [{ id: "1", name: "=John", email: "+john@example.com" }];
      const headers: (keyof (typeof data)[0])[] = ["id", "name", "email"];
      const result = CSVHelper.convertToCSV(data, headers);

      expect(result).toBe("id,name,email\n1,'=John,'+john@example.com");
    });
  });
});
