import type Koa from "koa";
import { requestErrorHandler } from "@server/logging/sentry";
import { InternalError, ValidationError, NotFoundError } from "./errors";
import onerror from "./onerror";

// Mock the requestErrorHandler from Sentry
jest.mock("@server/logging/sentry", () => ({
  requestErrorHandler: jest.fn(),
}));

describe("onerror", () => {
  let app: Koa;
  let ctx: any;

  beforeEach(() => {
    // Create a mock Koa app
    app = {
      context: {},
    } as any;

    // Apply the onerror middleware
    onerror(app);

    // Create a mock context
    ctx = {
      headers: {},
      headerSent: false,
      writable: true,
      accepts: jest.fn(() => "json"),
      set: jest.fn(),
      res: {
        end: jest.fn(),
      },
      status: undefined,
      type: undefined,
      body: undefined,
    };

    // Clear mock calls
    (requestErrorHandler as jest.Mock).mockClear();
  });

  it("should report InternalError to Sentry", () => {
    const error = InternalError("Test internal error");

    app.context.onerror.call(ctx, error);

    expect(requestErrorHandler).toHaveBeenCalledWith(error, ctx);
    expect(ctx.status).toBe(500);
  });

  it("should not report ValidationError to Sentry", () => {
    const error = ValidationError("Test validation error");

    app.context.onerror.call(ctx, error);

    expect(requestErrorHandler).not.toHaveBeenCalled();
    expect(ctx.status).toBe(400);
  });

  it("should not report NotFoundError to Sentry", () => {
    const error = NotFoundError("Test not found error");

    app.context.onerror.call(ctx, error);

    expect(requestErrorHandler).not.toHaveBeenCalled();
    expect(ctx.status).toBe(404);
  });

  it("should report unknown errors without isReportable property to Sentry", () => {
    const error = new Error("Unknown error") as any;
    error.status = 500;

    app.context.onerror.call(ctx, error);

    expect(requestErrorHandler).toHaveBeenCalledWith(error, ctx);
  });

  it("should report errors with invalid status codes to Sentry", () => {
    const error = new Error("Invalid status error") as any;
    error.status = 999;

    app.context.onerror.call(ctx, error);

    expect(requestErrorHandler).toHaveBeenCalledWith(error, ctx);
  });

  it("should not report errors explicitly marked with isReportable: false", () => {
    const error = new Error("Custom error") as any;
    error.status = 500;
    error.isReportable = false;

    app.context.onerror.call(ctx, error);

    expect(requestErrorHandler).not.toHaveBeenCalled();
  });

  it("should report errors explicitly marked with isReportable: true", () => {
    const error = new Error("Custom error") as any;
    error.status = 400;
    error.isReportable = true;

    app.context.onerror.call(ctx, error);

    expect(requestErrorHandler).toHaveBeenCalledWith(error, ctx);
  });
});
