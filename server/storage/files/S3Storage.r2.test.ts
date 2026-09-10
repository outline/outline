import type { Environment } from "@server/env";
import type S3Storage from "./S3Storage";

const {
  mockEnv,
  mockGetSignedUrl,
  mockCreatePresignedPost,
  putInputs,
  postInputs,
  uploadInputs,
} = vi.hoisted(() => ({
  mockEnv: {
    AWS_CLOUDFRONT_URL: undefined as string | undefined,
    AWS_S3_ACCELERATE_URL: "",
    AWS_S3_ACL: "private",
    AWS_S3_CANNED_ACL: undefined as string | undefined,
    AWS_S3_FORCE_PATH_STYLE: true,
    AWS_S3_UPLOAD_BUCKET_NAME: "test-bucket",
    AWS_S3_UPLOAD_BUCKET_URL: "https://account.r2.cloudflarestorage.com",
    AWS_REGION: "auto",
    FILE_STORAGE_PUBLIC_URL: undefined as string | undefined,
  },
  mockGetSignedUrl: vi.fn(),
  mockCreatePresignedPost: vi.fn(),
  putInputs: [] as Record<string, unknown>[],
  postInputs: [] as Record<string, unknown>[],
  uploadInputs: [] as Record<string, unknown>[],
}));

vi.mock("@server/env", () => ({ default: mockEnv }));
vi.mock("@aws-sdk/signature-v4-crt", () => ({}));
vi.mock("@aws-sdk/s3-request-presigner", () => ({
  getSignedUrl: mockGetSignedUrl,
}));
vi.mock("@aws-sdk/s3-presigned-post", () => ({
  createPresignedPost: mockCreatePresignedPost,
}));
vi.mock("@aws-sdk/client-s3", () => ({
  S3Client: class MockS3Client {
    send = vi.fn();
  },
  PutObjectCommand: class MockPutObjectCommand {
    input: Record<string, unknown>;

    constructor(input: Record<string, unknown>) {
      this.input = input;
      putInputs.push(input);
    }
  },
  DeleteObjectCommand: class MockDeleteObjectCommand {},
  GetObjectCommand: class MockGetObjectCommand {},
  HeadObjectCommand: class MockHeadObjectCommand {},
  CopyObjectCommand: class MockCopyObjectCommand {},
}));
vi.mock("@aws-sdk/lib-storage", () => ({
  Upload: class MockUpload {
    constructor(input: { params: Record<string, unknown> }) {
      uploadInputs.push(input.params);
    }

    done = vi.fn().mockResolvedValue({});
  },
}));

describe("S3Storage R2-compatible ACL and public URL configuration", () => {
  let Storage: typeof S3Storage;

  beforeEach(async () => {
    vi.resetModules();
    mockEnv.AWS_S3_CANNED_ACL = "";
    mockEnv.FILE_STORAGE_PUBLIC_URL = undefined;
    putInputs.length = 0;
    postInputs.length = 0;
    uploadInputs.length = 0;
    mockCreatePresignedPost.mockReset();
    mockCreatePresignedPost.mockImplementation((_client, input) => {
      postInputs.push(input);
      return Promise.resolve({ fields: input.Fields });
    });
    mockGetSignedUrl.mockReset();
    mockGetSignedUrl.mockResolvedValue(
      "https://account.r2.cloudflarestorage.com/signed"
    );
    Storage = (await import("./S3Storage")).default;
  });

  it("omits ACLs for R2 while serving public URLs from the configured base", async () => {
    mockEnv.FILE_STORAGE_PUBLIC_URL = "https://assets.example.test";
    const storage = new Storage();

    await storage.getPresignedPost({} as never, "uploads/a.png", "private", 1);
    await storage.getPresignedPut("uploads/a.png", "private", 1, "image/png");
    await storage.store({ body: "content", key: "uploads/a.png" });

    expect(putInputs[0]).not.toHaveProperty("ACL");
    expect(postInputs[0].Fields).not.toHaveProperty("ACL");
    expect(uploadInputs[0]).not.toHaveProperty("ACL");
    expect(storage.getUrlForKey("avatars/a.png")).toBe(
      "https://assets.example.test/avatars/a.png"
    );
    expect(await storage.getSignedUrl("uploads/a.png")).toContain(
      "r2.cloudflarestorage.com"
    );
  });

  it("inherits the legacy ACL when AWS_S3_CANNED_ACL is absent", async () => {
    const hadLegacyAcl = Object.prototype.hasOwnProperty.call(
      process.env,
      "AWS_S3_ACL"
    );
    const legacyAcl = process.env.AWS_S3_ACL;
    const hadCannedAcl = Object.prototype.hasOwnProperty.call(
      process.env,
      "AWS_S3_CANNED_ACL"
    );
    const cannedAcl = process.env.AWS_S3_CANNED_ACL;

    try {
      process.env.AWS_S3_ACL = "private";
      delete process.env.AWS_S3_CANNED_ACL;
      vi.resetModules();
      const environment = await vi.importActual<{ default: Environment }>(
        "@server/env"
      );

      expect(environment.default.AWS_S3_CANNED_ACL).toBe("private");
      mockEnv.AWS_S3_CANNED_ACL = environment.default.AWS_S3_CANNED_ACL;
      Storage = (await import("./S3Storage")).default;
      const storage = new Storage();

      await storage.getPresignedPut("uploads/a.png", "private", 1, "image/png");

      expect(putInputs[0]).toMatchObject({ ACL: "private" });
    } finally {
      if (hadLegacyAcl) {
        process.env.AWS_S3_ACL = legacyAcl;
      } else {
        delete process.env.AWS_S3_ACL;
      }
      if (hadCannedAcl) {
        process.env.AWS_S3_CANNED_ACL = cannedAcl;
      } else {
        delete process.env.AWS_S3_CANNED_ACL;
      }
      vi.resetModules();
    }
  });

  it.each([
    ["omits ACL for an explicit empty value", ""],
    ["uses an explicit canned ACL override", "public-read"],
  ])("%s", async (_name, cannedAcl) => {
    mockEnv.AWS_S3_CANNED_ACL = cannedAcl;
    const storage = new Storage();

    await storage.getPresignedPut("uploads/a.png", "private", 1, "image/png");

    if (cannedAcl) {
      expect(putInputs[0]).toMatchObject({ ACL: cannedAcl });
    } else {
      expect(putInputs[0]).not.toHaveProperty("ACL");
    }
  });
});
