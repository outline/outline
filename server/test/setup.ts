import "../env";

// test environment variables
process.env.SMTP_HOST = "smtp.example.com";
process.env.DATABASE_URL = process.env.DATABASE_URL_TEST;
process.env.NODE_ENV = "test";
process.env.GOOGLE_CLIENT_ID = "123";
process.env.SLACK_KEY = "123";
process.env.DEPLOYMENT = "";
process.env.ALLOWED_DOMAINS = "allowed-domain.com";

// NOTE: this require must come after the ENV var override above
// so that sequelize uses the test config variables
require("@server/database/sequelize");

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
