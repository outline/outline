// @flow
require("dotenv").config({ silent: true });

// test environment variables
process.env.DATABASE_URL = process.env.DATABASE_URL_TEST;
process.env.NODE_ENV = "test";
process.env.GOOGLE_CLIENT_ID = "123";
process.env.SLACK_KEY = "123";
process.env.DEPLOYMENT = "";
process.env.ALLOWED_DOMAINS = "allowed-domain.com";

// This is needed for the relative manual mock to be picked up
jest.mock("../events");
