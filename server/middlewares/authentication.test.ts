import { DefaultState } from "koa";
import randomstring from "randomstring";
import {
  buildUser,
  buildTeam,
  buildAdmin,
  buildApiKey,
} from "@server/test/factories";
import auth from "./authentication";

describe("Authentication middleware", () => {
  describe("with JWT", () => {
    it("should authenticate with correct token", async () => {
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

    it("should return error with invalid token", async () => {
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
              get: jest.fn(() => `Bearer ${randomstring.generate(38)}`),
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
