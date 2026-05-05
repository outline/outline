import {
  http,
  HttpResponse,
  type DefaultBodyType,
  type StrictRequest,
} from "msw";
import { server } from "@server/test/msw";
import { fetchOIDCConfiguration } from "./oidcDiscovery";

const captureRequest = (url: string, response: Response | (() => Response)) => {
  const captured: { request?: StrictRequest<DefaultBodyType> } = {};
  server.use(
    http.get(url, ({ request }) => {
      captured.request = request;
      return typeof response === "function" ? response() : response;
    })
  );
  return captured;
};

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

    const captured = captureRequest(
      "https://example.com/.well-known/openid-configuration",
      () => HttpResponse.json(mockConfig)
    );

    const result = await fetchOIDCConfiguration("https://example.com");

    expect(captured.request?.url).toBe(
      "https://example.com/.well-known/openid-configuration"
    );
    expect(captured.request?.method).toBe("GET");
    expect(captured.request?.headers.get("Accept")).toBe("application/json");
    expect(result).toEqual(mockConfig);
  });

  it("should handle issuer URL with trailing slash", async () => {
    const mockConfig = {
      issuer: "https://example.com/",
      authorization_endpoint: "https://example.com/auth",
      token_endpoint: "https://example.com/token",
      userinfo_endpoint: "https://example.com/userinfo",
    };

    const captured = captureRequest(
      "https://example.com/.well-known/openid-configuration",
      () => HttpResponse.json(mockConfig)
    );

    await fetchOIDCConfiguration("https://example.com/");

    expect(captured.request?.url).toBe(
      "https://example.com/.well-known/openid-configuration"
    );
  });

  it("should throw error when HTTP request fails", async () => {
    server.use(
      http.get("https://example.com/.well-known/openid-configuration", () =>
        HttpResponse.error()
      )
    );

    await expect(
      fetchOIDCConfiguration("https://example.com")
    ).rejects.toThrow();
  });

  it("should throw error when response is not ok", async () => {
    server.use(
      http.get(
        "https://example.com/.well-known/openid-configuration",
        () => new HttpResponse("Not Found", { status: 404 })
      )
    );

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

    server.use(
      http.get("https://example.com/.well-known/openid-configuration", () =>
        HttpResponse.json(incompleteConfig)
      )
    );

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

    server.use(
      http.get("https://example.com/.well-known/openid-configuration", () =>
        HttpResponse.json(configMissingAuth)
      )
    );

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

    const captured = captureRequest(
      "https://auth.example.com/application/o/outline/.well-known/openid-configuration",
      () => HttpResponse.json(mockConfig)
    );

    const result = await fetchOIDCConfiguration(
      "https://auth.example.com/application/o/outline/"
    );

    expect(captured.request?.url).toBe(
      "https://auth.example.com/application/o/outline/.well-known/openid-configuration"
    );
    expect(captured.request?.method).toBe("GET");
    expect(captured.request?.headers.get("Accept")).toBe("application/json");
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

    const captured = captureRequest(
      "https://auth.example.com/application/o/outline/.well-known/openid-configuration",
      () => HttpResponse.json(mockConfig)
    );

    const result = await fetchOIDCConfiguration(
      "https://auth.example.com/application/o/outline"
    );

    expect(captured.request?.url).toBe(
      "https://auth.example.com/application/o/outline/.well-known/openid-configuration"
    );
    expect(captured.request?.method).toBe("GET");
    expect(captured.request?.headers.get("Accept")).toBe("application/json");
    expect(result).toEqual(mockConfig);
  });

  it("should handle issuer URL that already contains well-known path", async () => {
    const mockConfig = {
      issuer: "https://example.com",
      authorization_endpoint: "https://example.com/auth",
      token_endpoint: "https://example.com/token",
      userinfo_endpoint: "https://example.com/userinfo",
    };

    const captured = captureRequest(
      "https://example.com/.well-known/openid-configuration",
      () => HttpResponse.json(mockConfig)
    );

    const result = await fetchOIDCConfiguration(
      "https://example.com/.well-known/openid-configuration"
    );

    expect(captured.request?.url).toBe(
      "https://example.com/.well-known/openid-configuration"
    );
    expect(result).toEqual(mockConfig);
  });
});
