import { describe, it, expect } from "@jest/globals";
import { isDatabaseUrl } from "./validators";

describe("isDatabaseUrl", () => {
  const defaultOptions = {
    protocols: ["postgres", "postgresql"],
    require_tld: false,
    allow_underscores: true,
  };

  describe("single host URLs", () => {
    it("should accept a valid postgresql URL with single host", () => {
      expect(
        isDatabaseUrl(
          "postgresql://user:password@localhost:5432/database",
          defaultOptions
        )
      ).toBe(true);
    });

    it("should accept a valid postgres URL with single host", () => {
      expect(
        isDatabaseUrl(
          "postgres://user:password@localhost:5432/database",
          defaultOptions
        )
      ).toBe(true);
    });

    it("should accept URL without port", () => {
      expect(
        isDatabaseUrl(
          "postgresql://user:password@localhost/database",
          defaultOptions
        )
      ).toBe(true);
    });

    it("should accept URL without database name", () => {
      expect(
        isDatabaseUrl(
          "postgresql://user:password@localhost:5432",
          defaultOptions
        )
      ).toBe(true);
    });

    it("should accept URL with query parameters", () => {
      expect(
        isDatabaseUrl(
          "postgresql://user:password@localhost:5432/database?sslmode=require",
          defaultOptions
        )
      ).toBe(true);
    });

    it("should accept URL with hostname containing underscores when allowed", () => {
      expect(
        isDatabaseUrl(
          "postgresql://user:password@my_host:5432/database",
          defaultOptions
        )
      ).toBe(true);
    });

    it("should accept URL with hostname containing hyphens", () => {
      expect(
        isDatabaseUrl(
          "postgresql://user:password@my-host:5432/database",
          defaultOptions
        )
      ).toBe(true);
    });
  });

  describe("multi-host URLs", () => {
    it("should accept multi-host URL with ports", () => {
      expect(
        isDatabaseUrl(
          "postgresql://user:password@node1.pg18:5432,node2.pg18:5432,node3.pg18:5432,node4.pg18:5432/database",
          defaultOptions
        )
      ).toBe(true);
    });

    it("should accept multi-host URL without ports", () => {
      expect(
        isDatabaseUrl(
          "postgresql://user:password@node1.pg18,node2.pg18,node3.pg18,node4.pg18/database",
          defaultOptions
        )
      ).toBe(true);
    });

    it("should accept multi-host URL with query parameters", () => {
      expect(
        isDatabaseUrl(
          "postgresql://wiki_user:password@node1.pg18,node2.pg18,node3.pg18,node4.pg18/wiki?target_session_attrs=read-write",
          defaultOptions
        )
      ).toBe(true);
    });

    it("should accept multi-host URL with mixed port specifications", () => {
      expect(
        isDatabaseUrl(
          "postgresql://user:password@host1:5432,host2,host3:5433/database",
          defaultOptions
        )
      ).toBe(true);
    });

    it("should accept multi-host URL with two hosts", () => {
      expect(
        isDatabaseUrl(
          "postgresql://user:password@primary.db,replica.db/mydb",
          defaultOptions
        )
      ).toBe(true);
    });

    it("should accept multi-host URL without auth", () => {
      expect(
        isDatabaseUrl(
          "postgresql://host1:5432,host2:5432/database",
          defaultOptions
        )
      ).toBe(true);
    });
  });

  describe("invalid URLs", () => {
    it("should reject empty string", () => {
      expect(isDatabaseUrl("", defaultOptions)).toBe(false);
    });

    it("should reject null", () => {
      expect(isDatabaseUrl(null as any, defaultOptions)).toBe(false);
    });

    it("should reject undefined", () => {
      expect(isDatabaseUrl(undefined as any, defaultOptions)).toBe(false);
    });

    it("should reject URL with invalid protocol", () => {
      expect(
        isDatabaseUrl(
          "mysql://user:password@localhost/database",
          defaultOptions
        )
      ).toBe(false);
    });

    it("should reject URL without protocol", () => {
      expect(
        isDatabaseUrl("user:password@localhost/database", defaultOptions)
      ).toBe(false);
    });

    it("should reject URL with empty host", () => {
      expect(isDatabaseUrl("postgresql:///database", defaultOptions)).toBe(
        false
      );
    });

    it("should reject URL with invalid port", () => {
      expect(
        isDatabaseUrl(
          "postgresql://user:password@localhost:99999/database",
          defaultOptions
        )
      ).toBe(false);
    });

    it("should reject URL with invalid port (non-numeric)", () => {
      expect(
        isDatabaseUrl(
          "postgresql://user:password@localhost:abc/database",
          defaultOptions
        )
      ).toBe(false);
    });

    it("should reject multi-host URL with empty host", () => {
      expect(
        isDatabaseUrl(
          "postgresql://user:password@host1,,host2/database",
          defaultOptions
        )
      ).toBe(false);
    });

    it("should reject URL with underscores when not allowed", () => {
      expect(
        isDatabaseUrl("postgresql://user:password@my_host:5432/database", {
          ...defaultOptions,
          allow_underscores: false,
        })
      ).toBe(false);
    });
  });

  describe("protocol validation", () => {
    it("should reject URL when protocol not in allowed list", () => {
      expect(
        isDatabaseUrl("postgresql://localhost/db", {
          ...defaultOptions,
          protocols: ["postgres"],
        })
      ).toBe(false);
    });

    it("should accept URL when protocol in custom allowed list", () => {
      expect(
        isDatabaseUrl("postgres://localhost/db", {
          ...defaultOptions,
          protocols: ["postgres"],
        })
      ).toBe(true);
    });
  });

  describe("TLD requirement", () => {
    it("should accept hostname with TLD when required", () => {
      expect(
        isDatabaseUrl("postgresql://user:password@host.example.com/database", {
          ...defaultOptions,
          require_tld: true,
        })
      ).toBe(true);
    });

    it("should reject hostname without TLD when required", () => {
      expect(
        isDatabaseUrl("postgresql://user:password@localhost/database", {
          ...defaultOptions,
          require_tld: true,
        })
      ).toBe(false);
    });

    it("should accept hostname without TLD when not required", () => {
      expect(
        isDatabaseUrl("postgresql://user:password@localhost/database", {
          ...defaultOptions,
          require_tld: false,
        })
      ).toBe(true);
    });
  });
});
