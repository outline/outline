import { UserRole } from "@shared/types";
import { DocumentTag } from "@server/models";
import {
  buildAdmin,
  buildDocument,
  buildTeam,
  buildUser,
} from "@server/test/factories";
import { getTestServer } from "@server/test/support";

const server = getTestServer();

describe("tags.create", () => {
  it("should create a tag and normalize to lowercase", async () => {
    const team = await buildTeam();
    const user = await buildUser({ teamId: team.id });

    const res = await server.post("/api/tags.create", {
      body: { token: user.getJwtToken(), name: "Engineering" },
    });
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.data.name).toBe("engineering");
  });

  it("should upsert — return existing tag if normalized name matches", async () => {
    const team = await buildTeam();
    const user = await buildUser({ teamId: team.id });

    await server.post("/api/tags.create", {
      body: { token: user.getJwtToken(), name: "engineering" },
    });

    const res = await server.post("/api/tags.create", {
      body: { token: user.getJwtToken(), name: "Engineering" },
    });
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.data.name).toBe("engineering");
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

    const res = await server.post("/api/tags.create", {
      body: { token: viewer.getJwtToken(), name: "test" },
    });

    expect(res.status).toBe(403);
  });
});

describe("tags.list", () => {
  it("should list workspace tags with documentCount", async () => {
    const team = await buildTeam();
    const user = await buildUser({ teamId: team.id });

    await server.post("/api/tags.create", {
      body: { token: user.getJwtToken(), name: "alpha" },
    });

    const res = await server.post("/api/tags.list", {
      body: { token: user.getJwtToken() },
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

    const createRes = await server.post("/api/tags.create", {
      body: { token: admin.getJwtToken(), name: "to-delete" },
    });
    const createBody = await createRes.json();

    const res = await server.post("/api/tags.delete", {
      body: { token: admin.getJwtToken(), id: createBody.data.id },
    });
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.success).toBe(true);
  });

  it("should not allow non-admins to delete tags", async () => {
    const team = await buildTeam();
    const admin = await buildAdmin({ teamId: team.id });
    const member = await buildUser({ teamId: team.id });

    const createRes = await server.post("/api/tags.create", {
      body: { token: admin.getJwtToken(), name: "protected" },
    });
    const createBody = await createRes.json();

    const res = await server.post("/api/tags.delete", {
      body: { token: member.getJwtToken(), id: createBody.data.id },
    });

    expect(res.status).toBe(403);
  });
});

describe("tags.add", () => {
  it("should add a tag to a document", async () => {
    const team = await buildTeam();
    const user = await buildUser({ teamId: team.id });
    const document = await buildDocument({ teamId: team.id, userId: user.id });

    const tagRes = await server.post("/api/tags.create", {
      body: { token: user.getJwtToken(), name: "mytag" },
    });
    const tagBody = await tagRes.json();

    const res = await server.post("/api/tags.add", {
      body: {
        token: user.getJwtToken(),
        tagId: tagBody.data.id,
        documentId: document.id,
      },
    });
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.success).toBe(true);
  });

  it("should be idempotent — adding same tag twice returns 200", async () => {
    const team = await buildTeam();
    const user = await buildUser({ teamId: team.id });
    const document = await buildDocument({ teamId: team.id, userId: user.id });

    const tagRes = await server.post("/api/tags.create", {
      body: { token: user.getJwtToken(), name: "duplicate" },
    });
    const tagBody = await tagRes.json();

    const payload = {
      token: user.getJwtToken(),
      tagId: tagBody.data.id,
      documentId: document.id,
    };

    await server.post("/api/tags.add", { body: payload });

    const res = await server.post("/api/tags.add", { body: payload });

    expect(res.status).toBe(200);
  });
});

describe("tags.remove", () => {
  it("should remove a tag from a document", async () => {
    const team = await buildTeam();
    const user = await buildUser({ teamId: team.id });
    const document = await buildDocument({ teamId: team.id, userId: user.id });

    const tagRes = await server.post("/api/tags.create", {
      body: { token: user.getJwtToken(), name: "removetag" },
    });
    const tagBody = await tagRes.json();

    await server.post("/api/tags.add", {
      body: {
        token: user.getJwtToken(),
        tagId: tagBody.data.id,
        documentId: document.id,
      },
    });

    const res = await server.post("/api/tags.remove", {
      body: {
        token: user.getJwtToken(),
        tagId: tagBody.data.id,
        documentId: document.id,
      },
    });
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.success).toBe(true);
  });

  it("should be idempotent — removing a tag not on a document returns 200", async () => {
    const team = await buildTeam();
    const user = await buildUser({ teamId: team.id });
    const document = await buildDocument({ teamId: team.id, userId: user.id });

    const tagRes = await server.post("/api/tags.create", {
      body: { token: user.getJwtToken(), name: "notthere" },
    });
    const tagBody = await tagRes.json();

    const res = await server.post("/api/tags.remove", {
      body: {
        token: user.getJwtToken(),
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

    const tagRes = await server.post("/api/tags.create", {
      body: { token: admin.getJwtToken(), name: "viewertag" },
    });
    const tagBody = await tagRes.json();

    await server.post("/api/tags.add", {
      body: {
        token: admin.getJwtToken(),
        tagId: tagBody.data.id,
        documentId: document.id,
      },
    });

    const res = await server.post("/api/tags.remove", {
      body: {
        token: viewer.getJwtToken(),
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

    await server.post("/api/tags.create", {
      body: { token: userA.getJwtToken(), name: "team-a-tag" },
    });
    await server.post("/api/tags.create", {
      body: { token: userB.getJwtToken(), name: "team-b-tag" },
    });

    const res = await server.post("/api/tags.list", {
      body: { token: userA.getJwtToken() },
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

    const tagRes = await server.post("/api/tags.create", {
      body: { token: userB.getJwtToken(), name: "foreign-tag" },
    });
    const tagBody = await tagRes.json();

    const document = await buildDocument({
      teamId: teamA.id,
      userId: userA.id,
    });

    const res = await server.post("/api/tags.add", {
      body: {
        token: userA.getJwtToken(),
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

    const tagRes = await server.post("/api/tags.create", {
      body: { token: userA.getJwtToken(), name: "my-tag" },
    });
    const tagBody = await tagRes.json();

    const foreignDoc = await buildDocument({
      teamId: teamB.id,
      userId: userB.id,
    });

    const res = await server.post("/api/tags.add", {
      body: {
        token: userA.getJwtToken(),
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

    const tagRes = await server.post("/api/tags.create", {
      body: { token: admin.getJwtToken(), name: "viewer-add-test" },
    });
    const tagBody = await tagRes.json();

    const res = await server.post("/api/tags.add", {
      body: {
        token: viewer.getJwtToken(),
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

    const tagRes = await server.post("/api/tags.create", {
      body: { token: admin.getJwtToken(), name: "cascade-test" },
    });
    const tagBody = await tagRes.json();
    const tagId = tagBody.data.id;

    await server.post("/api/tags.add", {
      body: {
        token: admin.getJwtToken(),
        tagId,
        documentId: document.id,
      },
    });

    await server.post("/api/tags.delete", {
      body: { token: admin.getJwtToken(), id: tagId },
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

    const tagRes = await server.post("/api/tags.create", {
      body: { token: user.getJwtToken(), name: "count-test" },
    });
    const tagBody = await tagRes.json();
    const tagId = tagBody.data.id;

    await server.post("/api/tags.add", {
      body: { token: user.getJwtToken(), tagId, documentId: document.id },
    });

    const afterAdd = await server.post("/api/tags.list", {
      body: { token: user.getJwtToken() },
    });
    const afterAddBody = await afterAdd.json();
    const countAfterAdd = afterAddBody.data.find(
      (t: { id: string; documentCount: number }) => t.id === tagId
    )?.documentCount;
    expect(countAfterAdd).toBe(1);

    await server.post("/api/tags.remove", {
      body: { token: user.getJwtToken(), tagId, documentId: document.id },
    });

    const afterRemove = await server.post("/api/tags.list", {
      body: { token: user.getJwtToken() },
    });
    const afterRemoveBody = await afterRemove.json();
    const countAfterRemove = afterRemoveBody.data.find(
      (t: { id: string; documentCount: number }) => t.id === tagId
    )?.documentCount;
    expect(countAfterRemove).toBe(0);
  });
});
