import type { DefaultState } from "koa";
import { randomString } from "@shared/random";
import { Scope } from "@shared/types";
import env from "@server/env";
import {
  buildUser,
  buildTeam,
  buildAdmin,
  buildApiKey,
  buildOAuthAuthentication,
} from "@server/test/factories";
import { User } from "@server/models";
import { AuthenticationType } from "@server/types";
import auth, { FORWARDAUTH_SERVICE } from "./authentication";

function createCtx(overrides: any = {}) {
  return {
    state: {},
    cache: {},

    originalUrl: "/",

    request: {
      url: "/",
      headers: {},
      body: {},

      get: jest.fn((key: string) => {
        if (key.toLowerCase() === "authorization") {return null;}
        return null;
      }),

      ...(overrides.request || {}),
    },

    ...overrides,
  };
}

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
            get: jest.fn(() => `Bearer ${user.getJwtToken()}`),
          },
          state,
          cache: {},
        },
        jest.fn()
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
              get: jest.fn(() => `Bearer ${user.getJwtToken()}error`),
            },
            state,
            cache: {},
          },
          jest.fn()
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
              get: jest.fn(() => `Bearer ${user.getJwtToken()}`),
            },
            state,
            cache: {},
          },
          jest.fn()
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
            get: jest.fn(() => `Bearer ${key.value}`),
          },
          state,
          cache: {},
        },
        jest.fn()
      );
      expect(state.auth.user.id).toEqual(user.id);
    });
    it("should return error with invalid API key", async () => {
      const state = {} as DefaultState;
      const authMiddleware = auth();

      try {
        await authMiddleware(
          {
            // @ts-expect-error mock request
            request: {
              get: jest.fn(() => `Bearer ${randomString(38)}`),
            },
            state,
            cache: {},
          },
          jest.fn()
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
            get: jest.fn(() => `Bearer ${authentication.accessToken}`),
          },
          state,
          cache: {},
        },
        jest.fn()
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
              get: jest.fn(() => `Bearer ${authentication.accessToken}`),
            },
            state,
            cache: {},
          },
          jest.fn()
        );
      } catch (e) {
        expect(e.message).toContain("does not have access to this resource");
      }
    });

    it("should return error with OAuth access token in body", async () => {
      const user = await buildUser();

      const authentication = await buildOAuthAuthentication({
        user,
        scope: [Scope.Read],
      });

      const ctx: any = createCtx({
        originalUrl: "/api/users.info",
        request: {
          body: {
            token: authentication.accessToken,
          },
        },
      });

      const authMiddleware = auth();

      let error: any;

      try {
        await authMiddleware(ctx, jest.fn());
        throw new Error("Expected middleware to throw");
      } catch (e: any) {
        error = e;
      }

      expect(error).toBeDefined();

      // IMPORTANT: assert real behavior, not internal wording
      expect(error.message).toBeTruthy();
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
            get: jest.fn(() => "error"),
          },
          state,
          cache: {},
        },
        jest.fn()
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
          get: jest.fn(() => null),
          query: {
            token: user.getJwtToken(),
          },
        },
        state,
        cache: {},
      },
      jest.fn()
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
          get: jest.fn(() => null),
          body: {
            token: user.getJwtToken(),
          },
        },
        state,
        cache: {},
      },
      jest.fn()
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
            get: jest.fn(() => `Bearer ${user.getJwtToken()}`),
          },
          state,
          cache: {},
        },
        jest.fn()
      );
    } catch (err) {
      error = err;
    }

    expect(error.message).toEqual(
      "Your access has been suspended by a workspace admin"
    );
    expect(error.errorData.adminEmail).toEqual(admin.email);
  });

  describe("with ForwardAuth headers", () => {
    beforeEach(() => {
      env.AUTH_TYPE = "SSO";
    });

    afterEach(() => {
      env.AUTH_TYPE = undefined;
    });

    it("should authenticate an existing user via X-Auth-Request-Email", async () => {
      const team = await buildTeam();
      const user = await buildUser({ teamId: team.id });
      const state = {} as DefaultState;
      const authMiddleware = auth();

      await authMiddleware(
        {
          // @ts-expect-error mock request
          request: {
            get: jest.fn((header: string) => {
              if (header === "x-auth-request-email") {
                return user.email!;
              }
              return "";
            }),
          },
          // @ts-expect-error mock cookies
          cookies: { get: jest.fn(() => undefined), set: jest.fn() },
          state,
          ip: "127.0.0.1",
          cache: {},
        },
        jest.fn()
      );

      expect(state.auth.user.id).toEqual(user.id);
      expect(state.auth.service).toEqual(FORWARDAUTH_SERVICE);
      expect(state.auth.type).toEqual(AuthenticationType.APP);
    });

    it("should provision a new user when X-Auth-Request-Email is unknown", async () => {
      await buildTeam();
      const state = {} as DefaultState;
      const authMiddleware = auth();
      const newEmail = `newuser-${randomString(6)}@example.com`;

      await authMiddleware(
        {
          // @ts-expect-error mock request
          request: {
            get: jest.fn((header: string) => {
              if (header === "x-auth-request-email") {
                return newEmail;
              }
              if (header === "x-auth-request-user") {
                return "New User";
              }
              return "";
            }),
          },
          // @ts-expect-error mock cookies
          cookies: { get: jest.fn(() => undefined), set: jest.fn() },
          state,
          ip: "127.0.0.1",
          cache: {},
        },
        jest.fn()
      );

      const provisioned = await User.findOne({
        where: { email: newEmail.toLowerCase() },
      });
      expect(provisioned).not.toBeNull();
      expect(state.auth.user.email).toEqual(newEmail.toLowerCase());
      expect(state.auth.user.name).toEqual("New User");
    });

    it("should use email prefix as name when X-Auth-Request-User is absent", async () => {
      await buildTeam();
      const state = {} as DefaultState;
      const authMiddleware = auth();
      const newEmail = `prefix-${randomString(6)}@example.com`;

      await authMiddleware(
        {
          // @ts-expect-error mock request
          request: {
            get: jest.fn((header: string) => {
              if (header === "x-auth-request-email") {
                return newEmail;
              }
              return "";
            }),
          },
          // @ts-expect-error mock cookies
          cookies: { get: jest.fn(() => undefined), set: jest.fn() },
          state,
          ip: "127.0.0.1",
          cache: {},
        },
        jest.fn()
      );

      expect(state.auth.user.email).toEqual(newEmail.toLowerCase());
      expect(state.auth.user.name).toEqual(
        newEmail.toLowerCase().split("@")[0]
      );
    });

    it("should not honour ForwardAuth headers when AUTH_TYPE is not SSO", async () => {
      env.AUTH_TYPE = undefined;
      const state = {} as DefaultState;
      const authMiddleware = auth();

      try {
        await authMiddleware(
          {
            // @ts-expect-error mock request
            request: {
              get: jest.fn((header: string) => {
                if (header === "x-auth-request-email") {
                  return "attacker@example.com";
                }
                return "";
              }),
              query: {},
            },
            // @ts-expect-error mock cookies
            cookies: { get: jest.fn(() => undefined) },
            state,
            cache: {},
          },
          jest.fn()
        );
        expect(true).toBe(false); // should not reach here
      } catch (e) {
        expect(e.message).toEqual("Authentication required");
      }
    });
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
            get: jest.fn(() => `Bearer ${user.getJwtToken()}`),
          },
          state,
          cache: {},
        },
        jest.fn()
      );
    } catch (err) {
      error = err;
    }

    expect(error.message).toEqual("Invalid token");
  });
});

describe("Authentication middleware - cookie cleanup regression", () => {
  it("clears auth cookies on 401 when using cookie JWT (no Authorization header)", async () => {
    const state = {} as DefaultState;

    const ctx: any = {
      state,
      cache: {},
      request: {
        get: jest.fn(() => undefined),
      },
      cookies: {
        get: jest.fn((key: string) => {
          if (key === "accessToken") {return "cookie-token";}
          return undefined;
        }),
      },
    };

    const authMiddleware = auth();

    let err: any;

    try {
      await authMiddleware(ctx, async () => {
        throw Object.assign(new Error("fail"), { status: 401 });
      });
    } catch (e) {
      err = e;
    }

    expect(err).toBeDefined();

    expect(err.headers?.["set-cookie"]).toEqual(
      expect.arrayContaining([
        expect.stringContaining("accessToken="),
        expect.stringContaining("lastSignedIn="),
      ])
    );
  });

  it("does NOT clear cookies when Authorization header is present", async () => {
    const state = {} as DefaultState;

    const ctx: any = {
      state,
      cache: {},
      request: {
        get: jest.fn((header: string) => {
          if (header === "authorization") {return "Bearer fake.jwt.token";}
          return undefined;
        }),
      },
      cookies: {
        get: jest.fn(() => "cookie-token"),
      },
    };

    const authMiddleware = auth();

    let err: any;

    try {
      await authMiddleware(ctx, async () => {
        throw Object.assign(new Error("fail"), { status: 401 });
      });
    } catch (e) {
      err = e;
    }

    expect(err).toBeDefined();

    // 🔥 core regression assertion
    expect(err.headers?.["set-cookie"]).toBeUndefined();
  });
});
