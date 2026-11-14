// @vitest-isolate true
import type S3Storage from "./S3Storage";

const { mockEnv } = vi.hoisted(() => ({
  mockEnv: {
    AWS_CLOUDFRONT_URL: undefined as string | undefined,
    AWS_S3_UPLOAD_BUCKET_URL: "http://s3:4569",
    AWS_S3_UPLOAD_BUCKET_NAME: "bucket",
    AWS_S3_FORCE_PATH_STYLE: true,
    FILE_STORAGE_PUBLIC_URL: undefined as string | undefined,
  },
}));

vi.mock("@server/env", () => ({
  default: mockEnv,
}));

describe("S3Storage public base URL", () => {
  let Storage: typeof S3Storage;

  beforeEach(async () => {
    vi.resetModules();
    mockEnv.AWS_CLOUDFRONT_URL = undefined;
    mockEnv.FILE_STORAGE_PUBLIC_URL = undefined;
    Storage = (await import("./S3Storage")).default;
  });

  it("serves files from FILE_STORAGE_PUBLIC_URL when set", () => {
    mockEnv.FILE_STORAGE_PUBLIC_URL = "https://assets.example.test/";
    const storage = new Storage();

    expect(storage.getUrlForKey("avatars/a.png")).toBe(
      "https://assets.example.test/avatars/a.png"
    );
  });

  it("prefers FILE_STORAGE_PUBLIC_URL over AWS_CLOUDFRONT_URL", () => {
    mockEnv.FILE_STORAGE_PUBLIC_URL = "https://assets.example.test";
    mockEnv.AWS_CLOUDFRONT_URL = "https://d111.cloudfront.net";
    const storage = new Storage();

    expect(storage.getUrlForKey("uploads/a.png")).toBe(
      "https://assets.example.test/uploads/a.png"
    );
  });

  it("falls back to CloudFront when FILE_STORAGE_PUBLIC_URL is unset", () => {
    mockEnv.AWS_CLOUDFRONT_URL = "https://d111.cloudfront.net";
    const storage = new Storage();

    expect(storage.getUrlForKey("uploads/a.png")).toBe(
      "https://d111.cloudfront.net/uploads/a.png"
    );
  });

  it("falls back to the S3 endpoint when neither is set", () => {
    const storage = new Storage();

    expect(storage.getUrlForKey("uploads/a.png")).toBe(
      "http://localhost:4569/bucket/uploads/a.png"
    );
  });
});
