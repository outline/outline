import {
  serializeFilename,
  deserializeFilename,
  trimFilenameAndExt,
  stringByteLength,
} from "./fs";

describe("serializeFilename", () => {
  it("should serialize forward slashes", () => {
    expect(serializeFilename(`/`)).toBe("%2F");
    expect(serializeFilename(`this / and / this`)).toBe(
      "this %2F and %2F this"
    );
  });

  it("should serialize back slashes", () => {
    expect(serializeFilename(`\\`)).toBe("%5C");
    expect(serializeFilename(`this \\ and \\ this`)).toBe(
      "this %5C and %5C this"
    );
  });
});

describe("deserializeFilename", () => {
  it("should deserialize forward slashes", () => {
    expect(deserializeFilename("%2F")).toBe("/");
    expect(deserializeFilename("this %2F and %2F this")).toBe(
      `this / and / this`
    );
  });

  it("should deserialize back slashes", () => {
    expect(deserializeFilename("%5C")).toBe(`\\`);
    expect(deserializeFilename("this %5C and %5C this")).toBe(
      `this \\ and \\ this`
    );
  });
});

describe("stringByteLength", () => {
  it("should return byte length of string", () => {
    expect(stringByteLength("")).toBe(0);
    expect(stringByteLength("a")).toBe(1);
    expect(stringByteLength("🦄")).toBe(4);
    expect(stringByteLength("你好")).toBe(6);
  });
});

describe("trimFilenameAndExt", () => {
  it("should trim filename", () => {
    expect(trimFilenameAndExt("file.txt", 6)).toBe("fi.txt");
    expect(trimFilenameAndExt("file.txt", 8)).toBe("file.txt");
    expect(trimFilenameAndExt("file.md", 9)).toBe("file.md");
    expect(trimFilenameAndExt("你好.md", 9)).toBe("你好.md"); // No trimming needed
    expect(trimFilenameAndExt("你好.md", 8)).toBe("你.md"); // Trim one character
  });

  it("should handle files with no extension", () => {
    expect(trimFilenameAndExt("filename", 4)).toBe("file");
    expect(trimFilenameAndExt("verylongfilename", 8)).toBe("verylong");
    expect(trimFilenameAndExt("file", 10)).toBe("file");
  });

  it("should handle extensions longer than the limit", () => {
    expect(trimFilenameAndExt("file.verylongextension", 10)).toBe("file.veryl");
    expect(trimFilenameAndExt("a.toolongext", 5)).toBe("a.too");
  });

  it("should handle edge cases with very short limits", () => {
    expect(trimFilenameAndExt("file.txt", 1)).toBe("f"); // Can only fit 1 byte
    expect(trimFilenameAndExt("file.txt", 0)).toBe("");
    expect(trimFilenameAndExt("file.txt", -1)).toBe("");
  });

  it("should handle files with multiple dots", () => {
    expect(trimFilenameAndExt("file.name.txt", 10)).toBe("file.n.txt");
    expect(trimFilenameAndExt("archive.tar.gz", 14)).toBe("archive.tar.gz"); // No trimming needed
    expect(trimFilenameAndExt("archive.tar.gz", 12)).toBe("archive.t.gz"); // Trim to fit
    expect(trimFilenameAndExt("my.file.backup.txt", 10)).toBe("my.fil.txt");
  });

  it("should handle empty strings", () => {
    expect(trimFilenameAndExt("", 10)).toBe("");
    expect(trimFilenameAndExt("", 0)).toBe("");
  });

  it("should handle multi-byte UTF-8 characters properly", () => {
    expect(trimFilenameAndExt("🦄🌟.txt", 8)).toBe("🦄.txt"); // 🦄 is 4 bytes, 🌟 is 4 bytes, .txt is 4 bytes
    expect(trimFilenameAndExt("файл.txt", 8)).toBe("фа.txt"); // Cyrillic characters (фа is 4 bytes + .txt is 4 bytes = 8 total)
    expect(trimFilenameAndExt("测试文件.md", 10)).toBe("测试.md"); // Chinese characters
  });

  it("should not break UTF-8 character boundaries", () => {
    // Ensure we don't cut through multi-byte characters
    expect(trimFilenameAndExt("🦄🦄.txt", 8)).toBe("🦄.txt"); // Should not cut through second emoji (🦄 is 4 bytes + .txt is 4 bytes = 8 total)
    expect(trimFilenameAndExt("🦄🦄.txt", 7)).toBe(".txt"); // Should slice the whole filename when extension won't fit (but preserve UTF-8 boundaries)
    expect(trimFilenameAndExt("你好世界.txt", 11)).toBe("你好.txt"); // Should cut at character boundary
  });

  it("should handle extension-only files", () => {
    expect(trimFilenameAndExt(".gitignore", 5)).toBe(".giti");
    expect(trimFilenameAndExt(".env", 3)).toBe(".en");
    expect(trimFilenameAndExt(".bashrc", 10)).toBe(".bashrc");
  });

  it("should handle files where extension equals or exceeds the limit", () => {
    expect(trimFilenameAndExt("file.extension", 9)).toBe("file.exte"); // Extension is 10 bytes, limit is 9
    expect(trimFilenameAndExt("f.verylongextension", 10)).toBe("f.verylong"); // Slice whole filename when extension too long
  });

  it("should preserve behavior when no trimming needed", () => {
    expect(trimFilenameAndExt("short.txt", 100)).toBe("short.txt");
    expect(trimFilenameAndExt("file.md", 50)).toBe("file.md");
  });

  it("should handle mixed ASCII and UTF-8 characters", () => {
    expect(trimFilenameAndExt("file-测试.txt", 12)).toBe("file-测.txt");
    expect(trimFilenameAndExt("🦄unicorn.md", 10)).toBe("🦄uni.md");
    expect(trimFilenameAndExt("test-файл.doc", 11)).toBe("test-ф.doc");
  });

  it("should handle very long filenames", () => {
    const longName = "a".repeat(200);
    const result = trimFilenameAndExt(`${longName}.txt`, 50);
    expect(Buffer.byteLength(result, "utf8")).toBe(50);
    expect(result.endsWith(".txt")).toBe(true);
  });

  it("should handle filesystem limit edge cases", () => {
    // Test around common filesystem limits
    expect(trimFilenameAndExt("file.txt", 255)).toBe("file.txt"); // Common filename limit
    expect(trimFilenameAndExt("file.txt", 4096)).toBe("file.txt"); // Common path limit

    const result255 = trimFilenameAndExt("a".repeat(300) + ".txt", 255);
    expect(Buffer.byteLength(result255, "utf8")).toBeLessThanOrEqual(255);
  });

  it("should never produce invalid UTF-8 sequences", () => {
    const testCases = [
      "🦄🦄.txt",
      "файлы.doc",
      "测试文件.md",
      "émoji🎉.txt",
      "mixed-αβγ-123.log",
    ];

    testCases.forEach((filename) => {
      for (let limit = 1; limit <= 20; limit++) {
        const result = trimFilenameAndExt(filename, limit);
        expect(result).not.toContain("�");
        expect(Buffer.byteLength(result, "utf8")).toBeLessThanOrEqual(limit);
      }
    });
  });

  it("should handle special ASCII characters", () => {
    expect(trimFilenameAndExt("file-name_123.txt", 10)).toBe("file-n.txt");
    expect(trimFilenameAndExt("file@domain.com.txt", 12)).toBe("file@dom.txt");
    expect(trimFilenameAndExt("file (copy).txt", 10)).toBe("file (.txt");
  });

  it("should reject inputs containing path separators", () => {
    expect(() => trimFilenameAndExt("a/b.txt", 10)).toThrow();
    expect(() => trimFilenameAndExt("a\\b.txt", 10)).toThrow();
    expect(() => trimFilenameAndExt("/leading.txt", 10)).toThrow();
    expect(() =>
      trimFilenameAndExt("/tmp/import-ABC/" + "a/".repeat(2000) + "x.txt", 255)
    ).toThrow();
  });
});
