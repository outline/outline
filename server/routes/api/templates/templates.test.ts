import { CollectionPermission } from "@shared/types";
import { Template, UserMembership } from "@server/models";
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

    const res = await server.post("/api/templates.list", user);

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

    const res = await server.post("/api/templates.list", user, {
      body: {
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

    const res = await server.post("/api/templates.info", user, {
      body: {
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
    const res = await server.post("/api/templates.info", user, {
      body: {
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

    const res = await server.post("/api/templates.update", user, {
      body: {
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

    const res = await server.post("/api/templates.update", user, {
      body: {
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

    const res = await server.post("/api/templates.update", admin, {
      body: {
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

    const res = await server.post("/api/templates.update", user, {
      body: {
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

    const res = await server.post("/api/templates.update", user, {
      body: {
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

    const res = await server.post("/api/templates.update", admin, {
      body: {
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
    const res = await server.post("/api/templates.update", user, {
      body: {
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

    const res = await server.post("/api/templates.duplicate", user, {
      body: {
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

    const res = await server.post("/api/templates.duplicate", user, {
      body: {
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

    const res = await server.post("/api/templates.duplicate", admin, {
      body: {
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

    const res = await server.post("/api/templates.duplicate", user, {
      body: {
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

    const res = await server.post("/api/templates.duplicate", user, {
      body: {
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

    const res = await server.post("/api/templates.duplicate", admin, {
      body: {
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

    const res = await server.post("/api/templates.duplicate", user, {
      body: {
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
    const res = await server.post("/api/templates.duplicate", user, {
      body: {
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

    const res = await server.post("/api/templates.delete", user, {
      body: {
        id: template.id,
      },
    });

    const body = await res.json();
    expect(res.status).toEqual(200);
    expect(body.success).toEqual(true);
  });

  it("should fail with status 400 bad request when id is missing", async () => {
    const user = await buildUser();
    const res = await server.post("/api/templates.delete", user);
    const body = await res.json();
    expect(res.status).toEqual(400);
    expect(body.message).toEqual("id: Must be a valid UUID or slug");
  });

  it("should require authentication", async () => {
    const res = await server.post("/api/templates.delete");
    expect(res.status).toEqual(401);
  });
});

describe("nested templates", () => {
  describe("#templates.create", () => {
    it("should create a template nested under a parent template", async () => {
      const user = await buildUser();
      const collection = await buildCollection({
        userId: user.id,
        teamId: user.teamId,
      });
      const parent = await buildTemplate({
        userId: user.id,
        teamId: user.teamId,
        collectionId: collection.id,
      });

      const res = await server.post("/api/templates.create", user, {
        body: {
          parentDocumentId: parent.id,
          title: "Nested template",
          data: {
            type: "doc",
            content: [
              {
                type: "paragraph",
                content: [{ type: "text", text: "hello" }],
              },
            ],
          },
        },
      });

      const body = await res.json();
      expect(res.status).toEqual(200);
      expect(body.data.parentDocumentId).toEqual(parent.id);
      expect(body.data.collectionId).toEqual(collection.id);
    });

    it("should inherit the collection of the parent template", async () => {
      const user = await buildUser();
      const collection = await buildCollection({
        userId: user.id,
        teamId: user.teamId,
      });
      const otherCollection = await buildCollection({
        userId: user.id,
        teamId: user.teamId,
      });
      const parent = await buildTemplate({
        userId: user.id,
        teamId: user.teamId,
        collectionId: collection.id,
      });

      const res = await server.post("/api/templates.create", user, {
        body: {
          parentDocumentId: parent.id,
          collectionId: otherCollection.id,
          title: "Nested template",
          data: {
            type: "doc",
            content: [
              {
                type: "paragraph",
                content: [{ type: "text", text: "hello" }],
              },
            ],
          },
        },
      });

      const body = await res.json();
      expect(res.status).toEqual(200);
      expect(body.data.collectionId).toEqual(collection.id);
    });

    it("should not allow nesting under a template the user cannot update", async () => {
      const admin = await buildAdmin();
      const collection = await buildCollection({
        userId: admin.id,
        teamId: admin.teamId,
        templateManagement: CollectionPermission.Admin,
      });
      const parent = await buildTemplate({
        userId: admin.id,
        teamId: admin.teamId,
        collectionId: collection.id,
      });
      const member = await buildUser({ teamId: admin.teamId });

      const res = await server.post("/api/templates.create", member, {
        body: {
          parentDocumentId: parent.id,
          title: "Nested template",
          data: {
            type: "doc",
            content: [
              {
                type: "paragraph",
                content: [{ type: "text", text: "hello" }],
              },
            ],
          },
        },
      });

      expect(res.status).toEqual(403);
    });
  });

  describe("#templates.list", () => {
    it("should return only root templates when parentDocumentId is null", async () => {
      const user = await buildUser();
      const parent = await buildTemplate({
        userId: user.id,
        teamId: user.teamId,
      });
      await buildTemplate({
        userId: user.id,
        teamId: user.teamId,
        collectionId: parent.collectionId,
        parentDocumentId: parent.id,
      });

      const res = await server.post("/api/templates.list", user, {
        body: {
          parentDocumentId: null,
        },
      });

      const body = await res.json();
      expect(res.status).toEqual(200);
      expect(body.data.length).toEqual(1);
      expect(body.data[0].id).toEqual(parent.id);
      expect(body.data[0].childCount).toEqual(1);
    });

    it("should return child templates when parentDocumentId is set", async () => {
      const user = await buildUser();
      const parent = await buildTemplate({
        userId: user.id,
        teamId: user.teamId,
      });
      const child = await buildTemplate({
        userId: user.id,
        teamId: user.teamId,
        collectionId: parent.collectionId,
        parentDocumentId: parent.id,
      });

      const res = await server.post("/api/templates.list", user, {
        body: {
          parentDocumentId: parent.id,
        },
      });

      const body = await res.json();
      expect(res.status).toEqual(200);
      expect(body.data.length).toEqual(1);
      expect(body.data[0].id).toEqual(child.id);
      expect(body.data[0].parentDocumentId).toEqual(parent.id);
    });
  });

  describe("#templates.update", () => {
    it("should not allow changing the collection of a nested template", async () => {
      const user = await buildUser();
      const parent = await buildTemplate({
        userId: user.id,
        teamId: user.teamId,
      });
      const child = await buildTemplate({
        userId: user.id,
        teamId: user.teamId,
        collectionId: parent.collectionId,
        parentDocumentId: parent.id,
      });
      const otherCollection = await buildCollection({
        userId: user.id,
        teamId: user.teamId,
      });

      const res = await server.post("/api/templates.update", user, {
        body: {
          id: child.id,
          collectionId: otherCollection.id,
        },
      });

      expect(res.status).toEqual(400);
    });

    it("should allow nesting an existing template under another template", async () => {
      const user = await buildUser();
      const collection = await buildCollection({
        userId: user.id,
        teamId: user.teamId,
      });
      const parent = await buildTemplate({
        userId: user.id,
        teamId: user.teamId,
        collectionId: collection.id,
      });
      const template = await buildTemplate({
        userId: user.id,
        teamId: user.teamId,
        collectionId: collection.id,
      });

      const res = await server.post("/api/templates.update", user, {
        body: {
          id: template.id,
          parentDocumentId: parent.id,
        },
      });

      const body = await res.json();
      expect(res.status).toEqual(200);
      expect(body.data.parentDocumentId).toEqual(parent.id);
    });

    it("should not allow nesting a template inside itself", async () => {
      const user = await buildUser();
      const parent = await buildTemplate({
        userId: user.id,
        teamId: user.teamId,
      });
      const child = await buildTemplate({
        userId: user.id,
        teamId: user.teamId,
        collectionId: parent.collectionId,
        parentDocumentId: parent.id,
      });

      const res = await server.post("/api/templates.update", user, {
        body: {
          id: parent.id,
          parentDocumentId: child.id,
        },
      });

      expect(res.status).toEqual(400);
    });

    it("should move nested templates when the root moves to another collection", async () => {
      const admin = await buildAdmin();
      const parent = await buildTemplate({
        userId: admin.id,
        teamId: admin.teamId,
      });
      const child = await buildTemplate({
        userId: admin.id,
        teamId: admin.teamId,
        collectionId: parent.collectionId,
        parentDocumentId: parent.id,
      });
      const targetCollection = await buildCollection({
        userId: admin.id,
        teamId: admin.teamId,
      });

      const res = await server.post("/api/templates.update", admin, {
        body: {
          id: parent.id,
          collectionId: targetCollection.id,
        },
      });

      expect(res.status).toEqual(200);
      const reloadedChild = await Template.findByPk(child.id, {
        rejectOnEmpty: true,
      });
      expect(reloadedChild.collectionId).toEqual(targetCollection.id);
    });
  });

  describe("#templates.duplicate", () => {
    it("should duplicate nested templates recursively", async () => {
      const user = await buildUser();
      const parent = await buildTemplate({
        userId: user.id,
        teamId: user.teamId,
        title: "Parent",
      });
      const child = await buildTemplate({
        userId: user.id,
        teamId: user.teamId,
        collectionId: parent.collectionId,
        parentDocumentId: parent.id,
        title: "Child",
      });
      await buildTemplate({
        userId: user.id,
        teamId: user.teamId,
        collectionId: parent.collectionId,
        parentDocumentId: child.id,
        title: "Grandchild",
      });

      const res = await server.post("/api/templates.duplicate", user, {
        body: {
          id: parent.id,
        },
      });

      const body = await res.json();
      expect(res.status).toEqual(200);

      const duplicatedChildren = await Template.findAll({
        where: { parentDocumentId: body.data.id },
      });
      expect(duplicatedChildren.length).toEqual(1);
      expect(duplicatedChildren[0].title).toEqual("Child");

      const duplicatedGrandchildren = await Template.findAll({
        where: { parentDocumentId: duplicatedChildren[0].id },
      });
      expect(duplicatedGrandchildren.length).toEqual(1);
      expect(duplicatedGrandchildren[0].title).toEqual("Grandchild");
    });
  });

  describe("#templates.delete", () => {
    it("should delete nested templates with their parent", async () => {
      const user = await buildUser();
      const parent = await buildTemplate({
        userId: user.id,
        teamId: user.teamId,
      });
      const child = await buildTemplate({
        userId: user.id,
        teamId: user.teamId,
        collectionId: parent.collectionId,
        parentDocumentId: parent.id,
      });

      const res = await server.post("/api/templates.delete", user, {
        body: {
          id: parent.id,
        },
      });

      expect(res.status).toEqual(200);
      const reloadedChild = await Template.findByPk(child.id);
      expect(reloadedChild).toBeNull();
    });
  });

  describe("#templates.restore", () => {
    it("should restore nested templates with their parent", async () => {
      const user = await buildUser();
      const parent = await buildTemplate({
        userId: user.id,
        teamId: user.teamId,
      });
      const child = await buildTemplate({
        userId: user.id,
        teamId: user.teamId,
        collectionId: parent.collectionId,
        parentDocumentId: parent.id,
      });

      await server.post("/api/templates.delete", user, {
        body: {
          id: parent.id,
        },
      });

      const res = await server.post("/api/templates.restore", user, {
        body: {
          id: parent.id,
        },
      });

      expect(res.status).toEqual(200);
      const reloadedChild = await Template.findByPk(child.id);
      expect(reloadedChild).not.toBeNull();
      expect(reloadedChild?.deletedAt).toBeNull();
    });
  });
});

describe("templateManagement", () => {
  describe("#templates.create", () => {
    it("should allow member to create template when memberTemplateManagement is enabled", async () => {
      const admin = await buildAdmin();
      const collection = await buildCollection({
        userId: admin.id,
        teamId: admin.teamId,
        templateManagement: CollectionPermission.ReadWrite,
      });

      const member = await buildUser({ teamId: admin.teamId });

      const res = await server.post("/api/templates.create", member, {
        body: {
          collectionId: collection.id,
          title: "Member template",
          data: {
            type: "doc",
            content: [
              {
                type: "paragraph",
                content: [{ type: "text", text: "hello" }],
              },
            ],
          },
        },
      });

      const body = await res.json();
      expect(res.status).toEqual(200);
      expect(body.data.title).toEqual("Member template");
      expect(body.data.collectionId).toEqual(collection.id);
    });

    it("should not allow member to create template when memberTemplateManagement is disabled", async () => {
      const admin = await buildAdmin();
      const collection = await buildCollection({
        userId: admin.id,
        teamId: admin.teamId,
        templateManagement: CollectionPermission.Admin,
      });

      const member = await buildUser({ teamId: admin.teamId });

      const res = await server.post("/api/templates.create", member, {
        body: {
          collectionId: collection.id,
          title: "Member template",
          data: {
            type: "doc",
            content: [
              {
                type: "paragraph",
                content: [{ type: "text", text: "hello" }],
              },
            ],
          },
        },
      });

      expect(res.status).toEqual(403);
    });

    it("should allow member with explicit read_write membership to create template when enabled", async () => {
      const admin = await buildAdmin();
      const collection = await buildCollection({
        userId: admin.id,
        teamId: admin.teamId,
        permission: null,
        templateManagement: CollectionPermission.ReadWrite,
      });

      const member = await buildUser({ teamId: admin.teamId });
      await UserMembership.create({
        createdById: admin.id,
        collectionId: collection.id,
        userId: member.id,
        permission: CollectionPermission.ReadWrite,
      });

      const res = await server.post("/api/templates.create", member, {
        body: {
          collectionId: collection.id,
          title: "Member template",
          data: {
            type: "doc",
            content: [
              {
                type: "paragraph",
                content: [{ type: "text", text: "hello" }],
              },
            ],
          },
        },
      });

      const body = await res.json();
      expect(res.status).toEqual(200);
      expect(body.data.title).toEqual("Member template");
    });

    it("should not allow read-only member to create template even when enabled", async () => {
      const admin = await buildAdmin();
      const collection = await buildCollection({
        userId: admin.id,
        teamId: admin.teamId,
        permission: null,
        templateManagement: CollectionPermission.ReadWrite,
      });

      const member = await buildUser({ teamId: admin.teamId });
      await UserMembership.create({
        createdById: admin.id,
        collectionId: collection.id,
        userId: member.id,
        permission: CollectionPermission.Read,
      });

      const res = await server.post("/api/templates.create", member, {
        body: {
          collectionId: collection.id,
          title: "Member template",
          data: {
            type: "doc",
            content: [
              {
                type: "paragraph",
                content: [{ type: "text", text: "hello" }],
              },
            ],
          },
        },
      });

      expect(res.status).toEqual(403);
    });
  });

  describe("#templates.update", () => {
    it("should allow member to update template when memberTemplateManagement is enabled", async () => {
      const admin = await buildAdmin();
      const collection = await buildCollection({
        userId: admin.id,
        teamId: admin.teamId,
        templateManagement: CollectionPermission.ReadWrite,
      });

      const member = await buildUser({ teamId: admin.teamId });
      const template = await buildTemplate({
        userId: admin.id,
        teamId: admin.teamId,
        collectionId: collection.id,
      });

      const res = await server.post("/api/templates.update", member, {
        body: {
          id: template.id,
          title: "Updated by member",
        },
      });

      const body = await res.json();
      expect(res.status).toEqual(200);
      expect(body.data.title).toEqual("Updated by member");
    });

    it("should not allow member to update template when memberTemplateManagement is disabled", async () => {
      const admin = await buildAdmin();
      const collection = await buildCollection({
        userId: admin.id,
        teamId: admin.teamId,
        templateManagement: CollectionPermission.Admin,
      });

      const member = await buildUser({ teamId: admin.teamId });
      const template = await buildTemplate({
        userId: admin.id,
        teamId: admin.teamId,
        collectionId: collection.id,
      });

      const res = await server.post("/api/templates.update", member, {
        body: {
          id: template.id,
          title: "Updated by member",
        },
      });

      expect(res.status).toEqual(403);
    });
  });

  describe("#templates.duplicate", () => {
    it("should allow member to duplicate template when memberTemplateManagement is enabled", async () => {
      const admin = await buildAdmin();
      const collection = await buildCollection({
        userId: admin.id,
        teamId: admin.teamId,
        templateManagement: CollectionPermission.ReadWrite,
      });

      const member = await buildUser({ teamId: admin.teamId });
      const template = await buildTemplate({
        userId: admin.id,
        teamId: admin.teamId,
        collectionId: collection.id,
      });

      const res = await server.post("/api/templates.duplicate", member, {
        body: {
          id: template.id,
        },
      });

      const body = await res.json();
      expect(res.status).toEqual(200);
      expect(body.data.collectionId).toEqual(collection.id);
    });

    it("should not allow member to duplicate template when memberTemplateManagement is disabled", async () => {
      const admin = await buildAdmin();
      const collection = await buildCollection({
        userId: admin.id,
        teamId: admin.teamId,
        templateManagement: CollectionPermission.Admin,
      });

      const member = await buildUser({ teamId: admin.teamId });
      const template = await buildTemplate({
        userId: admin.id,
        teamId: admin.teamId,
        collectionId: collection.id,
      });

      const res = await server.post("/api/templates.duplicate", member, {
        body: {
          id: template.id,
        },
      });

      expect(res.status).toEqual(403);
    });
  });

  describe("#templates.restore", () => {
    it("should allow member to restore template when memberTemplateManagement is enabled", async () => {
      const admin = await buildAdmin();
      const collection = await buildCollection({
        userId: admin.id,
        teamId: admin.teamId,
        templateManagement: CollectionPermission.ReadWrite,
      });

      const member = await buildUser({ teamId: admin.teamId });
      const template = await buildTemplate({
        userId: admin.id,
        teamId: admin.teamId,
        collectionId: collection.id,
      });
      await template.destroy();

      const res = await server.post("/api/templates.restore", member, {
        body: {
          id: template.id,
        },
      });

      const body = await res.json();
      expect(res.status).toEqual(200);
      expect(body.data.id).toEqual(template.id);
    });

    it("should not allow member to restore template when memberTemplateManagement is disabled", async () => {
      const admin = await buildAdmin();
      const collection = await buildCollection({
        userId: admin.id,
        teamId: admin.teamId,
        templateManagement: CollectionPermission.Admin,
      });

      const member = await buildUser({ teamId: admin.teamId });
      const template = await buildTemplate({
        userId: admin.id,
        teamId: admin.teamId,
        collectionId: collection.id,
      });
      await template.destroy();

      const res = await server.post("/api/templates.restore", member, {
        body: {
          id: template.id,
        },
      });

      expect(res.status).toEqual(403);
    });
  });

  describe("#templates.delete", () => {
    it("should allow member to delete template when memberTemplateManagement is enabled", async () => {
      const admin = await buildAdmin();
      const collection = await buildCollection({
        userId: admin.id,
        teamId: admin.teamId,
        templateManagement: CollectionPermission.ReadWrite,
      });

      const member = await buildUser({ teamId: admin.teamId });
      const template = await buildTemplate({
        userId: admin.id,
        teamId: admin.teamId,
        collectionId: collection.id,
      });

      const res = await server.post("/api/templates.delete", member, {
        body: {
          id: template.id,
        },
      });

      const body = await res.json();
      expect(res.status).toEqual(200);
      expect(body.success).toEqual(true);
    });

    it("should not allow member to delete template when memberTemplateManagement is disabled", async () => {
      const admin = await buildAdmin();
      const collection = await buildCollection({
        userId: admin.id,
        teamId: admin.teamId,
        templateManagement: CollectionPermission.Admin,
      });

      const member = await buildUser({ teamId: admin.teamId });
      const template = await buildTemplate({
        userId: admin.id,
        teamId: admin.teamId,
        collectionId: collection.id,
      });

      const res = await server.post("/api/templates.delete", member, {
        body: {
          id: template.id,
        },
      });

      expect(res.status).toEqual(403);
    });
  });
});
