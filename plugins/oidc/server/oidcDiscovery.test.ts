import fetchMock from "jest-fetch-mock";
import { fetchOIDCConfiguration } from "./oidcDiscovery";

beforeEach(() => {
  fetchMock.resetMocks();
});

describe("fetchOIDCConfiguration", () => {
  it("should fetch and parse OIDC configuration successfully", async () => {
    const mockConfig = {
      issuer: "https://example.com",
      authorization_endpoint: "https://example.com/auth",
      token_endpoint: "https://example.com/token",
      userinfo_endpoint: "https://example.com/userinfo",
      jwks_uri: "https://example.com/jwks",
      end_session_endpoint: "https://example.com/logout",
      scopes_supported: ["openid", "profile", "email"],
      response_types_supported: ["code"],
      grant_types_supported: ["authorization_code"],
    };

    fetchMock.mockResponseOnce(JSON.stringify(mockConfig));

    const result = await fetchOIDCConfiguration("https://example.com");

    expect(fetchMock).toHaveBeenCalledWith(
      "https://example.com/.well-known/openid-configuration",
      expect.objectContaining({
        method: "GET",
        headers: expect.objectContaining({
          Accept: "application/json",
        }),
      })
    );

    expect(result).toEqual(mockConfig);
  });

  it("should handle issuer URL with trailing slash", async () => {
    const mockConfig = {
      issuer: "https://example.com/",
      authorization_endpoint: "https://example.com/auth",
      token_endpoint: "https://example.com/token",
      userinfo_endpoint: "https://example.com/userinfo",
    };

    fetchMock.mockResponseOnce(JSON.stringify(mockConfig));

    await fetchOIDCConfiguration("https://example.com/");

    expect(fetchMock).toHaveBeenCalledWith(
      "https://example.com/.well-known/openid-configuration",
      expect.any(Object)
    );
  });

  it("should throw error when HTTP request fails", async () => {
    fetchMock.mockRejectOnce(new Error("Network error"));

    await expect(fetchOIDCConfiguration("https://example.com")).rejects.toThrow(
      "Network error"
    );
  });

  it("should throw error when response is not ok", async () => {
    fetchMock.mockResponseOnce("Not Found", { status: 404 });

    await expect(fetchOIDCConfiguration("https://example.com")).rejects.toThrow(
      "Failed to fetch OIDC configuration: 404 Not Found"
    );
  });

  it("should throw error when required endpoints are missing", async () => {
    const incompleteConfig = {
      issuer: "https://example.com",
      authorization_endpoint: "https://example.com/auth",
      // Missing token_endpoint and userinfo_endpoint
    };

    fetchMock.mockResponseOnce(JSON.stringify(incompleteConfig));

    await expect(fetchOIDCConfiguration("https://example.com")).rejects.toThrow(
      "Missing token_endpoint in OIDC configuration"
    );
  });

  it("should validate all required endpoints", async () => {
    const configMissingAuth = {
      issuer: "https://example.com",
      token_endpoint: "https://example.com/token",
      userinfo_endpoint: "https://example.com/userinfo",
    };

    fetchMock.mockResponseOnce(JSON.stringify(configMissingAuth));

    await expect(fetchOIDCConfiguration("https://example.com")).rejects.toThrow(
      "Missing authorization_endpoint in OIDC configuration"
    );
  });

  it("should handle issuer URL with subdirectory path", async () => {
    const mockConfig = {
      issuer: "https://auth.example.com/application/o/outline/",
      authorization_endpoint:
        "https://auth.example.com/application/o/outline/auth",
      token_endpoint: "https://auth.example.com/application/o/outline/token",
      userinfo_endpoint:
        "https://auth.example.com/application/o/outline/userinfo",
    };

    fetchMock.mockResponseOnce(JSON.stringify(mockConfig));

    const result = await fetchOIDCConfiguration(
      "https://auth.example.com/application/o/outline/"
    );

    expect(fetchMock).toHaveBeenCalledWith(
      "https://auth.example.com/application/o/outline/.well-known/openid-configuration",
      expect.objectContaining({
        method: "GET",
        headers: expect.objectContaining({
          Accept: "application/json",
        }),
      })
    );

    expect(result).toEqual(mockConfig);
  });

  it("should handle issuer URL with subdirectory path without trailing slash", async () => {
    const mockConfig = {
      issuer: "https://auth.example.com/application/o/outline",
      authorization_endpoint:
        "https://auth.example.com/application/o/outline/auth",
      token_endpoint: "https://auth.example.com/application/o/outline/token",
      userinfo_endpoint:
        "https://auth.example.com/application/o/outline/userinfo",
    };

    fetchMock.mockResponseOnce(JSON.stringify(mockConfig));

    const result = await fetchOIDCConfiguration(
      "https://auth.example.com/application/o/outline"
    );

    expect(fetchMock).toHaveBeenCalledWith(
      "https://auth.example.com/application/o/outline/.well-known/openid-configuration",
      expect.objectContaining({
        method: "GET",
        headers: expect.objectContaining({
          Accept: "application/json",
        }),
      })
    );

    expect(result).toEqual(mockConfig);
  });

  it("should handle issuer URL that already contains well-known path", async () => {
    const mockConfig = {
      issuer: "https://example.com",
      authorization_endpoint: "https://example.com/auth",
      token_endpoint: "https://example.com/token",
      userinfo_endpoint: "https://example.com/userinfo",
    };

    fetchMock.mockResponseOnce(JSON.stringify(mockConfig));

    const result = await fetchOIDCConfiguration(
      "https://example.com/.well-known/openid-configuration"
    );

    expect(fetchMock).toHaveBeenCalledWith(
      "https://example.com/.well-known/openid-configuration",
      expect.any(Object)
    );

    expect(result).toEqual(mockConfig);
  });
});
