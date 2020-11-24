/* eslint-disable flowtype/require-valid-file-annotation */
import randomstring from "randomstring";
import { ApiKey } from "../models";
import { buildUser } from "../test/factories";
import { flushdb, seed } from "../test/support";
import auth from "./authentication";

beforeEach(() => flushdb());

describe("Authentication middleware", () => {
  describe("with JWT", () => {
    it("should authenticate with correct token", async () => {
      const state = {};
      const { user } = await seed();
      const authMiddleware = auth();

      await authMiddleware(
        {
          request: {
            get: jest.fn(() => `Bearer ${user.getJwtToken()}`),
          },
          state,
          cache: {},
        },
        jest.fn()
      );
      expect(state.user.id).toEqual(user.id);
    });

    it("should return error with invalid token", async () => {
      const state = {};
      const { user } = await seed();
      const authMiddleware = auth();

      try {
        await authMiddleware(
          {
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
      const state = {};
      const { user } = await seed();
      const authMiddleware = auth();
      const key = await ApiKey.create({
        userId: user.id,
      });

      await authMiddleware(
        {
          request: {
            get: jest.fn(() => `Bearer ${key.secret}`),
          },
          state,
          cache: {},
        },
        jest.fn()
      );
      expect(state.user.id).toEqual(user.id);
    });

    it("should return error with invalid API key", async () => {
      const state = {};
      const authMiddleware = auth();

      try {
        await authMiddleware(
          {
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
    const state = {};
    const authMiddleware = auth();

    try {
      await authMiddleware(
        {
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
    const state = {};
    const { user } = await seed();
    const authMiddleware = auth();

    await authMiddleware(
      {
        request: {
          get: jest.fn(() => null),
          query: {
            token: user.getJwtToken(),
          },
        },
        body: {},
        state,
        cache: {},
      },
      jest.fn()
    );
    expect(state.user.id).toEqual(user.id);
  });

  it("should allow passing auth token in body params", async () => {
    const state = {};
    const { user } = await seed();
    const authMiddleware = auth();

    await authMiddleware(
      {
        request: {
          get: jest.fn(() => null),
        },
        body: {
          token: user.getJwtToken(),
        },
        state,
        cache: {},
      },
      jest.fn()
    );
    expect(state.user.id).toEqual(user.id);
  });

  it("should return an error for suspended users", async () => {
    const state = {};
    const admin = await buildUser({});
    const user = await buildUser({
      suspendedAt: new Date(),
      suspendedById: admin.id,
    });
    const authMiddleware = auth();

    try {
      await authMiddleware(
        {
          request: {
            get: jest.fn(() => `Bearer ${user.getJwtToken()}`),
          },
          state,
          cache: {},
        },
        jest.fn()
      );
    } catch (e) {
      expect(e.message).toEqual(
        "Your access has been suspended by the team admin"
      );
      expect(e.errorData.adminEmail).toEqual(admin.email);
    }
  });
});
