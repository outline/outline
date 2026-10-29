import Koa from "koa";
import { CSRF } from "@shared/constants";
import env from "@server/env";
import TestServer from "@server/test/TestServer";
import {
  bundleToken,
  clearCSRFCookie,
  generateRawToken,
} from "@server/utils/csrf";
import { attachCSRFToken } from "./csrf";

async function getSetCookie(cookie?: string) {
  const app = new Koa();
  app.use(attachCSRFToken());
  app.use((ctx) => {
    ctx.body = "ok";
  });

  const server = new TestServer(app);
  try {
    const res = await server.get("/", {
      headers: cookie ? { Cookie: cookie } : {},
    });
    return res.headers.get("set-cookie") ?? "";
  } finally {
    server.close();
  }
}

describe("attachCSRFToken", () => {
  it("should set a token when no cookie is present", async () => {
    const setCookie = await getSetCookie();
    expect(setCookie).toContain(`${CSRF.cookieName}=`);
  });

  it("should keep a valid existing token", async () => {
    const token = bundleToken(generateRawToken(16), env.SECRET_KEY);
    const setCookie = await getSetCookie(`${CSRF.cookieName}=${token}`);
    expect(setCookie).toEqual("");
  });

  it("should replace a malformed existing token", async () => {
    const token = `${generateRawToken(16).toString("hex")}.${"é".repeat(64)}`;
    const setCookie = await getSetCookie(`${CSRF.cookieName}=${token}`);
    expect(setCookie).toContain(`${CSRF.cookieName}=`);
    expect(setCookie).not.toContain(token);
  });

  it("should replace an invalid existing token", async () => {
    const token = bundleToken(generateRawToken(16), "wrong-secret");
    const setCookie = await getSetCookie(`${CSRF.cookieName}=${token}`);
    expect(setCookie).toContain(`${CSRF.cookieName}=`);
    expect(setCookie).not.toContain(token);
  });
});

describe("clearCSRFCookie", () => {
  it("should expire the cookie so a fresh token is minted next request", async () => {
    const app = new Koa();
    app.use((ctx) => {
      clearCSRFCookie(ctx);
      ctx.body = "ok";
    });

    const server = new TestServer(app);
    try {
      const res = await server.get("/");
      const setCookie = res.headers.get("set-cookie") ?? "";
      expect(setCookie).toContain(`${CSRF.cookieName}=;`);
      expect(setCookie).toContain("expires=Thu, 01 Jan 1970");
    } finally {
      server.close();
    }
  });
});
