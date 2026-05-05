import "reflect-metadata";
import sharedEnv from "@shared/env";
import env from "@server/env";
import { EventEmitter } from "node:events";

// Increase the default max listeners for EventEmitter to prevent warnings in tests
// This needs to be done before any modules that use EventEmitter are loaded
EventEmitter.defaultMaxListeners = 100;

// Save native Response/Request before jest-fetch-mock replaces them with
// cross-fetch polyfills that don't support Web Streams (e.g. ReadableStream
// bodies lose their getReader method). The MCP SDK's @hono/node-server adapter
// depends on proper Web Streams support.
const NativeResponse = globalThis.Response;
const NativeRequest = globalThis.Request;
const NativeHeaders = globalThis.Headers;

// Enable fetch mocks for testing
require("jest-fetch-mock").enableMocks();
fetchMock.dontMock();

// Restore native Web API classes
globalThis.Response = NativeResponse;
globalThis.Request = NativeRequest;
globalThis.Headers = NativeHeaders;

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
