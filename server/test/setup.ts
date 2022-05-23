import env from "../env";

// test environment variables
env.SMTP_HOST = "smtp.example.com";
env.ENVIRONMENT = "test";
env.GOOGLE_CLIENT_ID = "123";
env.GOOGLE_CLIENT_SECRET = "123";
env.SLACK_CLIENT_ID = "123";
env.SLACK_CLIENT_SECRET = "123";
env.DEPLOYMENT = undefined;

if (process.env.DATABASE_URL_TEST) {
  env.DATABASE_URL = process.env.DATABASE_URL_TEST;
}

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
