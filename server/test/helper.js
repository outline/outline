// @flow
require("dotenv").config({ silent: true });

// test environment variables
process.env.DATABASE_URL = process.env.DATABASE_URL_TEST;
process.env.NODE_ENV = "test";

// This is needed for the relative manual mock to be picked up
jest.mock("../events");
