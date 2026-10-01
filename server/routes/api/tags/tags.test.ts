import { DocumentPermission, UserRole } from "@shared/types";
import env from "@server/env";
import type { Document, User } from "@server/models";
import { DocumentTag, Event, Tag, UserMembership } from "@server/models";
import { sequelize } from "@server/storage/database";
import {
  buildAdmin,
  buildCollection,
  buildDocument,
  buildDraftDocument,
  buildGuestUser,
  buildTeam,
  buildUser,
  buildViewer,
} from "@server/test/factories";
import { getTestServer } from "@server/test/support";
import RateLimiter from "@server/utils/RateLimiter";

const server = getTestServer();

async function tagDocument(document: Document, name: string) {
  const [tag] = await Tag.findOrCreate({
    where: { teamId: document.teamId, name },
    defaults: { teamId: document.teamId, name },
  });
  await DocumentTag.create({ tagId: tag.id, documentId: document.id });
  return tag;
}

type ListedTag = { id: string; name: string; documentCount: number };

async function listTags(
  user: User,
  body: Record<string, unknown> = {}
): Promise<ListedTag[]> {
  const res = await server.post("/api/tags.list", user, { body });
  expect(res.status).toBe(200);
  return (await res.json()).data;
}

describe("tags.create", () => {
  it("should create a tag and normalize to lowercase", async () => {
    const team = await buildTeam();
    const user = await buildUser({ teamId: team.id });

    const res = await server.post("/api/tags.create", user, {
      body: { name: "Engineering" },
    });
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.data.name).toBe("engineering");

    const events = await Event.findAll({ where: { teamId: team.id } });
    expect(events.length).toBe(1);
    expect(events[0].name).toBe("tags.create");
    expect(events[0].modelId).toBe(body.data.id);
    expect(events[0].actorId).toBe(user.id);
  });

  it("should upsert — return existing tag if normalized name matches", async () => {
    const team = await buildTeam();
    const user = await buildUser({ teamId: team.id });

    await server.post("/api/tags.create", user, {
      body: { name: "engineering" },
    });

    const res = await server.post("/api/tags.create", user, {
      body: { name: "Engineering" },
    });
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.data.name).toBe("engineering");
  });

  it("returns an existing tag without its count or creator", async () => {
    const user = await buildUser();
    const other = await buildUser({ teamId: user.teamId });
    const tag = await tagDocument(
      await buildDocument({ teamId: user.teamId, userId: user.id }),
      "existing"
    );
    await DocumentTag.create({
      tagId: tag.id,
      documentId: (
        await buildDraftDocument({ teamId: user.teamId, userId: other.id })
      ).id,
    });

    const res = await server.post("/api/tags.create", user, {
      body: { name: "existing" },
    });
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.data.id).toBe(tag.id);
    // the client keeps the count it already knows from tags.list
    expect(body.data).not.toHaveProperty("documentCount");
    expect(body.data).not.toHaveProperty("createdById");
  });

  it("should require authentication", async () => {
    const res = await server.post("/api/tags.create", {
      body: { name: "test" },
    });
    expect(res.status).toBe(401);
  });

  it("should not allow viewers to create tags", async () => {
    const team = await buildTeam();
    const viewer = await buildUser({ teamId: team.id, role: UserRole.Viewer });

    const res = await server.post("/api/tags.create", viewer, {
      body: { name: "test" },
    });

    expect(res.status).toBe(403);
  });
});

describe("tags.list", () => {
  it("should list workspace tags with documentCount", async () => {
    const team = await buildTeam();
    const user = await buildUser({ teamId: team.id });
    const document = await buildDocument({ teamId: team.id, userId: user.id });
    await tagDocument(document, "alpha");

    const res = await server.post("/api/tags.list", user, {
      body: {},
    });
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.data.length).toBeGreaterThanOrEqual(1);
    expect(body.data[0]).toHaveProperty("documentCount");
  });
});

describe("tags.delete", () => {
  it("should allow admins to delete tags", async () => {
    const team = await buildTeam();
    const admin = await buildAdmin({ teamId: team.id });

    const createRes = await server.post("/api/tags.create", admin, {
      body: { name: "to-delete" },
    });
    const createBody = await createRes.json();

    const res = await server.post("/api/tags.delete", admin, {
      body: { id: createBody.data.id },
    });
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.success).toBe(true);

    const events = await Event.findAll({
      where: { name: "tags.delete", teamId: team.id },
    });
    expect(events.length).toBe(1);
    expect(events[0].modelId).toBe(createBody.data.id);
    expect(events[0].actorId).toBe(admin.id);
  });

  it("should not allow non-admins to delete tags", async () => {
    const team = await buildTeam();
    const admin = await buildAdmin({ teamId: team.id });
    const member = await buildUser({ teamId: team.id });

    const createRes = await server.post("/api/tags.create", admin, {
      body: { name: "protected" },
    });
    const createBody = await createRes.json();

    const res = await server.post("/api/tags.delete", member, {
      body: { id: createBody.data.id },
    });

    expect(res.status).toBe(403);
  });
});

describe("tags.add", () => {
  it("should add a tag to a document", async () => {
    const team = await buildTeam();
    const user = await buildUser({ teamId: team.id });
    const document = await buildDocument({ teamId: team.id, userId: user.id });

    const tagRes = await server.post("/api/tags.create", user, {
      body: { name: "mytag" },
    });
    const tagBody = await tagRes.json();

    const res = await server.post("/api/tags.add", user, {
      body: {
        tagId: tagBody.data.id,
        documentId: document.id,
      },
    });
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.success).toBe(true);

    const events = await Event.findAll({
      where: { name: "tags.add", teamId: team.id },
    });
    expect(events.length).toBe(1);
    expect(events[0].documentId).toBe(document.id);
    expect(events[0].actorId).toBe(user.id);
    expect(events[0].data).toEqual({ tagId: tagBody.data.id });
  });

  it("should be idempotent — adding same tag twice returns 200", async () => {
    const team = await buildTeam();
    const user = await buildUser({ teamId: team.id });
    const document = await buildDocument({ teamId: team.id, userId: user.id });

    const tagRes = await server.post("/api/tags.create", user, {
      body: { name: "duplicate" },
    });
    const tagBody = await tagRes.json();

    const payload = {
      tagId: tagBody.data.id,
      documentId: document.id,
    };

    await server.post("/api/tags.add", user, { body: payload });

    const res = await server.post("/api/tags.add", user, { body: payload });

    expect(res.status).toBe(200);
  });
});

describe("tags.remove", () => {
  it("should remove a tag from a document", async () => {
    const team = await buildTeam();
    const user = await buildUser({ teamId: team.id });
    const document = await buildDocument({ teamId: team.id, userId: user.id });

    const tagRes = await server.post("/api/tags.create", user, {
      body: { name: "removetag" },
    });
    const tagBody = await tagRes.json();

    await server.post("/api/tags.add", user, {
      body: {
        tagId: tagBody.data.id,
        documentId: document.id,
      },
    });

    const res = await server.post("/api/tags.remove", user, {
      body: {
        tagId: tagBody.data.id,
        documentId: document.id,
      },
    });
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.success).toBe(true);

    const events = await Event.findAll({
      where: { name: "tags.remove", teamId: team.id },
    });
    expect(events.length).toBe(1);
    expect(events[0].documentId).toBe(document.id);
    expect(events[0].actorId).toBe(user.id);
    expect(events[0].data).toEqual({ tagId: tagBody.data.id });
  });

  it("should be idempotent — removing a tag not on a document returns 200", async () => {
    const team = await buildTeam();
    const user = await buildUser({ teamId: team.id });
    const document = await buildDocument({ teamId: team.id, userId: user.id });

    const tagRes = await server.post("/api/tags.create", user, {
      body: { name: "notthere" },
    });
    const tagBody = await tagRes.json();

    const res = await server.post("/api/tags.remove", user, {
      body: {
        tagId: tagBody.data.id,
        documentId: document.id,
      },
    });

    expect(res.status).toBe(200);
  });

  it("should not allow viewers to remove tags", async () => {
    const team = await buildTeam();
    const admin = await buildAdmin({ teamId: team.id });
    const viewer = await buildUser({ teamId: team.id, role: UserRole.Viewer });
    const document = await buildDocument({
      teamId: team.id,
      userId: admin.id,
    });

    const tagRes = await server.post("/api/tags.create", admin, {
      body: { name: "viewertag" },
    });
    const tagBody = await tagRes.json();

    await server.post("/api/tags.add", admin, {
      body: {
        tagId: tagBody.data.id,
        documentId: document.id,
      },
    });

    const res = await server.post("/api/tags.remove", viewer, {
      body: {
        tagId: tagBody.data.id,
        documentId: document.id,
      },
    });

    expect(res.status).toBe(403);
  });
});

describe("tags.list — team isolation", () => {
  it("should only return tags belonging to the user's team", async () => {
    const teamA = await buildTeam();
    const userA = await buildUser({ teamId: teamA.id });
    const teamB = await buildTeam();
    const userB = await buildUser({ teamId: teamB.id });

    await server.post("/api/tags.create", userA, {
      body: { name: "team-a-tag" },
    });
    await server.post("/api/tags.create", userB, {
      body: { name: "team-b-tag" },
    });

    await tagDocument(
      await buildDocument({ teamId: teamA.id, userId: userA.id }),
      "team-a-tag"
    );
    await tagDocument(
      await buildDocument({ teamId: teamB.id, userId: userB.id }),
      "team-b-tag"
    );

    const res = await server.post("/api/tags.list", userA, {
      body: {},
    });
    const body = await res.json();

    expect(res.status).toBe(200);
    const names = body.data.map((t: { name: string }) => t.name);
    expect(names).toContain("team-a-tag");
    expect(names).not.toContain("team-b-tag");
  });
});

describe("tags.add — authorization boundaries", () => {
  it("should not allow adding a tag from a different team", async () => {
    const teamA = await buildTeam();
    const userA = await buildUser({ teamId: teamA.id });
    const teamB = await buildTeam();
    const userB = await buildUser({ teamId: teamB.id });

    const tagRes = await server.post("/api/tags.create", userB, {
      body: { name: "foreign-tag" },
    });
    const tagBody = await tagRes.json();

    const document = await buildDocument({
      teamId: teamA.id,
      userId: userA.id,
    });

    const res = await server.post("/api/tags.add", userA, {
      body: {
        tagId: tagBody.data.id,
        documentId: document.id,
      },
    });

    expect(res.status).toBe(403);
  });

  it("should not allow adding a tag to a document from a different team", async () => {
    const teamA = await buildTeam();
    const userA = await buildUser({ teamId: teamA.id });
    const teamB = await buildTeam();
    const userB = await buildUser({ teamId: teamB.id });

    const tagRes = await server.post("/api/tags.create", userA, {
      body: { name: "my-tag" },
    });
    const tagBody = await tagRes.json();

    const foreignDoc = await buildDocument({
      teamId: teamB.id,
      userId: userB.id,
    });

    const res = await server.post("/api/tags.add", userA, {
      body: {
        tagId: tagBody.data.id,
        documentId: foreignDoc.id,
      },
    });

    expect(res.status).toBe(403);
  });

  it("should not allow viewers to add tags", async () => {
    const team = await buildTeam();
    const admin = await buildAdmin({ teamId: team.id });
    const viewer = await buildUser({ teamId: team.id, role: UserRole.Viewer });
    const document = await buildDocument({ teamId: team.id, userId: admin.id });

    const tagRes = await server.post("/api/tags.create", admin, {
      body: { name: "viewer-add-test" },
    });
    const tagBody = await tagRes.json();

    const res = await server.post("/api/tags.add", viewer, {
      body: {
        tagId: tagBody.data.id,
        documentId: document.id,
      },
    });

    expect(res.status).toBe(403);
  });
});

describe("tags.delete — cascade", () => {
  it("should remove all document_tags rows when a tag is deleted", async () => {
    const team = await buildTeam();
    const admin = await buildAdmin({ teamId: team.id });
    const document = await buildDocument({ teamId: team.id, userId: admin.id });

    const tagRes = await server.post("/api/tags.create", admin, {
      body: { name: "cascade-test" },
    });
    const tagBody = await tagRes.json();
    const tagId = tagBody.data.id;

    await server.post("/api/tags.add", admin, {
      body: {
        tagId,
        documentId: document.id,
      },
    });

    await server.post("/api/tags.delete", admin, {
      body: { id: tagId },
    });

    const remaining = await DocumentTag.count({ where: { tagId } });
    expect(remaining).toBe(0);
  });
});

describe("tags.list — documentCount accuracy", () => {
  it("reflects the correct count after adding and removing a tag from a document", async () => {
    const team = await buildTeam();
    const user = await buildUser({ teamId: team.id });
    const document = await buildDocument({ teamId: team.id, userId: user.id });

    const tagRes = await server.post("/api/tags.create", user, {
      body: { name: "count-test" },
    });
    const tagBody = await tagRes.json();
    const tagId = tagBody.data.id;

    await server.post("/api/tags.add", user, {
      body: { tagId, documentId: document.id },
    });

    const afterAdd = await server.post("/api/tags.list", user, {
      body: {},
    });
    const afterAddBody = await afterAdd.json();
    const countAfterAdd = afterAddBody.data.find(
      (t: { id: string; documentCount: number }) => t.id === tagId
    )?.documentCount;
    expect(countAfterAdd).toBe(1);

    await server.post("/api/tags.remove", user, {
      body: { tagId, documentId: document.id },
    });

    const afterRemove = await server.post("/api/tags.list", user, {
      body: {},
    });
    const afterRemoveBody = await afterRemove.json();
    // a tag no longer attached to any document is hidden from the list
    expect(
      afterRemoveBody.data.find((t: { id: string }) => t.id === tagId)
    ).toBeUndefined();
  });
});

describe("tags.list — visibility", () => {
  it("only returns tags on documents the user can read, with readable counts", async () => {
    const team = await buildTeam();
    const admin = await buildAdmin({ teamId: team.id });
    const member = await buildUser({ teamId: team.id });
    const viewer = await buildViewer({ teamId: team.id });
    const guest = await buildGuestUser({ teamId: team.id });
    const owner = await buildUser({ teamId: team.id });

    const publicCollection = await buildCollection({
      teamId: team.id,
      userId: owner.id,
    });
    const privateCollection = await buildCollection({
      teamId: team.id,
      userId: owner.id,
      permission: null,
    });

    const published = await buildDocument({
      teamId: team.id,
      userId: owner.id,
      collectionId: publicCollection.id,
    });
    const archived = await buildDocument({
      teamId: team.id,
      userId: owner.id,
      collectionId: publicCollection.id,
      archivedAt: new Date(),
    });
    const deleted = await buildDocument({
      teamId: team.id,
      userId: owner.id,
      collectionId: publicCollection.id,
    });
    const draft = await buildDraftDocument({
      teamId: team.id,
      userId: owner.id,
      collectionId: publicCollection.id,
    });
    const privateDoc = await buildDocument({
      teamId: team.id,
      userId: owner.id,
      collectionId: privateCollection.id,
    });

    await tagDocument(published, "shared");
    await tagDocument(archived, "shared");
    await tagDocument(deleted, "shared");
    await tagDocument(archived, "archived-only");
    await tagDocument(deleted, "deleted-only");
    await tagDocument(draft, "draft-only");
    await tagDocument(privateDoc, "private-only");
    await deleted.destroy();

    await UserMembership.create({
      userId: guest.id,
      documentId: privateDoc.id,
      permission: DocumentPermission.Read,
      createdById: owner.id,
    });

    for (const user of [admin, member, viewer]) {
      const tags = await listTags(user);
      expect(tags.map((t) => t.name)).toEqual(["archived-only", "shared"]);
      expect(tags.find((t) => t.name === "shared")?.documentCount).toBe(1);
      expect(tags.find((t) => t.name === "archived-only")?.documentCount).toBe(
        0
      );
    }

    const guestTags = await listTags(guest);
    expect(guestTags.map((t) => t.name)).toEqual(["private-only"]);
    expect(guestTags[0].documentCount).toBe(1);

    const ownerTags = await listTags(owner);
    expect(ownerTags.map((t) => t.name)).toEqual([
      "archived-only",
      "draft-only",
      "private-only",
      "shared",
    ]);
  });

  it("returns a new tag without documents to its creator on create", async () => {
    const user = await buildUser();

    const res = await server.post("/api/tags.create", user, {
      body: { name: "fresh" },
    });
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.data.name).toBe("fresh");
    expect(body.data.documentCount).toBe(0);
    expect((await listTags(user)).map((t) => t.name)).not.toContain("fresh");
  });
});

describe("tags.list — sorting and pagination", () => {
  it("sorts by name by default and paginates stably", async () => {
    const user = await buildUser();
    const names = ["delta", "alpha", "charlie", "bravo", "echo"];
    for (const name of names) {
      await tagDocument(
        await buildDocument({ teamId: user.teamId, userId: user.id }),
        name
      );
    }

    const firstPage = await listTags(user, { limit: 2, offset: 0 });
    const secondPage = await listTags(user, { limit: 2, offset: 2 });
    const thirdPage = await listTags(user, { limit: 2, offset: 4 });

    expect(
      [...firstPage, ...secondPage, ...thirdPage].map((t) => t.name)
    ).toEqual(["alpha", "bravo", "charlie", "delta", "echo"]);

    const desc = await listTags(user, { direction: "DESC" });
    expect(desc.map((t) => t.name)).toEqual([
      "echo",
      "delta",
      "charlie",
      "bravo",
      "alpha",
    ]);
  });

  it("sorts by documentCount with id as a tiebreaker", async () => {
    const user = await buildUser();
    const documents = await Promise.all(
      [1, 2, 3].map(() =>
        buildDocument({ teamId: user.teamId, userId: user.id })
      )
    );
    await tagDocument(documents[0], "one");
    for (const document of documents) {
      await tagDocument(document, "three");
    }
    const tied = [];
    for (const name of ["tie-a", "tie-b", "tie-c", "tie-d"]) {
      await tagDocument(documents[0], name);
      tied.push(await tagDocument(documents[1], name));
    }

    const tags = await listTags(user, {
      sort: "documentCount",
      direction: "DESC",
    });
    expect(tags.map((t) => t.documentCount)).toEqual([3, 2, 2, 2, 2, 1]);
    expect(tags[0].name).toBe("three");
    expect(tags.slice(1, 5).map((t) => t.id)).toEqual(
      tied.map((t) => t.id).sort()
    );

    const pages = [
      ...(await listTags(user, {
        sort: "documentCount",
        direction: "DESC",
        limit: 3,
        offset: 0,
      })),
      ...(await listTags(user, {
        sort: "documentCount",
        direction: "DESC",
        limit: 3,
        offset: 3,
      })),
    ];
    expect(pages.map((t) => t.id)).toEqual(tags.map((t) => t.id));
  });

  it.each([
    ["an API request", {}],
    ["a client request", { "x-client-version": "1.0.0" }],
  ])(
    "returns the exact total of readable tags for %s",
    async (_label, headers: Record<string, string>) => {
      const user = await buildUser();
      const other = await buildUser({ teamId: user.teamId });
      for (const name of ["alpha", "bravo", "charlie", "delta", "echo"]) {
        await tagDocument(
          await buildDocument({ teamId: user.teamId, userId: user.id }),
          name
        );
      }
      // only on a draft another user owns, so not readable by `user`
      await tagDocument(
        await buildDraftDocument({ teamId: user.teamId, userId: other.id }),
        "hidden"
      );

      const res = await server.post("/api/tags.list", user, {
        body: { limit: 2, offset: 2 },
        headers,
      });
      const body = await res.json();

      expect(res.status).toBe(200);
      expect(body.data.map((t: ListedTag) => t.name)).toEqual([
        "charlie",
        "delta",
      ]);
      expect(body.pagination.total).toBe(5);
    }
  );

  it("rejects an unknown sort field", async () => {
    const user = await buildUser();
    const res = await server.post("/api/tags.list", user, {
      body: { sort: "createdById" },
    });
    expect(res.status).toBe(400);
  });
});

describe("tags.update", () => {
  it("allows admins to rename a tag", async () => {
    const admin = await buildAdmin();
    const tag = await Tag.create({ teamId: admin.teamId, name: "old-name" });

    const res = await server.post("/api/tags.update", admin, {
      body: { id: tag.id, name: "New-Name" },
    });
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.data.name).toBe("new-name");

    const events = await Event.findAll({ where: { teamId: admin.teamId } });
    expect(events.length).toBe(1);
    expect(events[0].name).toBe("tags.update");
    expect(events[0].modelId).toBe(tag.id);
    expect(events[0].actorId).toBe(admin.id);
  });

  it("returns the updated tag without a document count", async () => {
    const admin = await buildAdmin();
    const tag = await tagDocument(
      await buildDocument({ teamId: admin.teamId, userId: admin.id }),
      "counted"
    );

    const res = await server.post("/api/tags.update", admin, {
      body: { id: tag.id, color: "#00AA00" },
    });
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.data.color).toBe("#00AA00");
    expect(body.data).not.toHaveProperty("documentCount");
  });

  it("does not allow members to rename a tag", async () => {
    const team = await buildTeam();
    const member = await buildUser({ teamId: team.id });
    const tag = await Tag.create({ teamId: team.id, name: "keep" });

    const res = await server.post("/api/tags.update", member, {
      body: { id: tag.id, name: "renamed" },
    });

    expect(res.status).toBe(403);
  });

  it("returns 400 when renaming to an existing name", async () => {
    const admin = await buildAdmin();
    await Tag.create({ teamId: admin.teamId, name: "taken" });
    const tag = await Tag.create({ teamId: admin.teamId, name: "other" });

    const res = await server.post("/api/tags.update", admin, {
      body: { id: tag.id, name: "Taken" },
    });

    expect(res.status).toBe(400);
  });

  it("allows admins to update only the color, leaving the name unchanged", async () => {
    const admin = await buildAdmin();
    const tag = await Tag.create({ teamId: admin.teamId, name: "colored" });

    const res = await server.post("/api/tags.update", admin, {
      body: { id: tag.id, color: "#FF0000" },
    });
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.data.name).toBe("colored");
    expect(body.data.color).toBe("#FF0000");
  });

  it("allows admins to clear the color with null", async () => {
    const admin = await buildAdmin();
    const tag = await Tag.create({
      teamId: admin.teamId,
      name: "colored",
      color: "#00FF00",
    });

    const res = await server.post("/api/tags.update", admin, {
      body: { id: tag.id, color: null },
    });
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.data.color).toBeNull();
  });

  it("rejects an invalid color", async () => {
    const admin = await buildAdmin();
    const tag = await Tag.create({ teamId: admin.teamId, name: "colored" });

    const res = await server.post("/api/tags.update", admin, {
      body: { id: tag.id, color: "not-a-color" },
    });

    expect(res.status).toBe(400);
  });

  it("requires at least one of name or color", async () => {
    const admin = await buildAdmin();
    const tag = await Tag.create({ teamId: admin.teamId, name: "lonely" });

    const res = await server.post("/api/tags.update", admin, {
      body: { id: tag.id },
    });

    expect(res.status).toBe(400);
  });
});

describe("tags.create — color", () => {
  it("accepts an optional color", async () => {
    const user = await buildUser();

    const res = await server.post("/api/tags.create", user, {
      body: { name: "with-color", color: "#123ABC" },
    });
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.data.color).toBe("#123ABC");
  });

  it("rejects an invalid color", async () => {
    const user = await buildUser();

    const res = await server.post("/api/tags.create", user, {
      body: { name: "bad-color", color: "red" },
    });

    expect(res.status).toBe(400);
  });
});

describe("tags.merge", () => {
  it("moves document_tags from source to target and deletes the source", async () => {
    const admin = await buildAdmin();
    const source = await Tag.create({ teamId: admin.teamId, name: "old" });
    const target = await Tag.create({ teamId: admin.teamId, name: "new" });
    const document = await buildDocument({
      teamId: admin.teamId,
      userId: admin.id,
    });
    await DocumentTag.create({ tagId: source.id, documentId: document.id });

    const res = await server.post("/api/tags.merge", admin, {
      body: { sourceId: source.id, targetId: target.id },
    });
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.data.id).toBe(target.id);
    expect(body.data.name).toBe("new");
    expect(await Tag.findByPk(source.id)).toBeNull();
    const documentTags = await DocumentTag.findAll({
      where: { documentId: document.id },
    });
    expect(documentTags.map((dt) => dt.tagId)).toEqual([target.id]);

    const events = await Event.findAll({
      where: { name: "tags.merge", teamId: admin.teamId },
    });
    expect(events.length).toBe(1);
    expect(events[0].modelId).toBe(target.id);
    expect(events[0].actorId).toBe(admin.id);
    expect(events[0].data).toEqual({ sourceId: source.id, sourceName: "old" });
  });

  it("returns the target with its merged readable document count", async () => {
    const admin = await buildAdmin();
    const source = await Tag.create({ teamId: admin.teamId, name: "src" });
    const target = await Tag.create({ teamId: admin.teamId, name: "dst" });
    for (const tag of [source, source, target]) {
      const document = await buildDocument({
        teamId: admin.teamId,
        userId: admin.id,
      });
      await DocumentTag.create({ tagId: tag.id, documentId: document.id });
    }

    const res = await server.post("/api/tags.merge", admin, {
      body: { sourceId: source.id, targetId: target.id },
    });
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.data.documentCount).toBe(3);
  });

  it("dedupes when a document already has both tags", async () => {
    const admin = await buildAdmin();
    const source = await Tag.create({ teamId: admin.teamId, name: "dup-old" });
    const target = await Tag.create({ teamId: admin.teamId, name: "dup-new" });
    const document = await buildDocument({
      teamId: admin.teamId,
      userId: admin.id,
    });
    await DocumentTag.create({ tagId: source.id, documentId: document.id });
    await DocumentTag.create({ tagId: target.id, documentId: document.id });

    const res = await server.post("/api/tags.merge", admin, {
      body: { sourceId: source.id, targetId: target.id },
    });

    expect(res.status).toBe(200);
    const documentTags = await DocumentTag.findAll({
      where: { documentId: document.id },
    });
    expect(documentTags.map((dt) => dt.tagId)).toEqual([target.id]);
  });

  it("rejects merging a tag into itself", async () => {
    const admin = await buildAdmin();
    const tag = await Tag.create({ teamId: admin.teamId, name: "self" });

    const res = await server.post("/api/tags.merge", admin, {
      body: { sourceId: tag.id, targetId: tag.id },
    });

    expect(res.status).toBe(400);
  });

  it("does not allow non-admins to merge tags", async () => {
    const team = await buildTeam();
    const member = await buildUser({ teamId: team.id });
    const source = await Tag.create({ teamId: team.id, name: "member-old" });
    const target = await Tag.create({ teamId: team.id, name: "member-new" });

    const res = await server.post("/api/tags.merge", member, {
      body: { sourceId: source.id, targetId: target.id },
    });

    expect(res.status).toBe(403);
    expect(await Tag.findByPk(source.id)).not.toBeNull();
  });

  it("rejects merging tags across teams", async () => {
    const teamA = await buildTeam();
    const adminA = await buildAdmin({ teamId: teamA.id });
    const teamB = await buildTeam();
    const source = await Tag.create({ teamId: teamA.id, name: "team-a-tag" });
    const target = await Tag.create({ teamId: teamB.id, name: "team-b-tag" });

    const res = await server.post("/api/tags.merge", adminA, {
      body: { sourceId: source.id, targetId: target.id },
    });

    expect(res.status).toBe(403);
    expect(await Tag.findByPk(source.id)).not.toBeNull();
    expect(await Tag.findByPk(target.id)).not.toBeNull();
  });
});

describe("tag name validation", () => {
  it.each(["équipe", "日本", "हिंदी", "ไทย", "under_score", "dash-ed", "v2"])(
    "accepts %s",
    async (name) => {
      const user = await buildUser();
      const res = await server.post("/api/tags.create", user, {
        body: { name },
      });
      const body = await res.json();

      expect(res.status).toBe(200);
      expect(body.data.name).toBe(name);
    }
  );

  it("stores names NFC-normalized and lowercased", async () => {
    const user = await buildUser();
    const res = await server.post("/api/tags.create", user, {
      body: { name: "  E\u0301QUIPE  " },
    });
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.data.name).toBe("\u00e9quipe");
  });

  it.each([
    "has space",
    "#hash",
    "emoji😀",
    "",
    "   ",
    "a".repeat(101),
    "---",
    "_",
    "-_-",
    "\u0301",
  ])("rejects %j", async (name) => {
    const user = await buildUser();
    const res = await server.post("/api/tags.create", user, {
      body: { name },
    });

    expect(res.status).toBe(400);
  });

  it("accepts a 100 character name", async () => {
    const user = await buildUser();
    const res = await server.post("/api/tags.create", user, {
      body: { name: "a".repeat(100) },
    });

    expect(res.status).toBe(200);
  });
});

describe("tags concurrency", () => {
  it("returns the same tag for concurrent creates of the same name", async () => {
    // Parallel requests are not guaranteed to interleave their lookup and
    // insert, so this may not hit the conflict; the forced-race test below
    // does.
    const user = await buildUser();

    const responses = await Promise.all(
      Array.from({ length: 5 }, () =>
        server.post("/api/tags.create", user, { body: { name: "racing" } })
      )
    );
    const bodies = await Promise.all(responses.map((res) => res.json()));

    expect(responses.map((res) => res.status)).toEqual([
      200, 200, 200, 200, 200,
    ]);
    expect(new Set(bodies.map((body) => body.data.id)).size).toBe(1);
    expect(await Tag.count({ where: { teamId: user.teamId } })).toBe(1);
  });

  it("returns the winning tag when a concurrent create commits first", async () => {
    const user = await buildUser();

    // the request's insert blocks on this uncommitted row, then conflicts
    const transaction = await sequelize.transaction();
    const winner = await Tag.create(
      { teamId: user.teamId, name: "photo-finish" },
      { transaction }
    );
    const pending = server.post("/api/tags.create", user, {
      body: { name: "photo-finish" },
    });
    await new Promise((resolve) => setTimeout(resolve, 500));
    await transaction.commit();
    const res = await pending;
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.data.id).toBe(winner.id);
  });

  it("handles concurrent adds of the same tag to a document", async () => {
    const user = await buildUser();
    const document = await buildDocument({
      teamId: user.teamId,
      userId: user.id,
    });
    const tag = await Tag.create({ teamId: user.teamId, name: "twice" });

    const responses = await Promise.all(
      Array.from({ length: 5 }, () =>
        server.post("/api/tags.add", user, {
          body: { tagId: tag.id, documentId: document.id },
        })
      )
    );

    expect(responses.map((res) => res.status)).toEqual([
      200, 200, 200, 200, 200,
    ]);
    expect(await DocumentTag.count({ where: { tagId: tag.id } })).toBe(1);
  });

  it("returns 4xx when the tag is deleted while being added", async () => {
    const user = await buildUser();
    const document = await buildDocument({
      teamId: user.teamId,
      userId: user.id,
    });
    const tag = await Tag.create({ teamId: user.teamId, name: "vanishing" });

    const transaction = await sequelize.transaction();
    await Tag.destroy({ where: { id: tag.id }, transaction });
    const pending = server.post("/api/tags.add", user, {
      body: { tagId: tag.id, documentId: document.id },
    });
    await new Promise((resolve) => setTimeout(resolve, 500));
    await transaction.commit();
    const res = await pending;

    expect(res.status).toBeGreaterThanOrEqual(400);
    expect(res.status).toBeLessThan(500);
  });
});

describe("tags — missing records", () => {
  it.each(["tags.add", "tags.remove"])(
    "%s returns 4xx for an unknown tagId",
    async (method) => {
      const user = await buildUser();
      const document = await buildDocument({
        teamId: user.teamId,
        userId: user.id,
      });

      const res = await server.post(`/api/${method}`, user, {
        body: {
          tagId: "9c6a2f4e-1b7d-4e3a-8f5c-2d1e0b9a7c6f",
          documentId: document.id,
        },
      });

      expect(res.status).toBeGreaterThanOrEqual(400);
      expect(res.status).toBeLessThan(500);
    }
  );
});

describe("tags — rate limiting", () => {
  const originalEnabled = env.RATE_LIMITER_ENABLED;

  afterEach(() => {
    env.RATE_LIMITER_ENABLED = originalEnabled;
    vi.restoreAllMocks();
  });

  it.each([
    "tags.create",
    "tags.update",
    "tags.delete",
    "tags.add",
    "tags.remove",
    "tags.merge",
  ])("registers a route rate limiter on %s", async (method) => {
    env.RATE_LIMITER_ENABLED = true;
    const user = await buildAdmin();
    vi.spyOn(RateLimiter, "hasRateLimiter").mockReturnValue(false);
    const setRateLimiter = vi
      .spyOn(RateLimiter, "setRateLimiter")
      .mockImplementation(() => undefined);
    vi.spyOn(RateLimiter, "getRateLimiter").mockReturnValue({
      consume: vi.fn().mockResolvedValue(undefined),
      points: 100,
    } as unknown as ReturnType<typeof RateLimiter.getRateLimiter>);

    await server.post(`/api/${method}`, user, { body: {} });

    expect(setRateLimiter).toHaveBeenCalledWith(
      expect.stringContaining(method),
      expect.objectContaining({
        points: Math.max(1, Math.round(25 * env.RATE_LIMITER_MULTIPLIER)),
      })
    );
  });
});
