// @vitest-isolate true
import { PutObjectCommand } from "@aws-sdk/client-s3";
import { createContext } from "@server/context";
import env from "@server/env";
import S3Storage from "./S3Storage";

const { mockPresignedPost, mockSignedUrl, mockUploadOptions, mockUploadDone } =
  vi.hoisted(() => ({
    mockPresignedPost: vi.fn().mockResolvedValue({ fields: {} }),
    mockSignedUrl: vi.fn().mockResolvedValue("https://example.com/upload"),
    mockUploadOptions: vi.fn(),
    mockUploadDone: vi.fn().mockResolvedValue(undefined),
  }));

vi.mock("@aws-sdk/s3-presigned-post", () => ({
  createPresignedPost: mockPresignedPost,
}));

vi.mock("@aws-sdk/s3-request-presigner", () => ({
  getSignedUrl: mockSignedUrl,
}));

vi.mock("@aws-sdk/lib-storage", () => ({
  Upload: class MockUpload {
    constructor(options: { params: { ACL?: string } }) {
      mockUploadOptions(options);
    }

    done = mockUploadDone;
  },
}));

describe("S3Storage object ACLs", () => {
  const originalAcl = env.AWS_S3_ACL;
  const originalBucketName = env.AWS_S3_UPLOAD_BUCKET_NAME;
  const originalBucketUrl = env.AWS_S3_UPLOAD_BUCKET_URL;

  beforeEach(() => {
    env.AWS_S3_UPLOAD_BUCKET_NAME = "test-bucket";
    env.AWS_S3_UPLOAD_BUCKET_URL = "https://storage.example.com";
    mockPresignedPost.mockClear();
    mockSignedUrl.mockClear();
    mockUploadOptions.mockClear();
    vi.mocked(PutObjectCommand).mockClear();
  });

  afterEach(() => {
    env.AWS_S3_ACL = originalAcl;
    env.AWS_S3_UPLOAD_BUCKET_NAME = originalBucketName;
    env.AWS_S3_UPLOAD_BUCKET_URL = originalBucketUrl;
  });

  it.each(["", "public-read"])(
    "uses the configured provider ACL '%s' for POST, PUT, and store",
    async (providerAcl) => {
      env.AWS_S3_ACL = providerAcl;
      const storage = new S3Storage();
      const key = "uploads/user/id/test.png";

      await storage.getPresignedPost(
        createContext({}),
        key,
        "private",
        1000,
        "image/png"
      );
      const postOptions = mockPresignedPost.mock.calls[0][1];
      const expectedAcl = providerAcl ? { ACL: providerAcl } : {};
      expect(postOptions.Fields).toEqual(expect.objectContaining(expectedAcl));
      expect(Object.hasOwn(postOptions.Fields, "ACL")).toBe(
        Boolean(providerAcl)
      );

      await storage.getPresignedPut(key, "private", 1000, "image/png");
      const putOptions = vi.mocked(PutObjectCommand).mock.calls[0][0];
      expect(putOptions).toEqual(expect.objectContaining(expectedAcl));
      expect(Object.hasOwn(putOptions, "ACL")).toBe(Boolean(providerAcl));

      await storage.store({ body: "image", key, contentType: "image/png" });
      const uploadOptions = mockUploadOptions.mock.calls[0][0];
      expect(uploadOptions.params).toEqual(
        expect.objectContaining(expectedAcl)
      );
      expect(Object.hasOwn(uploadOptions.params, "ACL")).toBe(
        Boolean(providerAcl)
      );
    }
  );
});
