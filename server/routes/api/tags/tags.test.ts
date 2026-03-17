import { UserRole } from "@shared/types";
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
});
