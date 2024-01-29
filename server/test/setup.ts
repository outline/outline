import sharedEnv from "@shared/env";
import env from "@server/env";
import Redis from "@server/storage/redis";

require("@server/storage/database");

jest.mock("bull");

// This is needed for the relative manual mock to be picked up
jest.mock("../queues");

// We never want to make real S3 requests in test environment
jest.mock("aws-sdk", () => {
  const mS3 = {
    createPresignedPost: jest.fn(),
    putObject: jest.fn().mockReturnThis(),
    deleteObject: jest.fn().mockReturnThis(),
    promise: jest.fn(),
  };
  return {
    S3: jest.fn(() => mS3),
    Endpoint: jest.fn(),
  };
});

afterAll(() => Redis.defaultClient.disconnect());

beforeEach(() => {
  env.URL = sharedEnv.URL = "https://app.outline.dev";
});
