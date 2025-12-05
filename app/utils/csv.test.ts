import { convertToCSV } from "./csv";

describe("convertToCSV", () => {
  it("should convert simple data to CSV", () => {
    const data = [
      { id: "1", name: "John Doe", email: "john@example.com" },
      { id: "2", name: "Jane Smith", email: "jane@example.com" },
    ];
    const headers = ["id", "name", "email"] as const;
    const result = convertToCSV(data, headers);
    
    expect(result).toBe(
      'id,name,email\n1,John Doe,john@example.com\n2,Jane Smith,jane@example.com'
    );
  });

  it("should escape fields with commas", () => {
    const data = [
      { id: "1", name: "Doe, John", email: "john@example.com" },
    ];
    const headers = ["id", "name", "email"] as const;
    const result = convertToCSV(data, headers);
    
    expect(result).toBe(
      'id,name,email\n1,"Doe, John",john@example.com'
    );
  });

  it("should escape fields with quotes", () => {
    const data = [
      { id: "1", name: 'John "Johnny" Doe', email: "john@example.com" },
    ];
    const headers = ["id", "name", "email"] as const;
    const result = convertToCSV(data, headers);
    
    expect(result).toBe(
      'id,name,email\n1,"John ""Johnny"" Doe",john@example.com'
    );
  });

  it("should escape fields with newlines", () => {
    const data = [
      { id: "1", name: "John\nDoe", email: "john@example.com" },
    ];
    const headers = ["id", "name", "email"] as const;
    const result = convertToCSV(data, headers);
    
    expect(result).toBe(
      'id,name,email\n1,"John\nDoe",john@example.com'
    );
  });

  it("should handle empty values", () => {
    const data = [
      { id: "1", name: "", email: null as unknown as string },
    ];
    const headers = ["id", "name", "email"] as const;
    const result = convertToCSV(data, headers);
    
    expect(result).toBe(
      'id,name,email\n1,,'
    );
  });

  it("should handle undefined values", () => {
    const data = [
      { id: "1", name: undefined as unknown as string, email: "john@example.com" },
    ];
    const headers = ["id", "name", "email"] as const;
    const result = convertToCSV(data, headers);
    
    expect(result).toBe(
      'id,name,email\n1,,john@example.com'
    );
  });

  it("should handle empty data array", () => {
    const data: { id: string; name: string }[] = [];
    const headers = ["id", "name"] as const;
    const result = convertToCSV(data, headers);
    
    expect(result).toBe('id,name\n');
  });

  it("should handle different data types", () => {
    const data = [
      { id: 1, active: true, date: new Date("2024-01-01") },
    ];
    const headers = ["id", "active", "date"] as const;
    const result = convertToCSV(data, headers);
    
    // Should convert all types to strings
    expect(result).toContain("1");
    expect(result).toContain("true");
    expect(result).toContain("2024");
  });
});
