import "reflect-metadata";
import sharedEnv from "@shared/env";
import env from "@server/env";

require("@server/storage/database");

// Enable mocks for Redis-related modules
jest.mock("@server/storage/redis");
jest.mock("@server/utils/MutexLock");
jest.mock("@server/utils/CacheHelper");

// We never want to make real S3 requests in test environment
jest.mock("@aws-sdk/client-s3", () => ({
  S3Client: jest.fn(() => ({
    send: jest.fn(),
  })),
  DeleteObjectCommand: jest.fn(),
  GetObjectCommand: jest.fn(),
  ObjectCannedACL: {},
}));

jest.mock("@aws-sdk/lib-storage", () => ({
  Upload: jest.fn(() => ({
    done: jest.fn(),
  })),
}));

jest.mock("@aws-sdk/s3-presigned-post", () => ({
  createPresignedPost: jest.fn(),
}));

jest.mock("@aws-sdk/s3-request-presigner", () => ({
  getSignedUrl: jest.fn(),
}));

beforeEach(() => {
  env.URL = sharedEnv.URL = "https://app.outline.dev";
});
