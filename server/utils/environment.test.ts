import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { resolveFileSecrets } from "./environment";

describe("resolveFileSecrets", () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "outline-env-test-"));
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true });
  });

  it("should read env value from file when _FILE suffix is used", () => {
    const secretFile = path.join(tmpDir, "secret");
    fs.writeFileSync(secretFile, "my-secret-value");

    const env: Record<string, string | undefined> = {
      TEST_SECRET_FILE: secretFile,
    };

    resolveFileSecrets(env);

    expect(env.TEST_SECRET).toBe("my-secret-value");
  });

  it("should trim whitespace and newlines from file contents", () => {
    const secretFile = path.join(tmpDir, "secret");
    fs.writeFileSync(secretFile, "  my-secret-value\n\n");

    const env: Record<string, string | undefined> = {
      TEST_TRIM_FILE: secretFile,
    };

    resolveFileSecrets(env);

    expect(env.TEST_TRIM).toBe("my-secret-value");
  });

  it("should not override existing env value with _FILE", () => {
    const secretFile = path.join(tmpDir, "secret");
    fs.writeFileSync(secretFile, "file-value");

    const env: Record<string, string | undefined> = {
      TEST_OVERRIDE: "direct-value",
      TEST_OVERRIDE_FILE: secretFile,
    };

    resolveFileSecrets(env);

    expect(env.TEST_OVERRIDE).toBe("direct-value");
  });

  it("should not override empty-string env value with _FILE", () => {
    const secretFile = path.join(tmpDir, "secret");
    fs.writeFileSync(secretFile, "file-value");

    const env: Record<string, string | undefined> = {
      TEST_OVERRIDE_EMPTY: "",
      TEST_OVERRIDE_EMPTY_FILE: secretFile,
    };

    resolveFileSecrets(env);

    expect(env.TEST_OVERRIDE_EMPTY).toBe("");
  });

  it("should skip a bare _FILE key with no base name", () => {
    const secretFile = path.join(tmpDir, "secret");
    fs.writeFileSync(secretFile, "value");

    const env: Record<string, string | undefined> = {
      _FILE: secretFile,
    };

    resolveFileSecrets(env);

    expect(env[""]).toBeUndefined();
  });

  it("should handle missing file gracefully", () => {
    const env: Record<string, string | undefined> = {
      TEST_MISSING_FILE: path.join(tmpDir, "nonexistent"),
    };

    resolveFileSecrets(env);

    expect(env.TEST_MISSING).toBeUndefined();
  });

  it("should skip _FILE entries with empty path", () => {
    const env: Record<string, string | undefined> = {
      TEST_EMPTY_FILE: "",
    };

    resolveFileSecrets(env);

    expect(env.TEST_EMPTY).toBeUndefined();
  });

  it("should process multiple _FILE entries", () => {
    const file1 = path.join(tmpDir, "secret1");
    const file2 = path.join(tmpDir, "secret2");
    fs.writeFileSync(file1, "value1");
    fs.writeFileSync(file2, "value2");

    const env: Record<string, string | undefined> = {
      SECRET_KEY_FILE: file1,
      DATABASE_PASSWORD_FILE: file2,
    };

    resolveFileSecrets(env);

    expect(env.SECRET_KEY).toBe("value1");
    expect(env.DATABASE_PASSWORD).toBe("value2");
  });
});
