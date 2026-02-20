import {
  buildAdmin,
  buildUser,
  buildTemplate,
  buildCollection,
} from "@server/test/factories";
import { getTestServer } from "@server/test/support";

const server = getTestServer();

describe("#templates.list", () => {
  it("should list templates", async () => {
    const user = await buildUser();
    await buildTemplate(); // create a template that shouldn't be included

    const template = await buildTemplate({
      userId: user.id,
      teamId: user.teamId,
    });

    const res = await server.post("/api/templates.list", {
      body: {
        token: user.getJwtToken(),
      },
    });

    const body = await res.json();
    expect(res.status).toEqual(200);
    expect(body.data.length).toEqual(1);
    expect(body.data[0].id).toEqual(template.id);
  });

  it("should list templates in collection", async () => {
    const user = await buildUser();
    const collection = await buildCollection({
      userId: user.id,
      teamId: user.teamId,
    });

    const template = await buildTemplate({
      userId: user.id,
      teamId: user.teamId,
      collectionId: collection.id,
    });

    const res = await server.post("/api/templates.list", {
      body: {
        token: user.getJwtToken(),
        collectionId: collection.id,
      },
    });

    const body = await res.json();
    expect(res.status).toEqual(200);
    expect(body.data.length).toEqual(1);
    expect(body.data[0].id).toEqual(template.id);
  });

  it("should require authentication", async () => {
    const res = await server.post("/api/templates.list");
    expect(res.status).toEqual(401);
  });
});

describe("#templates.info", () => {
  it("should return template data", async () => {
    const user = await buildUser();
    const template = await buildTemplate({
      userId: user.id,
      teamId: user.teamId,
    });

    const res = await server.post("/api/templates.info", {
      body: {
        token: user.getJwtToken(),
        id: template.id,
      },
    });

    const body = await res.json();
    expect(res.status).toEqual(200);
    expect(body.data.id).toEqual(template.id);
    expect(body.data.title).toEqual(template.title);
  });

  it("should require authentication", async () => {
    const res = await server.post("/api/templates.info");
    expect(res.status).toEqual(401);
  });

  it("should fail for invalid template id", async () => {
    const user = await buildUser();
    const res = await server.post("/api/templates.info", {
      body: {
        token: user.getJwtToken(),
        id: "invalid",
      },
    });

    expect(res.status).toEqual(400);
  });
});

describe("#templates.update", () => {
  it("should update template title", async () => {
    const user = await buildUser();
    const template = await buildTemplate({
      userId: user.id,
      teamId: user.teamId,
      title: "Original title",
    });

    const res = await server.post("/api/templates.update", {
      body: {
        token: user.getJwtToken(),
        id: template.id,
        title: "New title",
      },
    });

    const body = await res.json();
    expect(res.status).toEqual(200);
    expect(body.data.title).toEqual("New title");
  });

  it("should update template content", async () => {
    const user = await buildUser();
    const template = await buildTemplate({
      userId: user.id,
      teamId: user.teamId,
      text: "Original content",
    });

    const data = {
      type: "doc",
      content: [
        {
          type: "paragraph",
          content: [
            {
              type: "text",
              text: "hello",
            },
          ],
        },
      ],
    };

    const res = await server.post("/api/templates.update", {
      body: {
        token: user.getJwtToken(),
        id: template.id,
        data,
      },
    });

    const body = await res.json();
    expect(res.status).toEqual(200);
    expect(body.data.data).toEqual(data);
  });

  it("should allow admin to move template to another accessible collection", async () => {
    const admin = await buildAdmin();
    const template = await buildTemplate({
      userId: admin.id,
      teamId: admin.teamId,
    });

    const targetCollection = await buildCollection({
      userId: admin.id,
      teamId: admin.teamId,
    });

    const res = await server.post("/api/templates.update", {
      body: {
        token: admin.getJwtToken(),
        id: template.id,
        collectionId: targetCollection.id,
      },
    });

    const body = await res.json();
    expect(res.status).toEqual(200);
    expect(body.data.collectionId).toEqual(targetCollection.id);
  });

  it("should not allow moving template to a collection user has no access to", async () => {
    const user = await buildUser();
    const template = await buildTemplate({
      userId: user.id,
      teamId: user.teamId,
    });

    // Collection created by another user with no default permission
    const inaccessibleCollection = await buildCollection({
      teamId: user.teamId,
      permission: null,
    });

    const res = await server.post("/api/templates.update", {
      body: {
        token: user.getJwtToken(),
        id: template.id,
        collectionId: inaccessibleCollection.id,
      },
    });

    expect(res.status).toEqual(403);
  });

  it("should not allow non-admin to move template to workspace scope", async () => {
    const admin = await buildAdmin();
    // Create template as admin so the non-admin user's team has it
    const template = await buildTemplate({
      userId: admin.id,
      teamId: admin.teamId,
    });

    // Create a non-admin member on the same team who has collection access
    // but is not a team admin
    const user = await buildUser({ teamId: admin.teamId });

    const res = await server.post("/api/templates.update", {
      body: {
        token: user.getJwtToken(),
        id: template.id,
        collectionId: null,
      },
    });

    expect(res.status).toEqual(403);
  });

  it("should allow admin to move template to workspace scope", async () => {
    const admin = await buildAdmin();
    const template = await buildTemplate({
      userId: admin.id,
      teamId: admin.teamId,
    });

    const res = await server.post("/api/templates.update", {
      body: {
        token: admin.getJwtToken(),
        id: template.id,
        collectionId: null,
      },
    });

    const body = await res.json();
    expect(res.status).toEqual(200);
    expect(body.data.collectionId).toBeNull();
  });

  it("should fail with status 400 bad request when id is missing", async () => {
    const user = await buildUser();
    const res = await server.post("/api/templates.update", {
      body: {
        token: user.getJwtToken(),
        title: "New title",
      },
    });
    const body = await res.json();
    expect(res.status).toEqual(400);
    expect(body.message).toEqual("id: Must be a valid UUID or slug");
  });

  it("should require authentication", async () => {
    const res = await server.post("/api/templates.update");
    expect(res.status).toEqual(401);
  });
});

describe("#templates.duplicate", () => {
  it("should duplicate template", async () => {
    const user = await buildUser();
    const template = await buildTemplate({
      userId: user.id,
      teamId: user.teamId,
      title: "test",
    });

    const res = await server.post("/api/templates.duplicate", {
      body: {
        token: user.getJwtToken(),
        id: template.id,
      },
    });

    const body = await res.json();
    expect(res.status).toEqual(200);
    expect(body.data.id).not.toEqual(template.id);
    expect(body.data.title).toEqual(template.title);
    expect(body.data.data).toEqual(template.content);
  });

  it("should duplicate template with new title", async () => {
    const user = await buildUser();
    const template = await buildTemplate({
      userId: user.id,
      teamId: user.teamId,
    });

    const res = await server.post("/api/templates.duplicate", {
      body: {
        token: user.getJwtToken(),
        id: template.id,
        title: "New title",
      },
    });

    const body = await res.json();
    expect(res.status).toEqual(200);
    expect(body.data.id).not.toEqual(template.id);
    expect(body.data.title).toEqual("New title");
    expect(body.data.data).toEqual(template.content);
  });

  it("should allow admin to duplicate to another accessible collection", async () => {
    const admin = await buildAdmin();
    const template = await buildTemplate({
      userId: admin.id,
      teamId: admin.teamId,
    });

    const targetCollection = await buildCollection({
      userId: admin.id,
      teamId: admin.teamId,
    });

    const res = await server.post("/api/templates.duplicate", {
      body: {
        token: admin.getJwtToken(),
        id: template.id,
        collectionId: targetCollection.id,
      },
    });

    const body = await res.json();
    expect(res.status).toEqual(200);
    expect(body.data.collectionId).toEqual(targetCollection.id);
  });

  it("should not allow duplicating to a collection user has no access to", async () => {
    const user = await buildUser();
    const template = await buildTemplate({
      userId: user.id,
      teamId: user.teamId,
    });

    // Collection created by another user with no default permission
    const inaccessibleCollection = await buildCollection({
      teamId: user.teamId,
      permission: null,
    });

    const res = await server.post("/api/templates.duplicate", {
      body: {
        token: user.getJwtToken(),
        id: template.id,
        collectionId: inaccessibleCollection.id,
      },
    });

    expect(res.status).toEqual(403);
  });

  it("should not allow non-admin to duplicate to workspace scope", async () => {
    const admin = await buildAdmin();
    const template = await buildTemplate({
      userId: admin.id,
      teamId: admin.teamId,
    });

    // Non-admin member on the same team
    const user = await buildUser({ teamId: admin.teamId });

    const res = await server.post("/api/templates.duplicate", {
      body: {
        token: user.getJwtToken(),
        id: template.id,
        collectionId: null,
      },
    });

    expect(res.status).toEqual(403);
  });

  it("should allow admin to duplicate to workspace scope", async () => {
    const admin = await buildAdmin();
    const template = await buildTemplate({
      userId: admin.id,
      teamId: admin.teamId,
    });

    const res = await server.post("/api/templates.duplicate", {
      body: {
        token: admin.getJwtToken(),
        id: template.id,
        collectionId: null,
      },
    });

    const body = await res.json();
    expect(res.status).toEqual(200);
    expect(body.data.collectionId).toBeNull();
  });

  it("should set publishedAt on duplicated template", async () => {
    const user = await buildUser();
    const template = await buildTemplate({
      userId: user.id,
      teamId: user.teamId,
    });

    const res = await server.post("/api/templates.duplicate", {
      body: {
        token: user.getJwtToken(),
        id: template.id,
      },
    });

    const body = await res.json();
    expect(res.status).toEqual(200);
    expect(body.data.publishedAt).toBeTruthy();
  });

  it("should require authentication", async () => {
    const res = await server.post("/api/templates.duplicate");
    expect(res.status).toEqual(401);
  });

  it("should fail for invalid template id", async () => {
    const user = await buildUser();
    const res = await server.post("/api/templates.duplicate", {
      body: {
        token: user.getJwtToken(),
        id: "invalid",
      },
    });

    expect(res.status).toEqual(400);
  });
});

describe("#templates.delete", () => {
  it("should delete template", async () => {
    const user = await buildUser();
    const template = await buildTemplate({
      userId: user.id,
      teamId: user.teamId,
    });

    const res = await server.post("/api/templates.delete", {
      body: {
        token: user.getJwtToken(),
        id: template.id,
      },
    });

    const body = await res.json();
    expect(res.status).toEqual(200);
    expect(body.success).toEqual(true);
  });

  it("should fail with status 400 bad request when id is missing", async () => {
    const user = await buildUser();
    const res = await server.post("/api/templates.delete", {
      body: {
        token: user.getJwtToken(),
      },
    });
    const body = await res.json();
    expect(res.status).toEqual(400);
    expect(body.message).toEqual("id: Must be a valid UUID or slug");
  });

  it("should require authentication", async () => {
    const res = await server.post("/api/templates.delete");
    expect(res.status).toEqual(401);
  });
});
