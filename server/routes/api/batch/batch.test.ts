import { RateLimiterRes } from "rate-limiter-flexible";
import env from "@server/env";
import type { Document, User } from "@server/models";
import {
  buildAdmin,
  buildCollection,
  buildDocument,
  buildUser,
} from "@server/test/factories";
import { getTestServer } from "@server/test/support";
import RateLimiter from "@server/utils/RateLimiter";

const server = getTestServer();

describe("#batch", () => {
  let user: User;
  let documentOne: Document;
  let documentTwo: Document;

  beforeEach(async () => {
    user = await buildUser();
    [documentOne, documentTwo] = await Promise.all([
      buildDocument({ userId: user.id, teamId: user.teamId }),
      buildDocument({ userId: user.id, teamId: user.teamId }),
    ]);
  });

  it("should require authentication", async () => {
    const res = await server.post("/api/batch", {
      body: {
        requests: [{ method: "documents.info", body: { id: documentOne.id } }],
      },
    });
    expect(res.status).toEqual(401);
  });

  it("should reject an empty batch", async () => {
    const res = await server.post("/api/batch", user, {
      body: { requests: [] },
    });
    expect(res.status).toEqual(400);
  });

  it("should reject a batch over the maximum size", async () => {
    const res = await server.post("/api/batch", user, {
      body: {
        requests: Array.from({ length: 26 }, () => ({
          method: "documents.info",
          body: { id: documentOne.id },
        })),
      },
    });
    const body = await res.json();
    expect(res.status).toEqual(400);
    expect(body.message).toContain("at most 25");
  });

  it("should dispatch multiple requests and return a response for each", async () => {
    const res = await server.post("/api/batch", user, {
      body: {
        requests: [
          {
            method: "documents.update",
            body: { id: documentOne.id, title: "One" },
          },
          {
            method: "documents.update",
            body: { id: documentTwo.id, title: "Two" },
          },
        ],
      },
    });
    const body = await res.json();
    expect(res.status).toEqual(200);
    expect(body.data).toHaveLength(2);

    expect(body.data[0].ok).toBe(true);
    expect(body.data[0].status).toEqual(200);
    expect(body.data[0].data.id).toEqual(documentOne.id);
    expect(body.data[0].data.title).toEqual("One");
    expect(body.data[0].policies).toBeTruthy();

    expect(body.data[1].ok).toBe(true);
    expect(body.data[1].data.title).toEqual("Two");
  });

  it("should dispatch across multiple resources in one batch", async () => {
    const admin = await buildAdmin();
    const collection = await buildCollection({
      teamId: admin.teamId,
      userId: admin.id,
    });
    const doc = await buildDocument({
      teamId: admin.teamId,
      userId: admin.id,
      collectionId: collection.id,
    });

    const res = await server.post("/api/batch", admin, {
      body: {
        requests: [
          { method: "documents.update", body: { id: doc.id, title: "Doc" } },
          {
            method: "collections.update",
            body: { id: collection.id, name: "Coll" },
          },
        ],
      },
    });
    const body = await res.json();
    expect(res.status).toEqual(200);
    expect(body.data[0].ok).toBe(true);
    expect(body.data[0].data.title).toEqual("Doc");
    expect(body.data[1].ok).toBe(true);
    expect(body.data[1].data.name).toEqual("Coll");
  });

  it("should isolate failures so the batch succeeds partially", async () => {
    const otherDocument = await buildDocument();

    const res = await server.post("/api/batch", user, {
      body: {
        requests: [
          {
            method: "documents.update",
            body: { id: documentOne.id, title: "Updated" },
          },
          {
            method: "documents.update",
            body: { id: otherDocument.id, title: "Denied" },
          },
        ],
      },
    });
    const body = await res.json();
    expect(res.status).toEqual(200);

    expect(body.data[0].ok).toBe(true);
    expect(body.data[0].data.title).toEqual("Updated");

    expect(body.data[1].ok).toBe(false);
    expect([403, 404]).toContain(body.data[1].status);
    expect(body.data[1].error).toBeTruthy();
  });

  it("should reject an unknown method", async () => {
    const res = await server.post("/api/batch", user, {
      body: {
        requests: [
          { method: "stars.create", body: { documentId: documentOne.id } },
        ],
      },
    });
    const body = await res.json();
    expect(res.status).toEqual(200);
    expect(body.data[0].ok).toBe(false);
    expect(body.data[0].status).toEqual(400);
    expect(body.data[0].error).toEqual("invalid_request");
  });

  it("should reject a known endpoint that is not allowlisted", async () => {
    // documents.list is a real route, but reads aren't permitted in a batch.
    const res = await server.post("/api/batch", user, {
      body: {
        requests: [{ method: "documents.list", body: {} }],
      },
    });
    const body = await res.json();
    expect(res.status).toEqual(200);
    expect(body.data[0].ok).toBe(false);
    expect(body.data[0].status).toEqual(400);
    expect(body.data[0].error).toEqual("invalid_request");
  });

  it("should transform errors with parity to top-level routes", async () => {
    const res = await server.post("/api/batch", user, {
      body: {
        requests: [
          {
            method: "documents.archive",
            body: { id: "550e8400-e29b-41d4-a716-446655440000" },
          },
        ],
      },
    });
    const body = await res.json();
    expect(res.status).toEqual(200);
    // A Sequelize EmptyResultError is transformed to a 404 not_found, matching
    // what the same request would return when called directly.
    expect(body.data[0].ok).toBe(false);
    expect(body.data[0].status).toEqual(404);
    expect(body.data[0].error).toEqual("not_found");
  });

  it("should surface per-request validation errors", async () => {
    const res = await server.post("/api/batch", user, {
      body: {
        requests: [{ method: "documents.update", body: {} }],
      },
    });
    const body = await res.json();
    expect(res.status).toEqual(200);
    expect(body.data[0].ok).toBe(false);
    expect(body.data[0].status).toEqual(400);
  });

  describe("rate limiting", () => {
    const originalEnabled = env.RATE_LIMITER_ENABLED;

    afterEach(() => {
      env.RATE_LIMITER_ENABLED = originalEnabled;
      vi.restoreAllMocks();
    });

    it("should rate limit each sub-request against its own method", async () => {
      env.RATE_LIMITER_ENABLED = true;
      const consume = vi.fn().mockResolvedValue(undefined);
      const getRateLimiter = vi
        .spyOn(RateLimiter, "getRateLimiter")
        .mockReturnValue({ consume, points: 100 } as unknown as ReturnType<
          typeof RateLimiter.getRateLimiter
        >);

      const res = await server.post("/api/batch", user, {
        body: {
          requests: [
            {
              method: "documents.update",
              body: { id: documentOne.id, title: "x" },
            },
          ],
        },
      });

      expect(res.status).toEqual(200);
      // The dispatched method is rate limited on its own path, not /batch, so a
      // batch can't be used to bypass per-endpoint limits.
      expect(getRateLimiter).toHaveBeenCalledWith(
        expect.stringContaining("documents.update")
      );
      expect(consume).toHaveBeenCalled();
    });

    it("should return a per-item 429 when a sub-request is rate limited", async () => {
      env.RATE_LIMITER_ENABLED = true;
      // A RateLimiterRes rejection signals the limit was hit (a plain Error
      // would instead fail open inside the limiter middleware).
      const consume = vi
        .fn()
        .mockRejectedValue(new RateLimiterRes(0, 60000, 1, false));
      vi.spyOn(RateLimiter, "getRateLimiter").mockReturnValue({
        consume,
        points: 1,
      } as unknown as ReturnType<typeof RateLimiter.getRateLimiter>);

      const res = await server.post("/api/batch", user, {
        body: {
          requests: [
            {
              method: "documents.update",
              body: { id: documentOne.id, title: "x" },
            },
          ],
        },
      });
      const body = await res.json();

      expect(res.status).toEqual(200);
      expect(body.data[0].ok).toBe(false);
      expect(body.data[0].status).toEqual(429);
    });
  });
});
