import fetch from "./fetch";
import OAuthClient from "./oauth";
import { AuthenticationError, InvalidRequestError } from "../errors";

// Mock the fetch utility
jest.mock("./fetch");
const mockFetch = fetch as jest.MockedFunction<typeof fetch>;

// Create a concrete implementation of the abstract OAuthClient for testing
class TestOAuthClient extends OAuthClient {
  constructor(clientId: string, clientSecret: string) {
    super(clientId, clientSecret);
    this.endpoints = {
      authorize: "https://example.com/authorize",
      token: "https://example.com/token",
      userinfo: "https://example.com/userinfo",
    };
  }
}

describe("OAuthClient", () => {
  let client: TestOAuthClient;

  beforeEach(() => {
    client = new TestOAuthClient("test-client-id", "test-client-secret");
    jest.clearAllMocks();
  });

  describe("userInfo", () => {
    it("should return user data for successful response", async () => {
      const mockUserData = {
        id: "123",
        name: "Test User",
        email: "test@example.com",
      };
      mockFetch.mockResolvedValue({
        status: 200,
        json: jest.fn().mockResolvedValue(mockUserData),
      } as any);

      const result = await client.userInfo("valid-access-token");

      expect(result).toEqual(mockUserData);
      expect(mockFetch).toHaveBeenCalledWith("https://example.com/userinfo", {
        method: "GET",
        allowPrivateIPAddress: true,
        headers: {
          Authorization: "Bearer valid-access-token",
          "Content-Type": "application/json",
        },
      });
    });

    it("should throw AuthenticationError for 401 response with empty body", async () => {
      mockFetch.mockResolvedValue({
        status: 401,
        json: jest
          .fn()
          .mockRejectedValue(new Error("Unexpected end of JSON input")),
      } as any);

      await expect(client.userInfo("invalid-access-token")).rejects.toThrow(
        AuthenticationError
      );
    });

    it("should throw AuthenticationError for 401 response with JSON body", async () => {
      mockFetch.mockResolvedValue({
        status: 401,
        json: jest.fn().mockResolvedValue({ error: "unauthorized" }),
      } as any);

      await expect(client.userInfo("invalid-access-token")).rejects.toThrow(
        AuthenticationError
      );
    });

    it("should throw AuthenticationError for other non-success status codes", async () => {
      mockFetch.mockResolvedValue({
        status: 403,
        json: jest.fn().mockResolvedValue({ error: "forbidden" }),
      } as any);

      await expect(client.userInfo("access-token")).rejects.toThrow(
        AuthenticationError
      );
    });

    it("should throw InvalidRequestError for network errors", async () => {
      mockFetch.mockRejectedValue(new Error("Network error"));

      await expect(client.userInfo("access-token")).rejects.toThrow(
        InvalidRequestError
      );
    });

    it("should throw InvalidRequestError for JSON parsing errors on successful response", async () => {
      mockFetch.mockResolvedValue({
        status: 200,
        json: jest.fn().mockRejectedValue(new Error("Invalid JSON")),
      } as any);

      await expect(client.userInfo("access-token")).rejects.toThrow(
        InvalidRequestError
      );
    });
  });
});
