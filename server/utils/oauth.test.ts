import fetchMock from "jest-fetch-mock";
import OAuthClient from "./oauth";

class MinimalOAuthClient extends OAuthClient {
  endpoints = {
    authorize: "http://example.com/authorize",
    token: "http://example.com/token",
    userinfo: "http://example.com/userinfo",
  };
}

beforeEach(() => {
  fetchMock.resetMocks();
});

describe("userInfo", () => {
  it("should work with empty-body 401 Unauthorized responses", async () => {
    fetchMock.mockResponseOnce("", {
      status: 401,
      statusText: "unauthorized",
    });

    const client = new MinimalOAuthClient("clientid", "clientsecret");
    try {
      expect.assertions(1);
      await client.userInfo("token");
    } catch (e) {
      expect(e.id).toBe("authentication_required");
    }
  });
});
