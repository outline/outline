import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { withFileSecrets } from "./environment";

describe("withFileSecrets", () => {
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

    const env = withFileSecrets({
      TEST_SECRET_FILE: secretFile,
    });

    expect(env.TEST_SECRET).toBe("my-secret-value");
  });

  it("should trim whitespace and newlines from file contents", () => {
    const secretFile = path.join(tmpDir, "secret");
    fs.writeFileSync(secretFile, "  my-secret-value\n\n");

    const env = withFileSecrets({
      TEST_TRIM_FILE: secretFile,
    });

    expect(env.TEST_TRIM).toBe("my-secret-value");
  });

  it("should not override existing env value with _FILE", () => {
    const secretFile = path.join(tmpDir, "secret");
    fs.writeFileSync(secretFile, "file-value");

    const env = withFileSecrets({
      TEST_OVERRIDE: "direct-value",
      TEST_OVERRIDE_FILE: secretFile,
    });

    expect(env.TEST_OVERRIDE).toBe("direct-value");
  });

  it("should not override empty-string env value with _FILE", () => {
    const secretFile = path.join(tmpDir, "secret");
    fs.writeFileSync(secretFile, "file-value");

    const env = withFileSecrets({
      TEST_OVERRIDE_EMPTY: "",
      TEST_OVERRIDE_EMPTY_FILE: secretFile,
    });

    expect(env.TEST_OVERRIDE_EMPTY).toBe("");
  });

  it("should return the file path when reading the _FILE variable itself", () => {
    const secretFile = path.join(tmpDir, "secret");
    fs.writeFileSync(secretFile, "my-secret-value");

    const env = withFileSecrets({
      TEST_PATH_FILE: secretFile,
    });

    expect(env.TEST_PATH_FILE).toBe(secretFile);
  });

  it("should not materialize base variables that are never read", () => {
    const tokenFile = path.join(tmpDir, "token");
    fs.writeFileSync(tokenFile, "rotating-token");

    const record: Record<string, string | undefined> = {
      AWS_CONTAINER_AUTHORIZATION_TOKEN_FILE: tokenFile,
    };
    withFileSecrets(record);

    expect(record.AWS_CONTAINER_AUTHORIZATION_TOKEN).toBeUndefined();
    expect(
      Object.keys(record).includes("AWS_CONTAINER_AUTHORIZATION_TOKEN")
    ).toBe(false);
  });

  it("should cache the resolved value on the underlying record", () => {
    const secretFile = path.join(tmpDir, "secret");
    fs.writeFileSync(secretFile, "first-value");

    const record: Record<string, string | undefined> = {
      TEST_CACHE_FILE: secretFile,
    };
    const env = withFileSecrets(record);

    expect(env.TEST_CACHE).toBe("first-value");
    expect(record.TEST_CACHE).toBe("first-value");

    // Subsequent reads must not hit the filesystem again.
    fs.rmSync(secretFile);
    expect(env.TEST_CACHE).toBe("first-value");
  });

  it("should handle missing file gracefully", () => {
    const env = withFileSecrets({
      TEST_MISSING_FILE: path.join(tmpDir, "nonexistent"),
    });

    expect(env.TEST_MISSING).toBeUndefined();
  });

  it("should skip _FILE entries with empty path", () => {
    const env = withFileSecrets({
      TEST_EMPTY_FILE: "",
    });

    expect(env.TEST_EMPTY).toBeUndefined();
  });

  it("should ignore a bare _FILE key with no base name", () => {
    const secretFile = path.join(tmpDir, "secret");
    fs.writeFileSync(secretFile, "value");

    const record: Record<string, string | undefined> = {
      _FILE: secretFile,
    };
    const env = withFileSecrets(record);

    expect(env[""]).toBeUndefined();
    expect(record[""]).toBeUndefined();
  });

  it("should resolve multiple _FILE entries independently", () => {
    const file1 = path.join(tmpDir, "secret1");
    const file2 = path.join(tmpDir, "secret2");
    fs.writeFileSync(file1, "value1");
    fs.writeFileSync(file2, "value2");

    const env = withFileSecrets({
      SECRET_KEY_FILE: file1,
      DATABASE_PASSWORD_FILE: file2,
    });

    expect(env.SECRET_KEY).toBe("value1");
    expect(env.DATABASE_PASSWORD).toBe("value2");
  });

  it("should resolve Outline _FILE secrets through Environment while leaving AWS SDK variables untouched", async () => {
    const tokenFile = path.join(tmpDir, "eks-pod-identity-token");
    const secretFile = path.join(tmpDir, "smtp-password");
    fs.writeFileSync(tokenFile, "rotating-jwt-token");
    fs.writeFileSync(secretFile, "smtp-secret-value\n");

    process.env.AWS_CONTAINER_CREDENTIALS_FULL_URI =
      "http://169.254.170.23/v1/credentials";
    process.env.AWS_CONTAINER_AUTHORIZATION_TOKEN_FILE = tokenFile;
    process.env.SMTP_PASSWORD_FILE = secretFile;

    vi.resetModules();
    const env = (await import("../env")).default;

    // Outline's own variable is resolved from the file.
    expect(env.SMTP_PASSWORD).toBe("smtp-secret-value");

    // The AWS SDK's token variable is never materialized, so the SDK keeps
    // re-reading the rotated token file on every credential refresh.
    expect(process.env.AWS_CONTAINER_AUTHORIZATION_TOKEN).toBeUndefined();
  });
});
