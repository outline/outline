import "reflect-metadata";
import sharedEnv from "@shared/env";
import env from "@server/env";
import { sequelize } from "@server/storage/database";
import Redis from "@server/storage/redis";

require("@server/storage/database");

// Performance optimization: Use transactions for test isolation
let testTransaction: any; // eslint-disable-line @typescript-eslint/no-explicit-any

jest.mock("bull");

// Enable mocks for Redis-related modules
jest.mock("@server/storage/redis");
jest.mock("@server/utils/MutexLock");
jest.mock("@server/utils/CacheHelper");

// This is needed for the relative manual mock to be picked up
jest.mock("../queues");

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

// Performance optimization: Transaction-based test isolation
beforeEach(async () => {
  env.URL = sharedEnv.URL = "https://app.outline.dev";

  // Start a transaction for each test to provide isolation
  // This is much faster than TRUNCATE CASCADE
  testTransaction = await sequelize.transaction();

  // Override the default sequelize instance to use the transaction
  const originalQuery = sequelize.query.bind(sequelize);
  sequelize.query = (sql: any, options: any = {}) =>
    originalQuery(sql, { ...options, transaction: testTransaction }); // eslint-disable-line @typescript-eslint/no-explicit-any
});

afterEach(async () => {
  if (testTransaction) {
    // Rollback the transaction to clean up test data
    // This is orders of magnitude faster than TRUNCATE CASCADE
    await testTransaction.rollback();
    testTransaction = null;

    // Restore original query method
    const originalQuery = sequelize.query.bind(sequelize);
    sequelize.query = originalQuery;
  }
});

afterAll(() => {
  Redis.defaultClient.disconnect();
});
