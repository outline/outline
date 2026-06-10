const { mockEnv, mockGetS3SignedUrl, mockGetCloudFrontSignedUrl } = vi.hoisted(
  () => ({
    mockEnv: {
      AWS_CLOUDFRONT_URL: "",
      AWS_CLOUDFRONT_KEY_PAIR_ID: "",
      AWS_CLOUDFRONT_PRIVATE_KEY: "",
      AWS_CLOUDFRONT_PRIVATE_KEY_BASE64: "",
      AWS_S3_UPLOAD_BUCKET_URL: "http://s3:4569",
      AWS_S3_UPLOAD_BUCKET_NAME: "bucket",
      AWS_S3_ACCELERATE_URL: "",
      AWS_REGION: "us-east-1",
      AWS_S3_FORCE_PATH_STYLE: true,
    },
    mockGetS3SignedUrl: vi.fn(),
    mockGetCloudFrontSignedUrl: vi.fn(),
  })
);

vi.mock("@server/env", () => ({
  default: mockEnv,
}));

vi.mock("@aws-sdk/signature-v4-crt", () => ({}));

vi.mock("@aws-sdk/s3-request-presigner", () => ({
  getSignedUrl: mockGetS3SignedUrl,
}));

vi.mock("@aws-sdk/cloudfront-signer", () => ({
  getSignedUrl: mockGetCloudFrontSignedUrl,
}));

vi.mock("@aws-sdk/client-s3", () => ({
  S3Client: class MockS3Client {
    send = vi.fn();
  },
  DeleteObjectCommand: vi.fn(),
  GetObjectCommand: vi.fn(),
  HeadObjectCommand: vi.fn(),
  CopyObjectCommand: vi.fn(),
}));

type S3StorageClass = typeof import("./S3Storage").default;

describe("S3Storage CloudFront signed URLs", () => {
  let S3Storage: S3StorageClass;

  beforeEach(async () => {
    vi.resetModules();
    mockEnv.AWS_CLOUDFRONT_URL = "";
    mockEnv.AWS_CLOUDFRONT_KEY_PAIR_ID = "";
    mockEnv.AWS_CLOUDFRONT_PRIVATE_KEY = "";
    mockEnv.AWS_CLOUDFRONT_PRIVATE_KEY_BASE64 = "";
    mockGetS3SignedUrl.mockReset();
    mockGetCloudFrontSignedUrl.mockReset();
    mockGetS3SignedUrl.mockResolvedValue("https://s3.example/presigned");
    mockGetCloudFrontSignedUrl.mockReturnValue("https://cf.example/signed");

    S3Storage = (await import("./S3Storage")).default;
  });

  it("should return a CloudFront signed URL when signing is configured", async () => {
    mockEnv.AWS_CLOUDFRONT_URL = "https://d111.cloudfront.net";
    mockEnv.AWS_CLOUDFRONT_KEY_PAIR_ID = "K2ABCDEF";
    mockEnv.AWS_CLOUDFRONT_PRIVATE_KEY = "-----BEGIN RSA PRIVATE KEY-----";

    const storage = new S3Storage();
    const url = await storage.getSignedUrl("uploads/test.png");

    expect(url).toBe("https://cf.example/signed");
    expect(mockGetCloudFrontSignedUrl).toHaveBeenCalledWith(
      expect.objectContaining({
        url: "https://d111.cloudfront.net/uploads/test.png",
        keyPairId: "K2ABCDEF",
        privateKey: "-----BEGIN RSA PRIVATE KEY-----",
      })
    );
    expect(mockGetS3SignedUrl).not.toHaveBeenCalled();
  });

  it("should fall back to S3 when CloudFront signing credentials are missing", async () => {
    mockEnv.AWS_CLOUDFRONT_URL = "https://d111.cloudfront.net";

    const storage = new S3Storage();
    const url = await storage.getSignedUrl("uploads/test.png");

    expect(url).toBe("http://localhost:4569/bucket/uploads/test.png");
    expect(mockGetCloudFrontSignedUrl).not.toHaveBeenCalled();
    expect(mockGetS3SignedUrl).not.toHaveBeenCalled();
  });

  it("should fall back to S3 when CloudFront signing fails", async () => {
    mockEnv.AWS_CLOUDFRONT_URL = "https://d111.cloudfront.net";
    mockEnv.AWS_CLOUDFRONT_KEY_PAIR_ID = "K2ABCDEF";
    mockEnv.AWS_CLOUDFRONT_PRIVATE_KEY = "invalid-key";
    mockGetCloudFrontSignedUrl.mockImplementationOnce(() => {
      throw new Error("signing failed");
    });

    const storage = new S3Storage();
    const url = await storage.getSignedUrl("uploads/test.png");

    expect(url).toBe("http://localhost:4569/bucket/uploads/test.png");
    expect(mockGetS3SignedUrl).not.toHaveBeenCalled();
  });

  it("should use base64-encoded private key when provided", async () => {
    mockEnv.AWS_CLOUDFRONT_URL = "https://d111.cloudfront.net";
    mockEnv.AWS_CLOUDFRONT_KEY_PAIR_ID = "K2ABCDEF";
    mockEnv.AWS_CLOUDFRONT_PRIVATE_KEY = "";
    mockEnv.AWS_CLOUDFRONT_PRIVATE_KEY_BASE64 = Buffer.from(
      "-----BEGIN RSA PRIVATE KEY-----"
    ).toString("base64");

    const storage = new S3Storage();
    await storage.getSignedUrl("uploads/test.png");

    expect(mockGetCloudFrontSignedUrl).toHaveBeenCalledWith(
      expect.objectContaining({
        privateKey: "-----BEGIN RSA PRIVATE KEY-----",
      })
    );
  });
});
