import "reflect-metadata";
import sharedEnv from "@shared/env";
import env from "@server/env";
import Redis from "ioredis-mock";

// Enable mocks for Redis-related modules
jest.mock("ioredis", () => require("ioredis-mock"));
jest.mock("@server/utils/MutexLock");
jest.mock("@server/utils/CacheHelper");

// Enable fetch mocks for testing
require("jest-fetch-mock").enableMocks();
fetchMock.dontMock();

// Mock AWS SDK S3 client and related commands
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

// Initialize the database models
require("@server/storage/database");

beforeEach(() => {
  env.URL = sharedEnv.URL = "https://app.outline.dev";
});

afterEach((done) => {
  new Redis().flushall().then(() => done());
});
