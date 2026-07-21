import JWT from "jsonwebtoken";
import { http, HttpResponse } from "msw";
import { server } from "@server/test/msw";
import OAuthClient from "./oauth";

class MinimalOAuthClient extends OAuthClient {
  endpoints = {
    authorize: "http://example.com/authorize",
    token: "http://example.com/token",
    userinfo: "http://example.com/userinfo",
  };
}

describe("userInfo", () => {
  it("should work with empty-body 401 Unauthorized responses", async () => {
    server.use(
      http.get(
        "http://example.com/userinfo",
        () =>
          new HttpResponse(null, { status: 401, statusText: "unauthorized" })
      )
    );

    const client = new MinimalOAuthClient("clientid", "clientsecret");
    try {
      expect.assertions(1);
      await client.userInfo("token");
    } catch (e) {
      expect(e instanceof Error && "id" in e ? e.id : undefined).toBe(
        "authentication_required"
      );
    }
  });

  it("should parse claims from an application/json response", async () => {
    server.use(
      http.get("http://example.com/userinfo", () =>
        HttpResponse.json({ sub: "1234", email: "test@example.com" })
      )
    );

    const client = new MinimalOAuthClient("clientid", "clientsecret");
    const data = await client.userInfo("token");
    expect(data.sub).toBe("1234");
    expect(data.email).toBe("test@example.com");
  });

  it("should parse claims from a signed application/jwt response", async () => {
    const token = JWT.sign(
      { sub: "1234", email: "test@example.com" },
      "secret"
    );
    server.use(
      http.get(
        "http://example.com/userinfo",
        () =>
          new HttpResponse(token, {
            status: 200,
            headers: { "Content-Type": "application/jwt" },
          })
      )
    );

    const client = new MinimalOAuthClient("clientid", "clientsecret");
    const data = await client.userInfo("token");
    expect(data.sub).toBe("1234");
    expect(data.email).toBe("test@example.com");
  });

  it("should throw for an undecodable application/jwt response", async () => {
    server.use(
      http.get(
        "http://example.com/userinfo",
        () =>
          new HttpResponse("not-a-jwt", {
            status: 200,
            headers: { "Content-Type": "application/jwt" },
          })
      )
    );

    const client = new MinimalOAuthClient("clientid", "clientsecret");
    try {
      expect.assertions(1);
      await client.userInfo("token");
    } catch (e) {
      expect(e instanceof Error && "id" in e ? e.id : undefined).toBe(
        "invalid_request"
      );
    }
  });
});
