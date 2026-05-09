import type { DefaultState } from "koa";
import { randomString } from "@shared/random";
import { Scope } from "@shared/types";
import {
  buildUser,
  buildTeam,
  buildAdmin,
  buildApiKey,
  buildOAuthAuthentication,
} from "@server/test/factories";
import { AuthenticationType } from "@server/types";
import auth from "./authentication";

describe("Authentication middleware", () => {
  describe("with session JWT", () => {
    it("should authenticate with correct session token", async () => {
      const state = {} as DefaultState;
      const user = await buildUser();
      const authMiddleware = auth();
      await authMiddleware(
        {
          // @ts-expect-error mock request
          request: {
            get: vi.fn(() => `Bearer ${user.getJwtToken()}`),
          },
          state,
          cache: {},
        },
        vi.fn()
      );
      expect(state.auth.user.id).toEqual(user.id);
    });

    it("should return error with invalid session token", async () => {
      const state = {} as DefaultState;
      const user = await buildUser();
      const authMiddleware = auth();

      try {
        await authMiddleware(
          {
            // @ts-expect-error mock request
            request: {
              get: vi.fn(() => `Bearer ${user.getJwtToken()}error`),
            },
            state,
            cache: {},
          },
          vi.fn()
        );
      } catch (e) {
        expect(e.message).toBe("Invalid token");
      }
    });

    it("should return error if AuthenticationType mismatches", async () => {
      const state = {} as DefaultState;
      const user = await buildUser();
      const authMiddleware = auth({
        type: AuthenticationType.API,
      });

      try {
        await authMiddleware(
          {
            // @ts-expect-error mock request
            request: {
              get: vi.fn(() => `Bearer ${user.getJwtToken()}`),
            },
            state,
            cache: {},
          },
          vi.fn()
        );
      } catch (e) {
        expect(e.message).toBe("Invalid authentication type");
      }
    });
  });

  describe("with API key", () => {
    it("should authenticate user with valid API key", async () => {
      const state = {} as DefaultState;
      const user = await buildUser();
      const authMiddleware = auth();
      const key = await buildApiKey({ userId: user.id });
      await authMiddleware(
        {
          // @ts-expect-error mock request
          request: {
            get: vi.fn(() => `Bearer ${key.value}`),
          },
          state,
          cache: {},
        },
        vi.fn()
      );
      expect(state.auth.user.id).toEqual(user.id);
    });
    it("should authenticate with global read scope on read endpoints", async () => {
      const state = {} as DefaultState;
      const user = await buildUser();
      const authMiddleware = auth();
      const key = await buildApiKey({
        userId: user.id,
        scope: [Scope.Read],
      });

      await authMiddleware(
        {
          originalUrl: "/api/auth.info",
          // @ts-expect-error mock request
          request: {
            url: "/auth.info",
            get: vi.fn(() => `Bearer ${key.value}`),
          },
          state,
          cache: {},
        },
        vi.fn()
      );
      expect(state.auth.user.id).toEqual(user.id);
    });

    it("should return 403 authorization error when scope does not match", async () => {
      const state = {} as DefaultState;
      const user = await buildUser();
      const authMiddleware = auth();
      const key = await buildApiKey({
        userId: user.id,
        scope: [Scope.Read],
      });

      try {
        await authMiddleware(
          {
            originalUrl: "/api/documents.create",
            // @ts-expect-error mock request
            request: {
              url: "/documents.create",
              get: vi.fn(() => `Bearer ${key.value}`),
            },
            state,
            cache: {},
          },
          vi.fn()
        );
        throw new Error("Expected error to be thrown");
      } catch (e) {
        expect(e.status).toBe(403);
        expect(e.id).toBe("authorization_error");
        expect(e.message).toContain("does not have access to this resource");
      }
    });

    it("should return error with invalid API key", async () => {
      const state = {} as DefaultState;
      const authMiddleware = auth();

      try {
        await authMiddleware(
          {
            // @ts-expect-error mock request
            request: {
              get: vi.fn(() => `Bearer ${randomString(38)}`),
            },
            state,
            cache: {},
          },
          vi.fn()
        );
      } catch (e) {
        expect(e.message).toBe("Invalid API key");
      }
    });
  });

  describe("with OAuth access token", () => {
    it("should authenticate user with valid OAuth access token", async () => {
      const state = {} as DefaultState;
      const user = await buildUser();
      const authMiddleware = auth();
      const authentication = await buildOAuthAuthentication({
        user,
        scope: [Scope.Read],
      });

      await authMiddleware(
        {
          originalUrl: "/api/users.info",
          // @ts-expect-error mock request
          request: {
            url: "/users.info",
            get: vi.fn(() => `Bearer ${authentication.accessToken}`),
          },
          state,
          cache: {},
        },
        vi.fn()
      );
      expect(state.auth.user.id).toEqual(user.id);
    });

    it("should return error with invalid scope", async () => {
      const state = {} as DefaultState;
      const user = await buildUser();
      const authMiddleware = auth();
      const authentication = await buildOAuthAuthentication({
        user,
        scope: [Scope.Read],
      });

      try {
        await authMiddleware(
          {
            originalUrl: "/api/documents.create",
            // @ts-expect-error mock request
            request: {
              url: "/documents.create",
              get: vi.fn(() => `Bearer ${authentication.accessToken}`),
            },
            state,
            cache: {},
          },
          vi.fn()
        );
      } catch (e) {
        expect(e.message).toContain("does not have access to this resource");
      }
    });

    it("should return error with OAuth access token in body", async () => {
      const state = {} as DefaultState;
      const user = await buildUser();
      const authMiddleware = auth();
      const authentication = await buildOAuthAuthentication({
        user,
        scope: [Scope.Read],
      });
      try {
        await authMiddleware(
          {
            originalUrl: "/api/users.info",
            request: {
              url: "/users.info",
              // @ts-expect-error mock request
              get: vi.fn(() => null),
              body: {
                token: authentication.accessToken,
              },
            },
            state,
            cache: {},
          },
          vi.fn()
        );
      } catch (e) {
        expect(e.message).toContain(
          "must be passed in the Authorization header"
        );
      }
    });
  });

  it("should return error message if no auth token is available", async () => {
    const state = {} as DefaultState;
    const authMiddleware = auth();

    try {
      await authMiddleware(
        {
          // @ts-expect-error mock request
          request: {
            get: vi.fn(() => "error"),
          },
          state,
          cache: {},
        },
        vi.fn()
      );
    } catch (e) {
      expect(e.message).toBe(
        'Bad Authorization header format. Format is "Authorization: Bearer <token>"'
      );
    }
  });

  it("should allow passing auth token as a GET param", async () => {
    const state = {} as DefaultState;
    const user = await buildUser();
    const authMiddleware = auth();
    await authMiddleware(
      {
        request: {
          // @ts-expect-error mock request
          get: vi.fn(() => null),
          query: {
            token: user.getJwtToken(),
          },
        },
        state,
        cache: {},
      },
      vi.fn()
    );
    expect(state.auth.user.id).toEqual(user.id);
  });

  it("should allow passing auth token in body params", async () => {
    const state = {} as DefaultState;
    const user = await buildUser();
    const authMiddleware = auth();
    await authMiddleware(
      {
        request: {
          // @ts-expect-error mock request
          get: vi.fn(() => null),
          body: {
            token: user.getJwtToken(),
          },
        },
        state,
        cache: {},
      },
      vi.fn()
    );
    expect(state.auth.user.id).toEqual(user.id);
  });

  it("should return an error for suspended users", async () => {
    const state = {} as DefaultState;
    const admin = await buildAdmin();
    const user = await buildUser({
      suspendedAt: new Date(),
      suspendedById: admin.id,
    });
    const authMiddleware = auth();
    let error;

    try {
      await authMiddleware(
        {
          // @ts-expect-error mock request
          request: {
            get: vi.fn(() => `Bearer ${user.getJwtToken()}`),
          },
          state,
          cache: {},
        },
        vi.fn()
      );
    } catch (err) {
      error = err;
    }

    expect(error.message).toEqual(
      "Your access has been suspended by a workspace admin"
    );
    expect(error.errorData.adminEmail).toEqual(admin.email);
  });

  it("should return an error for deleted team", async () => {
    const state = {} as DefaultState;
    const team = await buildTeam();
    const user = await buildUser({ teamId: team.id });
    await team.destroy();
    const authMiddleware = auth();
    let error;

    try {
      await authMiddleware(
        {
          // @ts-expect-error mock request
          request: {
            get: vi.fn(() => `Bearer ${user.getJwtToken()}`),
          },
          state,
          cache: {},
        },
        vi.fn()
      );
    } catch (err) {
      error = err;
    }

    expect(error.message).toEqual("Invalid token");
  });
});
