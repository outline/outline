import type { DefaultState } from "koa";
import { errToString } from "@shared/utils/error";
import { randomString } from "@shared/random";
import { Scope } from "@shared/types";
import {
  buildUser,
  buildTeam,
  buildAdmin,
  buildApiKey,
  buildOAuthAuthentication,
  buildSubdomain,
} from "@server/test/factories";
import sharedEnv from "@shared/env";
import env from "@server/env";
import { buildMockContext, setCloudHosted } from "@server/test/support";
import { AuthenticationType } from "@server/types";
import auth from "./authentication";

describe("Authentication middleware", () => {
  describe("with session JWT", () => {
    it("should authenticate with correct session token", async () => {
      const state = {} as DefaultState;
      const user = await buildUser();
      const authMiddleware = auth();
      await authMiddleware(
        buildMockContext({
          request: {
            get: vi.fn(() => `Bearer ${user.getSessionToken()}`),
          },
          state,
          cache: {},
        }),
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
          buildMockContext({
            request: {
              get: vi.fn(() => `Bearer ${user.getSessionToken()}error`),
            },
            state,
            cache: {},
          }),
          vi.fn()
        );
      } catch (e) {
        expect(errToString(e)).toBe("Invalid token");
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
          buildMockContext({
            request: {
              get: vi.fn(() => `Bearer ${user.getSessionToken()}`),
            },
            state,
            cache: {},
          }),
          vi.fn()
        );
      } catch (e) {
        expect(errToString(e)).toBe("Invalid authentication type");
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
        buildMockContext({
          request: {
            get: vi.fn(() => `Bearer ${key.value}`),
          },
          state,
          cache: {},
        }),
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
        buildMockContext({
          originalUrl: "/api/auth.info",
          request: {
            url: "/auth.info",
            get: vi.fn(() => `Bearer ${key.value}`),
          },
          state,
          cache: {},
        }),
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
          buildMockContext({
            originalUrl: "/api/documents.create",
            request: {
              url: "/documents.create",
              get: vi.fn(() => `Bearer ${key.value}`),
            },
            state,
            cache: {},
          }),
          vi.fn()
        );
        throw new Error("Expected error to be thrown");
      } catch (e) {
        expect(e).toHaveProperty("status", 403);
        expect(e).toHaveProperty("id", "authorization_error");
        expect(errToString(e)).toContain(
          "does not have access to this resource"
        );
      }
    });

    it("should return error with invalid API key", async () => {
      const state = {} as DefaultState;
      const authMiddleware = auth();

      try {
        await authMiddleware(
          buildMockContext({
            request: {
              get: vi.fn(() => `Bearer ${randomString(38)}`),
            },
            state,
            cache: {},
          }),
          vi.fn()
        );
      } catch (e) {
        expect(errToString(e)).toBe("Invalid API key");
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
        buildMockContext({
          originalUrl: "/api/users.info",
          request: {
            url: "/users.info",
            get: vi.fn(() => `Bearer ${authentication.accessToken}`),
          },
          state,
          cache: {},
        }),
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
          buildMockContext({
            originalUrl: "/api/documents.create",
            request: {
              url: "/documents.create",
              get: vi.fn(() => `Bearer ${authentication.accessToken}`),
            },
            state,
            cache: {},
          }),
          vi.fn()
        );
      } catch (e) {
        expect(errToString(e)).toContain(
          "does not have access to this resource"
        );
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
          buildMockContext({
            originalUrl: "/api/users.info",
            request: {
              url: "/users.info",
              get: vi.fn(() => null),
              body: {
                token: authentication.accessToken,
              },
            },
            state,
            cache: {},
          }),
          vi.fn()
        );
      } catch (e) {
        expect(errToString(e)).toContain(
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
        buildMockContext({
          request: {
            get: vi.fn(() => "error"),
          },
          state,
          cache: {},
        }),
        vi.fn()
      );
    } catch (e) {
      expect(errToString(e)).toBe(
        'Bad Authorization header format. Format is "Authorization: Bearer <token>"'
      );
    }
  });

  it("should allow passing session token in a cookie", async () => {
    const state = {} as DefaultState;
    const user = await buildUser();
    const authMiddleware = auth();
    await authMiddleware(
      buildMockContext({
        request: {
          get: vi.fn(() => null),
        },
        cookies: {
          get: vi.fn(() => user.getSessionToken()),
        },
        state,
        cache: {},
      }),
      vi.fn()
    );
    expect(state.auth.user.id).toEqual(user.id);
  });

  it("should return error with session token as a GET param", async () => {
    const state = {} as DefaultState;
    const user = await buildUser();
    const authMiddleware = auth();

    await expect(
      authMiddleware(
        buildMockContext({
          request: {
            get: vi.fn(() => null),
            query: {
              token: user.getSessionToken(),
            },
          },
          state,
          cache: {},
        }),
        vi.fn()
      )
    ).rejects.toThrow(
      "Session token must be passed in the cookie or Authorization header"
    );
  });

  it("should return error with session token in body params", async () => {
    const state = {} as DefaultState;
    const user = await buildUser();
    const authMiddleware = auth();

    await expect(
      authMiddleware(
        buildMockContext({
          request: {
            get: vi.fn(() => null),
            body: {
              token: user.getSessionToken(),
            },
          },
          state,
          cache: {},
        }),
        vi.fn()
      )
    ).rejects.toThrow(
      "Session token must be passed in the cookie or Authorization header"
    );
  });

  it("should allow passing transfer token as a GET param", async () => {
    const state = {} as DefaultState;
    const user = await buildUser();
    const authMiddleware = auth();
    await authMiddleware(
      buildMockContext({
        request: {
          get: vi.fn(() => null),
          query: {
            token: user.getTransferToken(),
          },
        },
        state,
        cache: {},
      }),
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
        buildMockContext({
          request: {
            get: vi.fn(() => `Bearer ${user.getSessionToken()}`),
          },
          state,
          cache: {},
        }),
        vi.fn()
      );
    } catch (err) {
      error = err;
    }

    expect(errToString(error)).toEqual(
      "Your access has been suspended by a workspace admin"
    );
    expect(error).toHaveProperty("errorData.adminEmail", admin.email);
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
        buildMockContext({
          request: {
            get: vi.fn(() => `Bearer ${user.getSessionToken()}`),
          },
          state,
          cache: {},
        }),
        vi.fn()
      );
    } catch (err) {
      error = err;
    }

    expect(errToString(error)).toEqual("Invalid token");
  });
  describe("with skip", () => {
    it("should ignore credentials when skip returns true", async () => {
      const state = {} as DefaultState;
      const user = await buildUser();
      const apiKey = await buildApiKey({
        userId: user.id,
        scope: ["/api/documents.info"],
      });
      const next = vi.fn();
      const authMiddleware = auth({
        optional: true,
        skip: (ctx) => !!ctx.query.sig,
      });
      await authMiddleware(
        buildMockContext({
          request: {
            get: vi.fn(() => `Bearer ${apiKey.value}`),
          },
          query: { sig: "signature" },
          originalUrl: "/api/files.get?sig=signature",
          state,
          cache: {},
        }),
        next
      );
      expect(next).toHaveBeenCalled();
      expect(state.auth).toEqual({});
    });

    it("should authenticate when skip returns false", async () => {
      const state = {} as DefaultState;
      const user = await buildUser();
      const next = vi.fn();
      const authMiddleware = auth({
        optional: true,
        skip: (ctx) => !!ctx.query.sig,
      });
      await authMiddleware(
        buildMockContext({
          request: {
            get: vi.fn(() => `Bearer ${user.getSessionToken()}`),
          },
          query: {},
          state,
          cache: {},
        }),
        next
      );
      expect(next).toHaveBeenCalled();
      expect(state.auth.user.id).toEqual(user.id);
    });
  });

  describe("with cloud hosted workspace host", () => {
    const url = env.URL;

    beforeEach(setCloudHosted);

    afterEach(() => {
      env.URL = sharedEnv.URL = url;
    });

    const buildCookieContext = (
      token: string,
      hostname: string,
      state: DefaultState
    ) =>
      buildMockContext({
        request: {
          get: vi.fn(() => null),
          hostname,
        },
        cookies: {
          get: vi.fn(() => token),
        },
        state,
        cache: {},
      });

    it("should authenticate on the subdomain of the user's team", async () => {
      const state = {} as DefaultState;
      const team = await buildTeam({ subdomain: buildSubdomain() });
      const user = await buildUser({ teamId: team.id });
      await auth()(
        buildCookieContext(
          user.getSessionToken(),
          `${team.subdomain}.outline.dev`,
          state
        ),
        vi.fn()
      );
      expect(state.auth.user.id).toEqual(user.id);
    });

    it("should reject a session token on another team's subdomain", async () => {
      const state = {} as DefaultState;
      const [user, team] = await Promise.all([
        buildUser(),
        buildTeam({ subdomain: buildSubdomain() }),
      ]);
      await expect(
        auth()(
          buildCookieContext(
            user.getSessionToken(),
            `${team.subdomain}.outline.dev`,
            state
          ),
          vi.fn()
        )
      ).rejects.toThrow("Token is not valid for this workspace");
    });

    it("should reject an API key on another team's subdomain", async () => {
      const state = {} as DefaultState;
      const [user, team] = await Promise.all([
        buildUser(),
        buildTeam({ subdomain: buildSubdomain() }),
      ]);
      const apiKey = await buildApiKey({ userId: user.id });
      await expect(
        auth()(
          buildMockContext({
            request: {
              get: vi.fn(() => `Bearer ${apiKey.value}`),
              hostname: `${team.subdomain}.outline.dev`,
            },
            state,
            cache: {},
          }),
          vi.fn()
        )
      ).rejects.toThrow("Token is not valid for this workspace");
    });

    it("should treat optional auth on another team's subdomain as anonymous", async () => {
      const state = {} as DefaultState;
      const next = vi.fn();
      const [user, team] = await Promise.all([
        buildUser(),
        buildTeam({ subdomain: buildSubdomain() }),
      ]);
      await auth({ optional: true })(
        buildCookieContext(
          user.getSessionToken(),
          `${team.subdomain}.outline.dev`,
          state
        ),
        next
      );
      expect(next).toHaveBeenCalled();
      expect(state.auth).toEqual({});
    });

    it("should authenticate on a host without a team subdomain", async () => {
      const state = {} as DefaultState;
      const user = await buildUser();
      await auth()(
        buildCookieContext(user.getSessionToken(), "app.outline.dev", state),
        vi.fn()
      );
      expect(state.auth.user.id).toEqual(user.id);
    });
  });
});
