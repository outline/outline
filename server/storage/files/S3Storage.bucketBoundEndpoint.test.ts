import type S3Storage from "./S3Storage";

const {
  mockEnv,
  mockS3ClientConstructor,
  mockGetSignedUrl,
  customDomainUrl,
  bucketName,
  objectKey,
} = vi.hoisted(() => {
  const customDomainUrl = "https://files.example.com";
  const bucketName = "attachments";
  const objectKey = "uploads/user-id/attachment-id/photo.png";

  return {
    customDomainUrl,
    bucketName,
    objectKey,
    mockEnv: {
      AWS_CLOUDFRONT_URL: undefined as string | undefined,
      AWS_CLOUDFRONT_KEY_PAIR_ID: undefined as string | undefined,
      AWS_CLOUDFRONT_PRIVATE_KEY: undefined as string | undefined,
      AWS_S3_UPLOAD_BUCKET_URL: customDomainUrl,
      AWS_S3_UPLOAD_BUCKET_NAME: bucketName,
      AWS_S3_ACCELERATE_URL: "",
      AWS_S3_BUCKET_BOUND_ENDPOINT: false,
      AWS_REGION: "us-east-1",
      AWS_S3_FORCE_PATH_STYLE: false,
      AWS_S3_ACL: "private",
    },
    mockS3ClientConstructor: vi.fn(),
    mockGetSignedUrl: vi.fn().mockResolvedValue(`${customDomainUrl}/key`),
  };
});

vi.mock("@server/env", () => ({
  default: mockEnv,
}));

vi.mock("@aws-sdk/signature-v4-crt", () => ({}));

vi.mock("@aws-sdk/s3-request-presigner", () => ({
  getSignedUrl: mockGetSignedUrl,
}));

vi.mock("@aws-sdk/s3-presigned-post", () => ({
  createPresignedPost: vi.fn().mockResolvedValue({ url: "", fields: {} }),
}));

vi.mock("@aws-sdk/client-s3", () => ({
  S3Client: class MockS3Client {
    constructor(config: unknown) {
      mockS3ClientConstructor(config);
    }
    send = vi.fn();
  },
  DeleteObjectCommand: vi.fn(),
  GetObjectCommand: vi.fn(),
  HeadObjectCommand: vi.fn(),
  CopyObjectCommand: vi.fn(),
  PutObjectCommand: vi.fn(),
}));

const defaultEnv = {
  AWS_S3_UPLOAD_BUCKET_URL: customDomainUrl,
  AWS_S3_UPLOAD_BUCKET_NAME: bucketName,
  AWS_S3_ACCELERATE_URL: "",
  AWS_S3_BUCKET_BOUND_ENDPOINT: false,
  AWS_S3_FORCE_PATH_STYLE: false,
};

async function loadStorage(
  overrides: Partial<typeof mockEnv> = {}
): Promise<typeof S3Storage> {
  vi.resetModules();
  mockS3ClientConstructor.mockReset();
  Object.assign(mockEnv, defaultEnv, overrides);
  return (await import("./S3Storage")).default;
}

describe("S3Storage bucket-bound endpoint", () => {
  let Storage: typeof S3Storage;

  beforeEach(async () => {
    mockGetSignedUrl.mockReset();
    mockGetSignedUrl.mockResolvedValue(`${customDomainUrl}/key`);
    Storage = await loadStorage({ AWS_S3_BUCKET_BOUND_ENDPOINT: true });
  });

  it("should use path-style API calls with the real bucket name", () => {
    new Storage();

    expect(mockS3ClientConstructor).toHaveBeenCalledWith(
      expect.objectContaining({
        bucketEndpoint: false,
        forcePathStyle: true,
        endpoint: customDomainUrl,
        region: "us-east-1",
      })
    );
  });

  it("should build path-style upload URLs on bucket-bound endpoints", () => {
    const storage = new Storage();

    expect(storage.getUploadUrl()).toBe(`${customDomainUrl}/${bucketName}`);
  });

  it("should sign download URLs at the domain root", async () => {
    const { GetObjectCommand } = await import("@aws-sdk/client-s3");
    const storage = new Storage();

    await storage.getSignedUrl(objectKey);

    expect(mockS3ClientConstructor).toHaveBeenCalledTimes(2);
    expect(mockS3ClientConstructor).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        bucketEndpoint: false,
        forcePathStyle: true,
      })
    );
    expect(mockS3ClientConstructor).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        bucketEndpoint: true,
        forcePathStyle: false,
        endpoint: customDomainUrl,
      })
    );
    expect(GetObjectCommand).toHaveBeenCalledWith({
      Bucket: customDomainUrl,
      Key: objectKey,
    });
    expect(mockGetSignedUrl).toHaveBeenCalled();
  });

  it("should build public object URLs without a bucket path prefix", () => {
    const storage = new Storage();

    expect(storage.getUrlForKey(objectKey)).toBe(
      `${customDomainUrl}/${objectKey}`
    );
  });

  it("should use standard path-style URLs when bucket-bound is disabled", async () => {
    Storage = await loadStorage({
      AWS_S3_BUCKET_BOUND_ENDPOINT: false,
      AWS_S3_UPLOAD_BUCKET_URL: "https://abc123.r2.cloudflarestorage.com",
      AWS_S3_FORCE_PATH_STYLE: true,
    });
    const storage = new Storage();

    expect(mockS3ClientConstructor).toHaveBeenCalledTimes(1);
    expect(mockS3ClientConstructor).toHaveBeenCalledWith(
      expect.objectContaining({
        bucketEndpoint: false,
        forcePathStyle: true,
      })
    );
    expect(storage.getUploadUrl()).toBe(
      `https://abc123.r2.cloudflarestorage.com/${bucketName}`
    );
  });

  it("should enable bucketEndpoint only for AWS transfer acceleration", async () => {
    Storage = await loadStorage({
      AWS_S3_BUCKET_BOUND_ENDPOINT: false,
      AWS_S3_ACCELERATE_URL: "https://bucket.s3-accelerate.amazonaws.com",
    });
    new Storage();

    expect(mockS3ClientConstructor).toHaveBeenCalledTimes(1);
    expect(mockS3ClientConstructor).toHaveBeenCalledWith(
      expect.objectContaining({
        bucketEndpoint: true,
        endpoint: "https://bucket.s3-accelerate.amazonaws.com",
      })
    );
  });
});
