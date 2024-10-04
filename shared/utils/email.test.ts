import { parseEmail } from "./email";

describe("parseEmail", () => {
  it("should correctly parse email", () => {
    expect(parseEmail("tom@example.com")).toEqual({
      local: "tom",
      domain: "example.com",
    });
    expect(parseEmail("tom.m@example.com")).toEqual({
      local: "tom.m",
      domain: "example.com",
    });
    expect(parseEmail("tom@subdomain.domain.com")).toEqual({
      local: "tom",
      domain: "subdomain.domain.com",
    });
  });

  it("should throw error for invalid email", () => {
    expect(() => parseEmail("")).toThrow();
    expect(() => parseEmail("invalid")).toThrow();
    expect(() => parseEmail("invalid@")).toThrow();
  });
});
