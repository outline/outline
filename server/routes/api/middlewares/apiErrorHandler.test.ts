import httpErrors from "http-errors";
import type { Context } from "koa";
import { AuthenticationError } from "@server/errors";
import apiErrorHandler from "./apiErrorHandler";

const createContext = (challenge?: string) => {
  const headers: Record<string, string> = {};
  if (challenge) {
    headers["www-authenticate"] = challenge;
  }
  return {
    response: {
      get: (field: string) => headers[field.toLowerCase()] ?? "",
    },
  } as unknown as Context;
};

const runWithError = async (ctx: Context) => {
  try {
    await apiErrorHandler()(ctx, () => Promise.reject(AuthenticationError()));
  } catch (err) {
    if (httpErrors.isHttpError(err)) {
      return err;
    }
  }
  throw new Error("Expected an error");
};

describe("apiErrorHandler", () => {
  it("should add a Bearer challenge to 401 errors", async () => {
    const err = await runWithError(createContext());
    expect(err.headers?.["WWW-Authenticate"]).toEqual("Bearer");
  });

  it("should keep a challenge already set on the response", async () => {
    const err = await runWithError(createContext('Basic realm="custom"'));
    expect(err.headers?.["WWW-Authenticate"]).toBeUndefined();
  });
});
