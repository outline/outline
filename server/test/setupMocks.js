// This file runs before the test environment is set up to ensure mocks are registered early
// It prevents real Redis clients from being initialized during module imports

// Mock ioredis with ioredis-mock before any imports
jest.mock("ioredis", () => require("ioredis-mock"));

// Mock other Redis-dependent modules
jest.mock("@server/utils/MutexLock");
jest.mock("@server/utils/CacheHelper");

// Mock AWS SDK signature module to prevent aws_logger open handle
jest.mock("@aws-sdk/signature-v4-crt", () => ({}));
