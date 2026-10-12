import {
  CollectionPermission,
  CollectionStatusFilter,
  DocumentPermission,
  Scope,
} from "@shared/types";
import { DeprecationValidation } from "@shared/validations";
import {
  Document,
  UserMembership,
  GroupMembership,
  View,
} from "@server/models";
import type { User } from "@server/models";
import { callMcpTool } from "@server/test/McpHelper";
import {
  buildUser,
  buildViewer,
  buildAdmin,
  buildGroup,
  buildCollection,
  buildDocument,
  buildTeam,
  buildPersonalCollection,
  buildOAuthAuthentication,
  buildRelationship,
} from "@server/test/factories";
import { getTestServer, mockTaskSchedule } from "@server/test/support";

const server = getTestServer();

describe("#collections.list", () => {
  it("should require authentication", async () => {
    const res = await server.post("/api/collections.list");
    const body = await res.json();
    expect(res.status).toEqual(401);
    expect(body).toMatchSnapshot();
  });

  it("should return collections", async () => {
    const team = await buildTeam();
    const user = await buildUser({ teamId: team.id });
    const collection = await buildCollection({
      userId: user.id,
      teamId: team.id,
    });
    const res = await server.post("/api/collections.list", user);
    const body = await res.json();
    expect(res.status).toEqual(200);
    expect(body.data.length).toEqual(1);
    expect(body.data[0].id).toEqual(collection.id);
    expect(body.policies.length).toEqual(1);
    expect(body.policies[0].abilities.read).toBeTruthy();
  });

  it("should include archived collections", async () => {
    const team = await buildTeam();
    const admin = await buildAdmin({ teamId: team.id });
    const collection = await buildCollection({
      teamId: team.id,
      archivedAt: new Date(),
    });
    const res = await server.post("/api/collections.list", admin, {
      body: {
        statusFilter: [CollectionStatusFilter.Archived],
      },
    });
    const body = await res.json();
    expect(res.status).toEqual(200);
    expect(body.data.length).toEqual(1);
    expect(body.data[0].archivedAt).toBeTruthy();
    expect(body.data[0].archivedBy).toBeTruthy();
    expect(body.data[0].archivedBy.id).toBe(collection.archivedById);
  });

  it("should include archived private collections for admin", async () => {
    const team = await buildTeam();
    const admin = await buildAdmin({ teamId: team.id });
    const collection = await buildCollection({
      teamId: team.id,
      permission: null,
      archivedAt: new Date(),
    });
    const res = await server.post("/api/collections.list", admin, {
      body: {
        statusFilter: [CollectionStatusFilter.Archived],
      },
    });
    const body = await res.json();
    expect(res.status).toEqual(200);
    expect(body.data.length).toEqual(1);
    expect(body.data[0].id).toEqual(collection.id);
    expect(body.policies[0].abilities.restore).toBeTruthy();
  });

  it("should not include archived private collections for member", async () => {
    const team = await buildTeam();
    const user = await buildUser({ teamId: team.id });
    await buildCollection({
      teamId: team.id,
      permission: null,
      archivedAt: new Date(),
    });
    const res = await server.post("/api/collections.list", user, {
      body: {
        statusFilter: [CollectionStatusFilter.Archived],
      },
    });
    const body = await res.json();
    expect(res.status).toEqual(200);
    expect(body.data).toHaveLength(0);
  });

  it("should exclude archived collections", async () => {
    const team = await buildTeam();
    const admin = await buildAdmin({ teamId: team.id });
    await buildCollection({
      teamId: team.id,
      archivedAt: new Date(),
    });
    const res = await server.post("/api/collections.list", admin);
    const body = await res.json();
    expect(res.status).toEqual(200);
    expect(body.data).toHaveLength(0);
  });

  it("should not return private collections actor is not a member of", async () => {
    const team = await buildTeam();
    const user = await buildUser({ teamId: team.id });
    const collection = await buildCollection({
      userId: user.id,
      teamId: team.id,
    });
    await buildCollection({
      permission: null,
      teamId: user.teamId,
    });
    const res = await server.post("/api/collections.list", user);
    const body = await res.json();
    expect(res.status).toEqual(200);
    expect(body.data.length).toEqual(1);
    expect(body.data[0].id).toEqual(collection.id);
  });

  it("should return private collections actor is a member of", async () => {
    const user = await buildUser();
    await buildCollection({
      permission: null,
      teamId: user.teamId,
      userId: user.id,
    });
    await buildCollection({
      permission: null,
      teamId: user.teamId,
      userId: user.id,
    });
    const res = await server.post("/api/collections.list", user);
    const body = await res.json();
    expect(res.status).toEqual(200);
    expect(body.data.length).toEqual(2);
    expect(body.policies.length).toEqual(2);
    expect(body.policies[0].abilities.read).toBeTruthy();
  });

  it("should return private collections actor is a group-member of", async () => {
    const user = await buildUser();
    await buildCollection({
      permission: null,
      teamId: user.teamId,
      userId: user.id,
    });
    const collection = await buildCollection({
      permission: null,
      teamId: user.teamId,
    });
    const group = await buildGroup({
      teamId: user.teamId,
    });
    await group.$add("user", user, {
      through: {
        createdById: user.id,
      },
    });
    await collection.$add("group", group, {
      through: {
        permission: CollectionPermission.Read,
        createdById: user.id,
      },
    });
    const res = await server.post("/api/collections.list", user);
    const body = await res.json();
    expect(res.status).toEqual(200);
    expect(body.data.length).toEqual(2);
    expect(body.policies.length).toEqual(2);
    expect(body.policies[0].abilities.read).toBeTruthy();
  });

  it("should not include archived collections", async () => {
    const team = await buildTeam();
    const user = await buildUser({ teamId: team.id });
    await buildCollection({
      userId: user.id,
      teamId: team.id,
      archivedAt: new Date(),
    });
    const res = await server.post("/api/collections.list", user);
    const body = await res.json();
    expect(res.status).toEqual(200);
    expect(body.data.length).toEqual(0);
  });

  it("should not include archived collections", async () => {
    const team = await buildTeam();
    const user = await buildUser({ teamId: team.id });
    const collection = await buildCollection({
      userId: user.id,
      teamId: team.id,
    });

    const beforeArchiveRes = await server.post("/api/collections.list", user);
    const beforeArchiveBody = await beforeArchiveRes.json();
    expect(beforeArchiveRes.status).toEqual(200);
    expect(beforeArchiveBody.data).toHaveLength(1);
    expect(beforeArchiveBody.data[0].id).toEqual(collection.id);

    const archiveRes = await server.post("/api/collections.archive", user, {
      body: {
        id: collection.id,
      },
    });

    expect(archiveRes.status).toEqual(200);

    const afterArchiveRes = await server.post("/api/collections.list", user);

    const afterArchiveBody = await afterArchiveRes.json();
    expect(afterArchiveRes.status).toEqual(200);
    expect(afterArchiveBody.data).toHaveLength(0);
  });

  it("should filter by name ignoring case", async () => {
    const user = await buildUser();
    const collection = await buildCollection({
      name: "Product Design",
      teamId: user.teamId,
      userId: user.id,
    });
    await buildCollection({
      name: "Something else",
      teamId: user.teamId,
      userId: user.id,
    });

    const res = await server.post("/api/collections.list", user, {
      body: {
        filters: [{ field: "name", operator: "contains", value: "DUCT DES" }],
      },
    });
    const body = await res.json();
    expect(res.status).toEqual(200);
    expect(body.data).toHaveLength(1);
    expect(body.data[0].id).toEqual(collection.id);
    expect(body.pagination.total).toEqual(1);
  });

  it("should filter by name with the deprecated query param", async () => {
    const user = await buildUser();
    const collection = await buildCollection({
      name: "Product Design",
      teamId: user.teamId,
      userId: user.id,
    });
    await buildCollection({
      name: "Something else",
      teamId: user.teamId,
      userId: user.id,
    });

    const res = await server.post("/api/collections.list", user, {
      body: {
        query: "duct des",
      },
    });
    const body = await res.json();
    expect(res.status).toEqual(200);
    expect(body.data).toHaveLength(1);
    expect(body.data[0].id).toEqual(collection.id);
  });

  it("should treat wildcards in a name filter literally", async () => {
    const user = await buildUser();
    await buildCollection({
      name: "Engineering",
      teamId: user.teamId,
      userId: user.id,
    });

    const res = await server.post("/api/collections.list", user, {
      body: {
        filters: [{ field: "name", operator: "contains", value: "%" }],
      },
    });
    const body = await res.json();
    expect(res.status).toEqual(200);
    expect(body.data).toHaveLength(0);
  });

  it("should exclude archived collections unless the filter targets archivedAt", async () => {
    const user = await buildUser();
    const collection = await buildCollection({
      name: "Engineering",
      teamId: user.teamId,
      userId: user.id,
    });
    await buildCollection({
      name: "Engineering archive",
      teamId: user.teamId,
      userId: user.id,
      archivedAt: new Date(),
    });

    const res = await server.post("/api/collections.list", user, {
      body: {
        filters: [
          { field: "name", operator: "startsWith", value: "Engineering" },
        ],
      },
    });
    const body = await res.json();
    expect(res.status).toEqual(200);
    expect(body.data).toHaveLength(1);
    expect(body.data[0].id).toEqual(collection.id);
  });

  it("should include archived collections when filtering on archivedAt", async () => {
    const team = await buildTeam();
    const admin = await buildAdmin({ teamId: team.id });
    const collection = await buildCollection({
      teamId: team.id,
      archivedAt: new Date(),
    });
    await buildCollection({
      teamId: team.id,
      userId: admin.id,
    });

    const res = await server.post("/api/collections.list", admin, {
      body: {
        filters: [{ field: "archivedAt", operator: "isNotNull" }],
      },
    });
    const body = await res.json();
    expect(res.status).toEqual(200);
    expect(body.data).toHaveLength(1);
    expect(body.data[0].id).toEqual(collection.id);
    expect(body.data[0].archivedBy).toBeTruthy();
    expect(body.data[0].archivedBy.id).toBe(collection.archivedById);
  });

  it("should combine a name filter with an archivedAt filter", async () => {
    const team = await buildTeam();
    const admin = await buildAdmin({ teamId: team.id });
    const collection = await buildCollection({
      name: "Engineering",
      teamId: team.id,
      userId: admin.id,
      archivedAt: new Date(),
    });
    await buildCollection({
      name: "Engineering",
      teamId: team.id,
      userId: admin.id,
    });

    const res = await server.post("/api/collections.list", admin, {
      body: {
        filters: [
          { field: "archivedAt", operator: "isNotNull" },
          { field: "name", operator: "contains", value: "engineer" },
        ],
      },
    });
    const body = await res.json();
    expect(res.status).toEqual(200);
    expect(body.data).toHaveLength(1);
    expect(body.data[0].id).toEqual(collection.id);
  });

  it("should include archived private collections for admin when filtering on archivedAt", async () => {
    const team = await buildTeam();
    const admin = await buildAdmin({ teamId: team.id });
    const collection = await buildCollection({
      teamId: team.id,
      permission: null,
      archivedAt: new Date(),
    });

    const res = await server.post("/api/collections.list", admin, {
      body: {
        filters: [{ field: "archivedAt", operator: "isNotNull" }],
      },
    });
    const body = await res.json();
    expect(res.status).toEqual(200);
    expect(body.data).toHaveLength(1);
    expect(body.data[0].id).toEqual(collection.id);
    expect(body.policies[0].abilities.restore).toBeTruthy();
  });

  it("should include private collections for admin whenever the filter targets archivedAt", async () => {
    // Matches the existing `includeListOnly` behavior, which already lets an
    // admin list private collections they are not a member of.
    const team = await buildTeam();
    const admin = await buildAdmin({ teamId: team.id });
    await buildCollection({
      teamId: team.id,
      permission: null,
      archivedAt: new Date(),
    });
    await buildCollection({
      teamId: team.id,
      permission: null,
    });

    const res = await server.post("/api/collections.list", admin, {
      body: {
        filters: [
          {
            operator: "OR",
            filters: [
              { field: "archivedAt", operator: "isNotNull" },
              { field: "archivedAt", operator: "isNull" },
            ],
          },
        ],
      },
    });
    const body = await res.json();
    expect(res.status).toEqual(200);
    expect(body.data).toHaveLength(2);
  });

  it("should not include archived private collections for member when filtering on archivedAt", async () => {
    const team = await buildTeam();
    const user = await buildUser({ teamId: team.id });
    await buildCollection({
      teamId: team.id,
      permission: null,
      archivedAt: new Date(),
    });

    const res = await server.post("/api/collections.list", user, {
      body: {
        filters: [{ field: "archivedAt", operator: "isNotNull" }],
      },
    });
    const body = await res.json();
    expect(res.status).toEqual(200);
    expect(body.data).toHaveLength(0);
  });

  it("should filter by createdById", async () => {
    const team = await buildTeam();
    const user = await buildUser({ teamId: team.id });
    const other = await buildUser({ teamId: team.id });
    const collection = await buildCollection({
      teamId: team.id,
      userId: user.id,
    });
    await buildCollection({
      teamId: team.id,
      userId: other.id,
    });

    const res = await server.post("/api/collections.list", user, {
      body: {
        filters: [{ field: "createdById", operator: "eq", value: user.id }],
      },
    });
    const body = await res.json();
    expect(res.status).toEqual(200);
    expect(body.data).toHaveLength(1);
    expect(body.data[0].id).toEqual(collection.id);
  });

  it("should filter private collections by permission", async () => {
    const user = await buildUser();
    const collection = await buildCollection({
      teamId: user.teamId,
      userId: user.id,
      permission: null,
    });
    await buildCollection({
      teamId: user.teamId,
      userId: user.id,
      permission: CollectionPermission.ReadWrite,
    });

    const res = await server.post("/api/collections.list", user, {
      body: {
        filters: [{ field: "permission", operator: "isNull" }],
      },
    });
    const body = await res.json();
    expect(res.status).toEqual(200);
    expect(body.data).toHaveLength(1);
    expect(body.data[0].id).toEqual(collection.id);
  });

  it("should not allow filtering on an unknown permission", async () => {
    const user = await buildUser();
    const res = await server.post("/api/collections.list", user, {
      body: {
        filters: [{ field: "permission", operator: "eq", value: "manage" }],
      },
    });
    expect(res.status).toEqual(400);
  });

  it("should not allow filters combined with deprecated parameters", async () => {
    const user = await buildUser();

    const withQuery = await server.post("/api/collections.list", user, {
      body: {
        query: "test",
        filters: [{ field: "name", operator: "contains", value: "test" }],
      },
    });
    expect(withQuery.status).toEqual(400);

    const withStatusFilter = await server.post("/api/collections.list", user, {
      body: {
        statusFilter: [CollectionStatusFilter.Archived],
        filters: [{ field: "archivedAt", operator: "isNotNull" }],
      },
    });
    expect(withStatusFilter.status).toEqual(400);
  });

  it("should not allow filtering on an unknown field", async () => {
    const user = await buildUser();
    const res = await server.post("/api/collections.list", user, {
      body: {
        filters: [{ field: "deletedAt", operator: "isNotNull" }],
      },
    });
    expect(res.status).toEqual(400);
  });

  it("should not allow pattern matching on a non-text field", async () => {
    const user = await buildUser();
    const res = await server.post("/api/collections.list", user, {
      body: {
        filters: [{ field: "createdById", operator: "contains", value: "abc" }],
      },
    });
    expect(res.status).toEqual(400);
  });
});

describe("#collections.import", () => {
  it("should error if no attachmentId is passed", async () => {
    const user = await buildUser();
    const res = await server.post("/api/collections.import", user);
    expect(res.status).toEqual(400);
  });

  it("should require authentication", async () => {
    const res = await server.post("/api/collections.import");
    const body = await res.json();
    expect(res.status).toEqual(401);
    expect(body).toMatchSnapshot();
  });
});

describe("#collections.move", () => {
  it("should require authentication", async () => {
    const res = await server.post("/api/collections.move");
    const body = await res.json();
    expect(res.status).toEqual(401);
    expect(body).toMatchSnapshot();
  });

  it("should require authorization", async () => {
    const user = await buildUser();
    const collection = await buildCollection();
    const res = await server.post("/api/collections.move", user, {
      body: {
        id: collection.id,
        index: "P",
      },
    });
    expect(res.status).toEqual(403);
  });

  it("should return success", async () => {
    const team = await buildTeam();
    const admin = await buildAdmin({ teamId: team.id });
    const collection = await buildCollection({ teamId: team.id });
    const res = await server.post("/api/collections.move", admin, {
      body: {
        id: collection.id,
        index: "P",
        icon: "flame",
      },
    });
    const body = await res.json();
    expect(res.status).toEqual(200);
    expect(body.success).toBe(true);
  });

  it("should allow setting an emoji as icon", async () => {
    const team = await buildTeam();
    const admin = await buildAdmin({ teamId: team.id });
    const collection = await buildCollection({ teamId: team.id });
    const res = await server.post("/api/collections.move", admin, {
      body: {
        id: collection.id,
        index: "P",
        icon: "😁",
      },
    });
    const body = await res.json();
    expect(res.status).toEqual(200);
    expect(body.success).toBe(true);
  });

  it("should return error when icon is not valid", async () => {
    const team = await buildTeam();
    const admin = await buildAdmin({ teamId: team.id });
    const collection = await buildCollection({ teamId: team.id });
    const res = await server.post("/api/collections.move", admin, {
      body: {
        id: collection.id,
        icon: "nonsRence",
      },
    });
    expect(res.status).toEqual(400);
  });

  it("should return error when index is not valid", async () => {
    const team = await buildTeam();
    const admin = await buildAdmin({ teamId: team.id });
    const collection = await buildCollection({ teamId: team.id });
    const res = await server.post("/api/collections.move", admin, {
      body: {
        id: collection.id,
        index: "يونيكود",
      },
    });
    expect(res.status).toEqual(400);
  });

  it("if index collision occurs, should updated index of other collection", async () => {
    const team = await buildTeam();
    const user = await buildUser({ teamId: team.id });
    const admin = await buildAdmin({ teamId: team.id });
    const collection = await buildCollection({
      userId: user.id,
      teamId: team.id,
    });
    const createdCollectionResponse = await server.post(
      "/api/collections.create",
      user,
      {
        body: {
          name: "Test",
          sharing: false,
          index: "Q",
        },
      }
    );
    await createdCollectionResponse.json();
    const movedCollectionRes = await server.post(
      "/api/collections.move",
      admin,
      {
        body: {
          id: collection.id,
          index: "Q",
        },
      }
    );
    const movedCollection = await movedCollectionRes.json();
    expect(movedCollectionRes.status).toEqual(200);
    expect(movedCollection.success).toBe(true);
    expect(movedCollection.data.index).toEqual("h");
    expect(movedCollection.data.index > "Q").toBeTruthy();
  });

  it("if index collision with an extra collection, should updated index of other collection", async () => {
    const team = await buildTeam();
    const admin = await buildAdmin({ teamId: team.id });
    const user = await buildUser({ teamId: team.id });
    const createdCollectionAResponse = await server.post(
      "/api/collections.create",
      user,
      {
        body: {
          name: "A",
          sharing: false,
          index: "a",
        },
      }
    );
    const createdCollectionBResponse = await server.post(
      "/api/collections.create",
      user,
      {
        body: {
          name: "B",
          sharing: false,
          index: "b",
        },
      }
    );
    const createdCollectionCResponse = await server.post(
      "/api/collections.create",
      user,
      {
        body: {
          name: "C",
          sharing: false,
          index: "c",
        },
      }
    );
    await createdCollectionAResponse.json();
    await createdCollectionBResponse.json();
    const createdCollectionC = await createdCollectionCResponse.json();
    const movedCollectionCResponse = await server.post(
      "/api/collections.move",
      admin,
      {
        body: {
          id: createdCollectionC.data.id,
          index: "a",
        },
      }
    );
    const movedCollectionC = await movedCollectionCResponse.json();
    expect(movedCollectionCResponse.status).toEqual(200);
    expect(movedCollectionC.success).toBe(true);
    expect(movedCollectionC.data.index).toEqual("aP");
    expect(movedCollectionC.data.index > "a").toBeTruthy();
    expect(movedCollectionC.data.index < "b").toBeTruthy();
  });
});

describe("#collections.export", () => {
  it("should not allow export of private collection not a member", async () => {
    const user = await buildUser();
    const collection = await buildCollection({
      permission: null,
      teamId: user.teamId,
    });
    const res = await server.post("/api/collections.export", user, {
      body: {
        id: collection.id,
      },
    });
    expect(res.status).toEqual(403);
  });

  it("should allow export of private collection when the actor is a member", async () => {
    const team = await buildTeam();
    const admin = await buildAdmin({ teamId: team.id });
    const collection = await buildCollection({ teamId: team.id });
    collection.permission = null;
    await collection.save();
    await UserMembership.create({
      createdById: admin.id,
      collectionId: collection.id,
      userId: admin.id,
      permission: CollectionPermission.ReadWrite,
    });
    const res = await server.post("/api/collections.export", admin, {
      body: {
        id: collection.id,
      },
    });
    expect(res.status).toEqual(200);
  });

  it("should allow export of private collection when the actor is a group member", async () => {
    const admin = await buildAdmin();
    const collection = await buildCollection({
      permission: null,
      teamId: admin.teamId,
    });
    const group = await buildGroup({
      teamId: admin.teamId,
    });
    await group.$add("user", admin, {
      through: {
        createdById: admin.id,
      },
    });
    await collection.$add("group", group, {
      through: {
        permission: CollectionPermission.ReadWrite,
        createdById: admin.id,
      },
    });
    const res = await server.post("/api/collections.export", admin, {
      body: {
        id: collection.id,
      },
    });
    expect(res.status).toEqual(200);
  });

  it("should require authentication", async () => {
    const res = await server.post("/api/collections.export");
    const body = await res.json();
    expect(res.status).toEqual(401);
    expect(body).toMatchSnapshot();
  });

  it("should return unauthorized if user is not admin", async () => {
    const admin = await buildAdmin();
    const user = await buildUser({ teamId: admin.teamId });
    const collection = await buildCollection({
      userId: admin.id,
      teamId: admin.teamId,
    });
    const res = await server.post("/api/collections.export", user, {
      body: {
        id: collection.id,
      },
    });
    expect(res.status).toEqual(403);
  });

  it("should return file operation associated with export", async () => {
    const admin = await buildAdmin();
    const collection = await buildCollection({
      teamId: admin.teamId,
    });
    const res = await server.post("/api/collections.export", admin, {
      body: {
        id: collection.id,
      },
    });
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body.data.fileOperation.id).toBeTruthy();
    expect(body.data.fileOperation.state).toBe("creating");
  });
});

describe("#collections.export_all", () => {
  it("should require authentication", async () => {
    const res = await server.post("/api/collections.export_all");
    const body = await res.json();
    expect(res.status).toEqual(401);
    expect(body).toMatchSnapshot();
  });

  it("should require authorization", async () => {
    const user = await buildUser();
    const res = await server.post("/api/collections.export_all", user);
    expect(res.status).toEqual(403);
  });

  it("should return success", async () => {
    const admin = await buildAdmin();
    const res = await server.post("/api/collections.export_all", admin);
    expect(res.status).toEqual(200);
  });
});

describe("#collections.add_user", () => {
  it("should add user to collection with manage permission", async () => {
    const user = await buildUser();
    const collection = await buildCollection({
      teamId: user.teamId,
      userId: user.id,
      permission: null,
    });
    const anotherUser = await buildUser({
      teamId: user.teamId,
    });
    await UserMembership.create({
      createdById: user.id,
      collectionId: collection.id,
      userId: user.id,
      permission: CollectionPermission.Admin,
    });
    const res = await server.post("/api/collections.add_user", user, {
      body: {
        id: collection.id,
        userId: anotherUser.id,
      },
    });
    const users = await collection.$get("users");
    expect(res.status).toEqual(200);
    expect(users.length).toEqual(3);
  });

  it("should add user to collection", async () => {
    const admin = await buildAdmin();
    const collection = await buildCollection({
      teamId: admin.teamId,
      userId: admin.id,
      permission: null,
    });
    const anotherUser = await buildUser({
      teamId: admin.teamId,
    });
    const res = await server.post("/api/collections.add_user", admin, {
      body: {
        id: collection.id,
        userId: anotherUser.id,
      },
    });
    const users = await collection.$get("users");
    expect(res.status).toEqual(200);
    expect(users.length).toEqual(2);
  });

  it("should not allow add self", async () => {
    const user = await buildUser();
    const collection = await buildCollection({
      teamId: user.teamId,
      permission: null,
    });
    const res = await server.post("/api/collections.add_user", user, {
      body: {
        id: collection.id,
        userId: user.id,
      },
    });
    const body = await res.json();
    expect(res.status).toEqual(403);
    expect(body).toMatchSnapshot();
  });

  it("should require user in team", async () => {
    const user = await buildUser();
    const collection = await buildCollection({
      teamId: user.teamId,
      permission: null,
    });
    const anotherUser = await buildUser();
    const res = await server.post("/api/collections.add_user", user, {
      body: {
        id: collection.id,
        userId: anotherUser.id,
      },
    });
    const body = await res.json();
    expect(res.status).toEqual(403);
    expect(body).toMatchSnapshot();
  });

  it("should require authentication", async () => {
    const res = await server.post("/api/collections.add_user");
    expect(res.status).toEqual(401);
  });

  it("should require authorization", async () => {
    const collection = await buildCollection();
    const user = await buildUser();
    const anotherUser = await buildUser({
      teamId: user.teamId,
    });
    const res = await server.post("/api/collections.add_user", user, {
      body: {
        id: collection.id,
        userId: anotherUser.id,
      },
    });
    expect(res.status).toEqual(403);
  });
});

describe("#collections.add_group", () => {
  it("should add group to collection", async () => {
    const user = await buildAdmin();
    const collection = await buildCollection({
      teamId: user.teamId,
      userId: user.id,
      permission: null,
    });
    const group = await buildGroup({
      teamId: user.teamId,
    });
    const res = await server.post("/api/collections.add_group", user, {
      body: {
        id: collection.id,
        groupId: group.id,
      },
    });
    const groups = await collection.$get("groups");
    expect(groups.length).toEqual(1);
    expect(res.status).toEqual(200);
  });

  it("should fail with status 400 bad request when permission is null", async () => {
    const user = await buildAdmin();
    const collection = await buildCollection({
      teamId: user.teamId,
      userId: user.id,
      permission: null,
    });
    const group = await buildGroup({
      teamId: user.teamId,
    });
    const res = await server.post("/api/collections.add_group", user, {
      body: {
        id: collection.id,
        groupId: group.id,
        permission: null,
      },
    });
    const body = await res.json();
    expect(res.status).toEqual(400);
    expect(body.message).toEqual(
      'permission: Invalid option: expected one of "read"|"read_write"|"admin"'
    );
  });

  it("should require group in team", async () => {
    const user = await buildUser();
    const collection = await buildCollection({
      teamId: user.teamId,
      userId: user.id,
      permission: null,
    });
    const group = await buildGroup();
    const res = await server.post("/api/collections.add_group", user, {
      body: {
        id: collection.id,
        groupId: group.id,
      },
    });
    const body = await res.json();
    expect(res.status).toEqual(403);
    expect(body).toMatchSnapshot();
  });

  it("should require authentication", async () => {
    const res = await server.post("/api/collections.add_group");
    expect(res.status).toEqual(401);
  });

  it("should require authorization", async () => {
    const collection = await buildCollection();
    const user = await buildUser();
    const group = await buildGroup({
      teamId: user.teamId,
    });
    const res = await server.post("/api/collections.add_group", user, {
      body: {
        id: collection.id,
        groupId: group.id,
      },
    });
    expect(res.status).toEqual(403);
  });
});

describe("#collections.remove_group", () => {
  it("should remove group from collection", async () => {
    const user = await buildAdmin();
    const collection = await buildCollection({
      teamId: user.teamId,
      userId: user.id,
      permission: null,
    });
    const group = await buildGroup({
      teamId: user.teamId,
    });
    await server.post("/api/collections.add_group", user, {
      body: {
        id: collection.id,
        groupId: group.id,
      },
    });
    let groups = await collection.$get("groups");
    expect(groups.length).toEqual(1);
    const res = await server.post("/api/collections.remove_group", user, {
      body: {
        id: collection.id,
        groupId: group.id,
      },
    });
    groups = await collection.$get("groups");
    expect(res.status).toEqual(200);
    expect(groups.length).toEqual(0);
  });

  it("should require group in team", async () => {
    const user = await buildUser();
    const collection = await buildCollection({
      teamId: user.teamId,
      permission: null,
    });
    const group = await buildGroup();
    const res = await server.post("/api/collections.remove_group", user, {
      body: {
        id: collection.id,
        groupId: group.id,
      },
    });
    const body = await res.json();
    expect(res.status).toEqual(403);
    expect(body).toMatchSnapshot();
  });

  it("should require authentication", async () => {
    const res = await server.post("/api/collections.remove_group");
    expect(res.status).toEqual(401);
  });

  it("should require authorization", async () => {
    const collection = await buildCollection();
    const user = await buildUser();
    const group = await buildGroup({
      teamId: user.teamId,
    });
    const res = await server.post("/api/collections.remove_group", user, {
      body: {
        id: collection.id,
        groupId: group.id,
      },
    });
    expect(res.status).toEqual(403);
  });
});

describe("#collections.remove_user", () => {
  it("should remove user from collection", async () => {
    const admin = await buildAdmin();
    const collection = await buildCollection({
      teamId: admin.teamId,
      userId: admin.id,
      permission: null,
    });
    const anotherUser = await buildUser({
      teamId: admin.teamId,
    });
    await server.post("/api/collections.add_user", admin, {
      body: {
        id: collection.id,
        userId: anotherUser.id,
      },
    });
    const res = await server.post("/api/collections.remove_user", admin, {
      body: {
        id: collection.id,
        userId: anotherUser.id,
      },
    });
    const users = await collection.$get("users");
    expect(res.status).toEqual(200);
    expect(users.length).toEqual(1);
  });

  it("should fail with status 400 bad request if user is not a member", async () => {
    const admin = await buildAdmin();
    const collection = await buildCollection({
      teamId: admin.teamId,
      userId: admin.id,
      permission: null,
    });
    const nonMember = await buildUser({
      teamId: admin.teamId,
    });
    const res = await server.post("/api/collections.remove_user", admin, {
      body: {
        id: collection.id,
        userId: nonMember.id,
      },
    });
    const body = await res.json();
    expect(res.status).toEqual(400);
    expect(body.message).toEqual("User is not a collection member");
  });

  it("should require user in team", async () => {
    const user = await buildUser();
    const collection = await buildCollection({
      teamId: user.teamId,
      permission: null,
    });
    const anotherUser = await buildUser();
    const res = await server.post("/api/collections.remove_user", user, {
      body: {
        id: collection.id,
        userId: anotherUser.id,
      },
    });
    const body = await res.json();
    expect(res.status).toEqual(403);
    expect(body).toMatchSnapshot();
  });

  it("should require authentication", async () => {
    const res = await server.post("/api/collections.remove_user");
    expect(res.status).toEqual(401);
  });

  it("should require authorization", async () => {
    const collection = await buildCollection();
    const user = await buildUser();
    const anotherUser = await buildUser({
      teamId: user.teamId,
    });
    const res = await server.post("/api/collections.remove_user", user, {
      body: {
        id: collection.id,
        userId: anotherUser.id,
      },
    });
    expect(res.status).toEqual(403);
  });
});

describe("#collections.group_memberships", () => {
  it("should return groups in private collection", async () => {
    const user = await buildUser();
    const group = await buildGroup({
      teamId: user.teamId,
    });
    const collection = await buildCollection({
      permission: null,
      teamId: user.teamId,
    });
    await UserMembership.create({
      createdById: user.id,
      collectionId: collection.id,
      userId: user.id,
      permission: CollectionPermission.ReadWrite,
    });
    await GroupMembership.create({
      createdById: user.id,
      collectionId: collection.id,
      groupId: group.id,
      permission: CollectionPermission.ReadWrite,
    });
    const res = await server.post("/api/collections.group_memberships", user, {
      body: {
        id: collection.id,
      },
    });
    const [membership] = await collection.$get("groupMemberships");
    const body = await res.json();
    expect(res.status).toEqual(200);
    expect(body.data.groups.length).toEqual(1);
    expect(body.data.groups[0].id).toEqual(group.id);
    expect(body.data.groupMemberships.length).toEqual(1);
    expect(body.data.groupMemberships[0].id).toEqual(membership.id);
    expect(body.data.groupMemberships[0].permission).toEqual(
      CollectionPermission.ReadWrite
    );
  });

  it("should allow filtering groups in collection by name", async () => {
    const user = await buildUser();
    const group = await buildGroup({
      name: "will find",
      teamId: user.teamId,
    });
    const group2 = await buildGroup({
      name: "wont find",
      teamId: user.teamId,
    });
    const collection = await buildCollection({
      permission: null,
      teamId: user.teamId,
    });
    await UserMembership.create({
      createdById: user.id,
      collectionId: collection.id,
      userId: user.id,
      permission: CollectionPermission.ReadWrite,
    });
    await GroupMembership.create({
      createdById: user.id,
      collectionId: collection.id,
      groupId: group.id,
      permission: CollectionPermission.ReadWrite,
    });
    await GroupMembership.create({
      createdById: user.id,
      collectionId: collection.id,
      groupId: group2.id,
      permission: CollectionPermission.ReadWrite,
    });
    const res = await server.post("/api/collections.group_memberships", user, {
      body: {
        id: collection.id,
        query: "will",
      },
    });
    const body = await res.json();
    expect(res.status).toEqual(200);
    expect(body.data.groups.length).toEqual(1);
    expect(body.data.groups[0].id).toEqual(group.id);
  });

  it("should allow filtering groups in collection by permission", async () => {
    const user = await buildUser();
    const group = await buildGroup({
      teamId: user.teamId,
    });
    const group2 = await buildGroup({
      teamId: user.teamId,
    });
    const collection = await buildCollection({
      permission: null,
      teamId: user.teamId,
    });
    await UserMembership.create({
      createdById: user.id,
      collectionId: collection.id,
      userId: user.id,
      permission: CollectionPermission.ReadWrite,
    });
    await GroupMembership.create({
      createdById: user.id,
      collectionId: collection.id,
      groupId: group.id,
      permission: CollectionPermission.ReadWrite,
    });
    await GroupMembership.create({
      createdById: user.id,
      collectionId: collection.id,
      groupId: group2.id,
      permission: CollectionPermission.Read,
    });
    const res = await server.post("/api/collections.group_memberships", user, {
      body: {
        id: collection.id,
        permission: CollectionPermission.Read,
      },
    });
    const body = await res.json();
    expect(res.status).toEqual(200);
    expect(body.data.groups.length).toEqual(1);
    expect(body.data.groups[0].id).toEqual(group2.id);
  });

  it("should require authentication", async () => {
    const res = await server.post("/api/collections.group_memberships");
    const body = await res.json();
    expect(res.status).toEqual(401);
    expect(body).toMatchSnapshot();
  });

  it("should require authorization", async () => {
    const user = await buildUser();
    const collection = await buildCollection({
      permission: null,
      teamId: user.teamId,
    });
    const res = await server.post("/api/collections.group_memberships", user, {
      body: {
        id: collection.id,
      },
    });
    expect(res.status).toEqual(403);
  });
});

describe("#collections.memberships", () => {
  it("should return members in private collection", async () => {
    const team = await buildTeam();
    const user = await buildUser({ teamId: team.id });
    const collection = await buildCollection({
      userId: user.id,
      teamId: team.id,
    });
    collection.permission = null;
    await collection.save();

    const res = await server.post("/api/collections.memberships", user, {
      body: {
        id: collection.id,
      },
    });
    const [membership] = await collection.$get("memberships");
    const body = await res.json();
    expect(res.status).toEqual(200);
    expect(body.data.users.length).toEqual(1);
    expect(body.data.users[0].id).toEqual(user.id);
    expect(body.data.memberships.length).toEqual(1);
    expect(body.data.memberships[0].id).toEqual(membership.id);
    expect(body.data.memberships[0].permission).toEqual(
      CollectionPermission.Admin
    );
  });

  it("should allow filtering members in collection by name", async () => {
    const team = await buildTeam();
    const user = await buildUser({ teamId: team.id });
    const collection = await buildCollection({
      userId: user.id,
      teamId: team.id,
    });
    const user2 = await buildUser({
      name: "Won't find",
    });
    await UserMembership.create({
      createdById: user2.id,
      collectionId: collection.id,
      userId: user2.id,
      permission: CollectionPermission.ReadWrite,
    });
    const res = await server.post("/api/collections.memberships", user, {
      body: {
        id: collection.id,
        query: user.name.slice(0, 3),
      },
    });
    const body = await res.json();
    expect(res.status).toEqual(200);
    expect(body.data.users.length).toEqual(1);
    expect(body.data.users[0].id).toEqual(user.id);
  });

  it("should allow filtering members in collection by permission", async () => {
    const team = await buildTeam();
    const user = await buildUser({ teamId: team.id });
    const collection = await buildCollection({
      userId: user.id,
      teamId: team.id,
    });
    const user2 = await buildUser();
    await UserMembership.create({
      createdById: user.id,
      collectionId: collection.id,
      userId: user.id,
      permission: CollectionPermission.ReadWrite,
    });
    await UserMembership.create({
      createdById: user2.id,
      collectionId: collection.id,
      userId: user2.id,
      permission: CollectionPermission.Read,
    });
    const res = await server.post("/api/collections.memberships", user, {
      body: {
        id: collection.id,
        permission: CollectionPermission.Read,
      },
    });
    const body = await res.json();
    expect(res.status).toEqual(200);
    expect(body.data.users.length).toEqual(1);
    expect(body.data.users[0].id).toEqual(user2.id);
  });

  it("should require authentication", async () => {
    const res = await server.post("/api/collections.memberships");
    const body = await res.json();
    expect(res.status).toEqual(401);
    expect(body).toMatchSnapshot();
  });

  it("should require authorization", async () => {
    const collection = await buildCollection();
    const user = await buildUser();
    const res = await server.post("/api/collections.memberships", user, {
      body: {
        id: collection.id,
      },
    });
    expect(res.status).toEqual(403);
  });
});

describe("#collections.info", () => {
  it("should return archivedBy for archived collections", async () => {
    const team = await buildTeam();
    const user = await buildUser({ teamId: team.id });
    const collection = await buildCollection({
      userId: user.id,
      teamId: team.id,
      archivedAt: new Date(),
      archivedById: user.id,
    });
    const res = await server.post("/api/collections.info", user, {
      body: {
        id: collection.id,
      },
    });
    const body = await res.json();
    expect(res.status).toEqual(200);
    expect(body.data.archivedBy.id).toEqual(collection.archivedById);
  });

  it("should return collection", async () => {
    const team = await buildTeam();
    const user = await buildUser({ teamId: team.id });
    const collection = await buildCollection({
      userId: user.id,
      teamId: team.id,
    });
    const res = await server.post("/api/collections.info", user, {
      body: {
        id: collection.id,
      },
    });
    const body = await res.json();
    expect(res.status).toEqual(200);
    expect(body.data.id).toEqual(collection.id);
  });

  it("should work when passing urlId to id parameter", async () => {
    const team = await buildTeam();
    const user = await buildUser({ teamId: team.id });
    const collection = await buildCollection({
      userId: user.id,
      teamId: team.id,
    });
    const res = await server.post("/api/collections.info", user, {
      body: {
        id: `any-slug-${collection.urlId}`,
      },
    });
    const body = await res.json();
    expect(res.status).toEqual(200);
    expect(body.data.id).toEqual(collection.id);
    expect(body.data.urlId).toEqual(collection.urlId);
  });

  it("should require user member of collection", async () => {
    const team = await buildTeam();
    const user = await buildUser({ teamId: team.id });
    const collection = await buildCollection({
      userId: user.id,
      teamId: team.id,
    });
    collection.permission = null;
    await collection.save();
    await UserMembership.destroy({
      where: {
        collectionId: collection.id,
        userId: user.id,
      },
    });
    const res = await server.post("/api/collections.info", user, {
      body: {
        id: collection.id,
      },
    });
    expect(res.status).toEqual(403);
  });

  it("should allow user member of collection", async () => {
    const team = await buildTeam();
    const user = await buildUser({ teamId: team.id });
    const collection = await buildCollection({
      userId: user.id,
      teamId: team.id,
    });
    collection.permission = null;
    await collection.save();
    await UserMembership.create({
      collectionId: collection.id,
      userId: user.id,
      createdById: user.id,
      permission: CollectionPermission.Read,
    });
    const res = await server.post("/api/collections.info", user, {
      body: {
        id: collection.id,
      },
    });
    const body = await res.json();
    expect(res.status).toEqual(200);
    expect(body.data.id).toEqual(collection.id);
  });

  it("should require authentication", async () => {
    const res = await server.post("/api/collections.info");
    const body = await res.json();
    expect(res.status).toEqual(401);
    expect(body).toMatchSnapshot();
  });

  it("should require authorization", async () => {
    const collection = await buildCollection();
    const user = await buildUser();
    const res = await server.post("/api/collections.info", user, {
      body: {
        id: collection.id,
      },
    });
    expect(res.status).toEqual(403);
  });
});

describe("#collections.create", () => {
  it("should require authentication", async () => {
    const res = await server.post("/api/collections.create");
    const body = await res.json();
    expect(res.status).toEqual(401);
    expect(body).toMatchSnapshot();
  });

  it("should create collection", async () => {
    const user = await buildUser();
    const res = await server.post("/api/collections.create", user, {
      body: {
        name: "Test",
      },
    });
    const body = await res.json();
    expect(res.status).toEqual(200);
    expect(body.data.id).toBeTruthy();
    expect(body.data.name).toBe("Test");
    expect(body.data.sort.field).toBe("index");
    expect(body.data.sort.direction).toBe("asc");
    expect(body.data.permission).toBe(null);
    expect(body.policies.length).toBe(1);
    expect(body.policies[0].abilities.read).toBeTruthy();
  });

  it("should error when index is invalid", async () => {
    const user = await buildUser();
    const res = await server.post("/api/collections.create", user, {
      body: {
        name: "Test",
        index: "يونيكود",
      },
    });
    expect(res.status).toEqual(400);
  });

  it("rejects providing both description and data", async () => {
    const user = await buildUser();
    const res = await server.post("/api/collections.create", user, {
      body: {
        name: "Test",
        description: "Test",
        data: {
          type: "doc",
          content: [
            { type: "paragraph", content: [{ type: "text", text: "Test" }] },
          ],
        },
      },
    });
    expect(res.status).toEqual(400);
  });

  it("should allow setting sharing to false", async () => {
    const user = await buildUser();
    const res = await server.post("/api/collections.create", user, {
      body: {
        name: "Test",
        sharing: false,
      },
    });
    const body = await res.json();
    expect(res.status).toEqual(200);
    expect(body.data.id).toBeTruthy();
    expect(body.data.sharing).toBe(false);
  });

  it("should return correct policies with private collection", async () => {
    const user = await buildUser();
    const res = await server.post("/api/collections.create", user, {
      body: {
        name: "Test",
        permission: null,
      },
    });
    const body = await res.json();
    expect(res.status).toEqual(200);
    expect(body.data.permission).toEqual(null);
    expect(body.policies.length).toBe(1);
    expect(body.policies[0].abilities.read).toBeTruthy();
  });

  it("should ensure unique index across the team", async () => {
    const team = await buildTeam();
    const [adminA, adminB] = await Promise.all([
      buildAdmin({ teamId: team.id }),
      buildAdmin({ teamId: team.id }),
    ]);

    const resA = await server.post("/api/collections.create", adminA, {
      body: {
        name: "Test A",
      },
    });
    const resB = await server.post("/api/collections.create", adminB, {
      body: {
        name: "Test B",
      },
    });
    const [bodyA, bodyB] = await Promise.all([resA.json(), resB.json()]);

    expect(resA.status).toEqual(200);
    expect(resB.status).toEqual(200);
    expect(bodyA.data.index).not.toEqual(bodyB.data.index);
  });

  it("if index collision, should updated index of other collection", async () => {
    const user = await buildUser();
    const createdCollectionAResponse = await server.post(
      "/api/collections.create",
      user,
      {
        body: {
          name: "A",
          sharing: false,
          index: "a",
        },
      }
    );
    await createdCollectionAResponse.json();
    const createCollectionResponse = await server.post(
      "/api/collections.create",
      user,
      {
        body: {
          name: "C",
          sharing: false,
          index: "a",
        },
      }
    );
    const createdCollection = await createCollectionResponse.json();
    expect(createCollectionResponse.status).toEqual(200);
    expect(createdCollection.data.index).toEqual("p");
    expect(createdCollection.data.index > "a").toBeTruthy();
  });

  it("if index collision with an extra collection, should updated index of other collection", async () => {
    const user = await buildUser();
    const createdCollectionAResponse = await server.post(
      "/api/collections.create",
      user,
      {
        body: {
          name: "A",
          sharing: false,
          index: "a",
        },
      }
    );
    const createdCollectionBResponse = await server.post(
      "/api/collections.create",
      user,
      {
        body: {
          name: "B",
          sharing: false,
          index: "b",
        },
      }
    );
    await createdCollectionAResponse.json();
    await createdCollectionBResponse.json();
    const createCollectionResponse = await server.post(
      "/api/collections.create",
      user,
      {
        body: {
          name: "C",
          sharing: false,
          index: "a",
        },
      }
    );
    const createdCollection = await createCollectionResponse.json();
    expect(createCollectionResponse.status).toEqual(200);
    expect(createdCollection.data.index).toEqual("aP");
    expect(createdCollection.data.index > "a").toBeTruthy();
    expect(createdCollection.data.index < "b").toBeTruthy();
  });
});

describe("#collections.duplicate", () => {
  const schedule = mockTaskSchedule();

  it("should require authentication", async () => {
    const res = await server.post("/api/collections.duplicate");
    const body = await res.json();
    expect(res.status).toEqual(401);
    expect(body).toMatchSnapshot();
  });

  it("should duplicate collection with properties", async () => {
    const team = await buildTeam();
    const user = await buildUser({ teamId: team.id });
    const collection = await buildCollection({
      userId: user.id,
      teamId: team.id,
      icon: "flame",
      color: "#FF0000",
      sharing: false,
    });

    const res = await server.post("/api/collections.duplicate", user, {
      body: {
        id: collection.id,
      },
    });
    const body = await res.json();

    expect(res.status).toEqual(200);
    expect(body.data.id).not.toEqual(collection.id);
    expect(body.data.name).toEqual(collection.name);
    expect(body.data.icon).toEqual("flame");
    expect(body.data.color).toEqual("#FF0000");
    expect(body.data.sharing).toEqual(false);
    expect(body.data.permission).toEqual(collection.permission);
    expect(body.policies.length).toEqual(1);
    expect(body.policies[0].abilities.read).toBeTruthy();
  });

  it("should allow overriding the name", async () => {
    const team = await buildTeam();
    const user = await buildUser({ teamId: team.id });
    const collection = await buildCollection({
      userId: user.id,
      teamId: team.id,
    });

    const res = await server.post("/api/collections.duplicate", user, {
      body: {
        id: collection.id,
        name: "Copied collection",
      },
    });
    const body = await res.json();

    expect(res.status).toEqual(200);
    expect(body.data.name).toEqual("Copied collection");
  });

  it("should schedule documents in the collection to be duplicated", async () => {
    const team = await buildTeam();
    const user = await buildUser({ teamId: team.id });
    const collection = await buildCollection({
      userId: user.id,
      teamId: team.id,
    });

    const res = await server.post("/api/collections.duplicate", user, {
      body: {
        id: collection.id,
      },
    });
    const body = await res.json();

    expect(res.status).toEqual(200);
    expect(schedule).toHaveBeenCalledWith(
      expect.objectContaining({
        collectionId: body.data.id,
        originalCollectionId: collection.id,
        actorId: user.id,
      })
    );
  });

  it("should require read permission on a private collection", async () => {
    const team = await buildTeam();
    const owner = await buildUser({ teamId: team.id });
    const user = await buildUser({ teamId: team.id });
    const collection = await buildCollection({
      userId: owner.id,
      teamId: team.id,
      permission: null,
    });

    const res = await server.post("/api/collections.duplicate", user, {
      body: {
        id: collection.id,
      },
    });
    expect(res.status).toEqual(403);
  });

  it("should not allow members when collection creation is restricted", async () => {
    const team = await buildTeam({
      memberCollectionCreate: false,
    });
    const user = await buildUser({ teamId: team.id });
    const collection = await buildCollection({
      userId: user.id,
      teamId: team.id,
    });

    const res = await server.post("/api/collections.duplicate", user, {
      body: {
        id: collection.id,
      },
    });
    expect(res.status).toEqual(403);
  });

  it("should not allow duplicating an archived collection", async () => {
    const team = await buildTeam();
    const user = await buildUser({ teamId: team.id });
    const collection = await buildCollection({
      userId: user.id,
      teamId: team.id,
      archivedAt: new Date(),
    });

    const res = await server.post("/api/collections.duplicate", user, {
      body: {
        id: collection.id,
      },
    });
    expect(res.status).toEqual(403);
  });
});

describe("#collections.update", () => {
  describe("deprecatedReason", () => {
    it.each(["admin", "manager"])(
      "should let a collection %s save a reason without changing archive attribution",
      async (role) => {
        const owner = await buildUser();
        const editor =
          role === "admin" ? await buildAdmin({ teamId: owner.teamId }) : owner;
        const collection = await buildCollection({
          userId: owner.id,
          teamId: owner.teamId,
          archivedAt: new Date(),
        });
        const updatedAt = collection.updatedAt.toISOString();
        const archivedAt = collection.archivedAt?.toISOString();
        const res = await server.post("/api/collections.update", editor, {
          body: {
            id: collection.id,
            deprecatedReason: "  Replaced by the new collection.  ",
          },
        });
        expect(res.status).toBe(200);
        const body = await res.json();
        expect(body.data.deprecatedReason).toBe(
          "Replaced by the new collection."
        );
        expect(body.data.archivedAt).toBe(archivedAt);
        expect(body.data.archivedBy.id).toBe(owner.id);
        expect(body.data.updatedAt).toBe(updatedAt);
        expect(body.policies[0].abilities.updateDeprecatedReason).toBeTruthy();
        await collection.reload();
        expect(collection.deprecatedReason).toBe(
          "Replaced by the new collection."
        );
      }
    );

    it.each([null, "", "   "])(
      "should clear the reason with %j",
      async (value) => {
        const user = await buildUser();
        const collection = await buildCollection({
          userId: user.id,
          teamId: user.teamId,
          archivedAt: new Date(),
          deprecatedReason: "Outdated",
        });
        const res = await server.post("/api/collections.update", user, {
          body: { id: collection.id, deprecatedReason: value },
        });
        expect(res.status).toBe(200);
        await collection.reload();
        expect(collection.deprecatedReason).toBeNull();
      }
    );

    it.each(["member", "viewer", "other team"])(
      "should deny edits by a %s without collection management access",
      async (role) => {
        const owner = await buildUser();
        const editor =
          role === "viewer"
            ? await buildViewer({ teamId: owner.teamId })
            : await buildUser(
                role === "other team" ? {} : { teamId: owner.teamId }
              );
        const collection = await buildCollection({
          userId: owner.id,
          teamId: owner.teamId,
          archivedAt: new Date(),
          deprecatedReason: "Outdated",
        });
        const res = await server.post("/api/collections.update", editor, {
          body: { id: collection.id, deprecatedReason: "Changed" },
        });
        expect(res.status).toBe(403);
        await collection.reload();
        expect(collection.deprecatedReason).toBe("Outdated");
      }
    );

    it("should show the reason to readers", async () => {
      const owner = await buildUser();
      const reader = await buildViewer({ teamId: owner.teamId });
      const collection = await buildCollection({
        userId: owner.id,
        teamId: owner.teamId,
        archivedAt: new Date(),
        deprecatedReason: "Outdated",
      });
      const res = await server.post("/api/collections.info", reader, {
        body: { id: collection.id },
      });
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.data.deprecatedReason).toBe("Outdated");
      expect(body.policies[0].abilities.updateDeprecatedReason).toBeFalsy();
    });

    it.each([
      { name: "Changed" },
      { description: "Changed" },
      { permission: null },
    ])(
      "should reject updates to other fields with a reason: %j",
      async (fields) => {
        const user = await buildUser();
        const collection = await buildCollection({
          userId: user.id,
          teamId: user.teamId,
          archivedAt: new Date(),
        });
        const res = await server.post("/api/collections.update", user, {
          body: { id: collection.id, deprecatedReason: "Outdated", ...fields },
        });
        expect(res.status).toBe(403);
        await collection.reload();
        expect(collection.deprecatedReason).toBeNull();
      }
    );

    it.each(["active", "deleted"])(
      "should reject a reason on an %s collection",
      async (status) => {
        const user = await buildUser();
        const collection = await buildCollection({
          userId: user.id,
          teamId: user.teamId,
          deletedAt: status === "deleted" ? new Date() : null,
        });
        const res = await server.post("/api/collections.update", user, {
          body: { id: collection.id, deprecatedReason: "Outdated" },
        });
        expect(res.status).toBe(403);
      }
    );

    it("should validate the reason length", async () => {
      const user = await buildUser();
      const collection = await buildCollection({
        userId: user.id,
        teamId: user.teamId,
        archivedAt: new Date(),
      });
      const res = await server.post("/api/collections.update", user, {
        body: {
          id: collection.id,
          deprecatedReason: "x".repeat(
            DeprecationValidation.maxReasonLength + 1
          ),
        },
      });
      expect(res.status).toBe(400);
    });
  });

  it("should require authentication", async () => {
    const collection = await buildCollection();
    const res = await server.post("/api/collections.update", {
      body: {
        id: collection.id,
        name: "Test",
      },
    });
    const body = await res.json();
    expect(res.status).toEqual(401);
    expect(body).toMatchSnapshot();
  });

  it("should require authorization", async () => {
    const collection = await buildCollection();
    const user = await buildUser();
    const res = await server.post("/api/collections.update", user, {
      body: {
        id: collection.id,
        name: "Test",
      },
    });
    expect(res.status).toEqual(403);
  });

  it("allows editing non-private collection", async () => {
    const team = await buildTeam();
    const admin = await buildAdmin({ teamId: team.id });
    const collection = await buildCollection({ teamId: team.id });
    const res = await server.post("/api/collections.update", admin, {
      body: {
        id: collection.id,
        name: "Test",
      },
    });
    const body = await res.json();
    expect(res.status).toEqual(200);
    expect(body.data.name).toBe("Test");
    expect(body.policies.length).toBe(1);
  });

  it("allows editing description", async () => {
    const team = await buildTeam();
    const admin = await buildAdmin({ teamId: team.id });
    const collection = await buildCollection({ teamId: team.id });
    const res = await server.post("/api/collections.update", admin, {
      body: {
        id: collection.id,
        description: "Test",
      },
    });
    const body = await res.json();
    expect(res.status).toEqual(200);
    expect(body.data.description).toBe("Test");

    await collection.reload();

    expect(collection.description).toBe("Test");
    expect(collection.content).toBeTruthy();
  });

  it("replaces rendered content when description is updated post-create", async () => {
    const team = await buildTeam();
    const admin = await buildAdmin({ teamId: team.id });

    const createRes = await server.post("/api/collections.create", admin, {
      headers: { "x-api-version": "3" },
      body: { name: "Foo", description: "Original" },
    });
    const { id } = (await createRes.json()).data;

    const updateRes = await server.post("/api/collections.update", admin, {
      headers: { "x-api-version": "3" },
      body: { id, description: "Replaced" },
    });
    expect(updateRes.status).toEqual(200);

    const infoRes = await server.post("/api/collections.info", admin, {
      headers: { "x-api-version": "3" },
      body: { id },
    });
    const content = JSON.stringify((await infoRes.json()).data.data);
    expect(content).toContain("Replaced");
    expect(content).not.toContain("Original");
  });

  it("rejects providing both description and data", async () => {
    const team = await buildTeam();
    const admin = await buildAdmin({ teamId: team.id });
    const collection = await buildCollection({ teamId: team.id });
    const res = await server.post("/api/collections.update", admin, {
      body: {
        id: collection.id,
        description: "Test",
        data: {
          type: "doc",
          content: [
            { type: "paragraph", content: [{ type: "text", text: "Test" }] },
          ],
        },
      },
    });
    expect(res.status).toEqual(400);
  });

  it("allows editing data", async () => {
    const team = await buildTeam();
    const admin = await buildAdmin({ teamId: team.id });
    const collection = await buildCollection({ teamId: team.id });
    const res = await server.post("/api/collections.update", admin, {
      body: {
        id: collection.id,
        data: {
          content: [
            { content: [{ text: "Test", type: "text" }], type: "paragraph" },
          ],
          type: "doc",
        },
      },
    });
    const body = await res.json();
    expect(res.status).toEqual(200);
    expect(body.data.description).toBe("Test");
  });

  it("allows editing sort", async () => {
    const team = await buildTeam();
    const admin = await buildAdmin({ teamId: team.id });
    const collection = await buildCollection({ teamId: team.id });
    const sort = {
      field: "index",
      direction: "desc",
    };
    const res = await server.post("/api/collections.update", admin, {
      body: {
        id: collection.id,
        sort,
      },
    });
    const body = await res.json();
    expect(res.status).toEqual(200);
    expect(body.data.sort.field).toBe("index");
    expect(body.data.sort.direction).toBe("desc");
  });

  it("allows editing individual fields", async () => {
    const team = await buildTeam();
    const admin = await buildAdmin({ teamId: team.id });
    const collection = await buildCollection({ teamId: team.id });
    const res = await server.post("/api/collections.update", admin, {
      body: {
        id: collection.id,
        permission: null,
      },
    });
    const body = await res.json();
    expect(res.status).toEqual(200);
    expect(body.data.permission).toBe(null);
    expect(body.data.name).toBe(collection.name);
  });

  it("allows editing from non-private to private collection, and trims whitespace", async () => {
    const team = await buildTeam();
    const admin = await buildAdmin({ teamId: team.id });
    const collection = await buildCollection({ teamId: team.id });
    const res = await server.post("/api/collections.update", admin, {
      body: {
        id: collection.id,
        permission: null,
        name: "  Test  ",
      },
    });
    const body = await res.json();
    expect(res.status).toEqual(200);
    expect(body.data.name).toBe("Test");
    expect(body.data.permission).toBe(null);
    // ensure we return with a write level policy
    expect(body.policies.length).toBe(1);
    expect(body.policies[0].abilities.update).toBeTruthy();
  });

  it("allows editing from private to non-private collection", async () => {
    const team = await buildTeam();
    const admin = await buildAdmin({ teamId: team.id });
    const collection = await buildCollection({ teamId: team.id });
    collection.permission = null;
    await collection.save();
    await UserMembership.create({
      collectionId: collection.id,
      userId: admin.id,
      createdById: admin.id,
      permission: CollectionPermission.ReadWrite,
    });
    const res = await server.post("/api/collections.update", admin, {
      body: {
        id: collection.id,
        permission: CollectionPermission.ReadWrite,
        name: "Test",
      },
    });
    const body = await res.json();
    expect(res.status).toEqual(200);
    expect(body.data.name).toBe("Test");
    expect(body.data.permission).toBe(CollectionPermission.ReadWrite);
    // ensure we return with a write level policy
    expect(body.policies.length).toBe(1);
    expect(body.policies[0].abilities.update).toBeTruthy();
  });

  it("allows editing by read-write collection user", async () => {
    const team = await buildTeam();
    const admin = await buildAdmin({ teamId: team.id });
    const collection = await buildCollection({ teamId: team.id });
    collection.permission = null;
    await collection.save();
    await UserMembership.create({
      collectionId: collection.id,
      userId: admin.id,
      createdById: admin.id,
      permission: CollectionPermission.ReadWrite,
    });
    const res = await server.post("/api/collections.update", admin, {
      body: {
        id: collection.id,
        name: "Test",
      },
    });
    const body = await res.json();
    expect(res.status).toEqual(200);
    expect(body.data.name).toBe("Test");
    expect(body.policies.length).toBe(1);
  });

  it("allows editing by admin collection group user", async () => {
    const user = await buildUser();
    const collection = await buildCollection({
      permission: null,
      teamId: user.teamId,
    });
    const group = await buildGroup({
      teamId: user.teamId,
    });
    await group.$add("user", user, {
      through: {
        createdById: user.id,
      },
    });
    await collection.$add("group", group, {
      through: {
        permission: CollectionPermission.Admin,
        createdById: user.id,
      },
    });
    const res = await server.post("/api/collections.update", user, {
      body: {
        id: collection.id,
        name: "Test",
      },
    });
    const body = await res.json();
    expect(res.status).toEqual(200);
    expect(body.data.name).toBe("Test");
    expect(body.policies.length).toBe(1);
  });

  it("does not allow editing by read-only collection user", async () => {
    const team = await buildTeam();
    const user = await buildUser({ teamId: team.id });
    const collection = await buildCollection({
      userId: user.id,
      teamId: team.id,
    });
    collection.permission = null;
    await collection.save();
    await UserMembership.update(
      {
        createdById: user.id,
        permission: CollectionPermission.Read,
      },
      {
        where: {
          collectionId: collection.id,
          userId: user.id,
        },
      }
    );
    const res = await server.post("/api/collections.update", user, {
      body: {
        id: collection.id,
        name: "Test",
      },
    });
    expect(res.status).toEqual(403);
  });

  it("does not allow setting unknown sort fields", async () => {
    const team = await buildTeam();
    const admin = await buildAdmin({ teamId: team.id });
    const collection = await buildCollection({ teamId: team.id });
    const sort = {
      field: "blah",
      direction: "desc",
    };
    const res = await server.post("/api/collections.update", admin, {
      body: {
        id: collection.id,
        sort,
      },
    });
    expect(res.status).toEqual(400);
  });

  it("does not allow setting unknown sort directions", async () => {
    const team = await buildTeam();
    const admin = await buildAdmin({ teamId: team.id });
    const collection = await buildCollection({ teamId: team.id });
    const sort = {
      field: "title",
      direction: "blah",
    };
    const res = await server.post("/api/collections.update", admin, {
      body: {
        id: collection.id,
        sort,
      },
    });
    expect(res.status).toEqual(400);
  });
});

describe("#collections.delete", () => {
  it.each([undefined, "  Replaced by a new guide.  ", null, "   "])(
    "should delete with reason %j",
    async (reason) => {
      const user = await buildUser();
      const collection = await buildCollection({
        userId: user.id,
        teamId: user.teamId,
        archivedAt: new Date(),
        deprecatedReason: "Archived reason",
      });
      await buildCollection({ teamId: user.teamId });
      const res = await server.post("/api/collections.delete", user, {
        body: { id: collection.id, reason },
      });
      expect(res.status).toBe(200);
      await collection.reload({ paranoid: false });
      expect(collection.deletedAt).not.toBeNull();
      const expectedReason =
        reason === undefined ? "Archived reason" : reason?.trim() || null;
      expect(collection.deprecatedReason).toBe(expectedReason);
    }
  );

  it("should reject an oversized reason before delete", async () => {
    const user = await buildUser();
    const collection = await buildCollection({
      userId: user.id,
      teamId: user.teamId,
    });
    const res = await server.post("/api/collections.delete", user, {
      body: {
        id: collection.id,
        reason: "x".repeat(DeprecationValidation.maxReasonLength + 1),
      },
    });
    expect(res.status).toBe(400);
    await collection.reload();
    expect(collection.isActive).toBe(true);
    expect(collection.deprecatedReason).toBeNull();
  });

  it("should require authentication", async () => {
    const res = await server.post("/api/collections.delete");
    const body = await res.json();
    expect(res.status).toEqual(401);
    expect(body).toMatchSnapshot();
  });

  it("should require authorization", async () => {
    const collection = await buildCollection();
    const user = await buildUser();
    const res = await server.post("/api/collections.delete", user, {
      body: {
        id: collection.id,
      },
    });
    expect(res.status).toEqual(403);
  });

  it("should not allow deleting last collection", async () => {
    const team = await buildTeam();
    const admin = await buildAdmin({ teamId: team.id });
    const collection = await buildCollection({ teamId: team.id });
    const res = await server.post("/api/collections.delete", admin, {
      body: {
        id: collection.id,
        reason: "No longer needed",
      },
    });
    expect(res.status).toEqual(400);
    await collection.reload();
    expect(collection.deprecatedReason).toBeNull();
    expect(collection.isActive).toBe(true);
  });

  it("should delete collection", async () => {
    const team = await buildTeam();
    const admin = await buildAdmin({ teamId: team.id });
    const collection = await buildCollection({ teamId: team.id });
    await buildCollection({ teamId: team.id });

    const res = await server.post("/api/collections.delete", admin, {
      body: {
        id: collection.id,
        reason: "No longer needed",
      },
    });
    const body = await res.json();
    expect(res.status).toEqual(200);
    expect(body.success).toBe(true);
    await collection.reload({ paranoid: false });
    expect(collection.deprecatedReason).toBe("No longer needed");
  });

  it("should delete published documents", async () => {
    const team = await buildTeam();
    const admin = await buildAdmin({ teamId: team.id });
    const collection = await buildCollection({ teamId: team.id });
    // to ensure it isn't the last collection
    await buildCollection({
      teamId: admin.teamId,
      createdById: admin.id,
    });
    // archived document should not be deleted
    await buildDocument({
      collectionId: collection.id,
      archivedAt: new Date(),
    });
    const res = await server.post("/api/collections.delete", admin, {
      body: {
        id: collection.id,
      },
    });
    const body = await res.json();
    expect(res.status).toEqual(200);
    expect(body.success).toBe(true);
    expect(
      await Document.count({
        where: {
          collectionId: collection.id,
        },
      })
    ).toEqual(1);
  });

  it("allows deleting by admin collection group user", async () => {
    const user = await buildUser();
    const collection = await buildCollection({
      permission: null,
      teamId: user.teamId,
    });
    await buildCollection({
      teamId: user.teamId,
    });
    const group = await buildGroup({
      teamId: user.teamId,
    });
    await group.$add("user", user, {
      through: {
        createdById: user.id,
      },
    });
    await collection.$add("group", group, {
      through: {
        permission: CollectionPermission.Admin,
        createdById: user.id,
      },
    });
    const res = await server.post("/api/collections.delete", user, {
      body: {
        id: collection.id,
      },
    });
    const body = await res.json();
    expect(res.status).toEqual(200);
    expect(body.success).toBe(true);
  });
});

describe("#collections.archive", () => {
  it.each([undefined, "  Replaced by a new guide.  ", null, "   "])(
    "should archive with reason %j",
    async (reason) => {
      const user = await buildUser();
      const collection = await buildCollection({
        userId: user.id,
        teamId: user.teamId,
      });
      const res = await server.post("/api/collections.archive", user, {
        body: { id: collection.id, reason },
      });
      expect(res.status).toBe(200);
      await collection.reload({ paranoid: false });
      expect(collection.archivedAt).not.toBeNull();
      const expectedReason =
        reason === undefined ? null : reason?.trim() || null;
      expect(collection.deprecatedReason).toBe(expectedReason);
      const body = await res.json();
      expect(body.data.deprecatedReason).toBe(expectedReason);
    }
  );

  it("should reject an oversized reason before archive", async () => {
    const user = await buildUser();
    const collection = await buildCollection({
      userId: user.id,
      teamId: user.teamId,
    });
    const res = await server.post("/api/collections.archive", user, {
      body: {
        id: collection.id,
        reason: "x".repeat(DeprecationValidation.maxReasonLength + 1),
      },
    });
    expect(res.status).toBe(400);
    await collection.reload();
    expect(collection.isActive).toBe(true);
    expect(collection.deprecatedReason).toBeNull();
  });

  it("should archive collection", async () => {
    const team = await buildTeam();
    const admin = await buildAdmin({ teamId: team.id });
    const collection = await buildCollection({ teamId: team.id });
    const document = await buildDocument({
      collectionId: collection.id,
      teamId: team.id,
      publishedAt: new Date(),
    });

    await collection.reload();
    expect(collection.documentStructure).not.toBe(null);
    expect(document.archivedAt).toBe(null);
    const res = await server.post("/api/collections.archive", admin, {
      body: {
        id: collection.id,
      },
    });
    const [, , body] = await Promise.all([
      collection.reload(),
      document.reload(),
      res.json(),
    ]);
    expect(res.status).toEqual(200);
    expect(body.data.archivedAt).not.toBe(null);
    expect(body.data.archivedBy).toBeTruthy();
    expect(body.data.archivedBy.id).toBe(collection.archivedById);
    expect(document.archivedAt).not.toBe(null);
  });
});

describe("#collections.restore", () => {
  it("should restore collection", async () => {
    const team = await buildTeam();
    const admin = await buildAdmin({ teamId: team.id });
    const collection = await buildCollection({
      teamId: team.id,
    });
    const document = await buildDocument({
      collectionId: collection.id,
      teamId: team.id,
      publishedAt: new Date(),
    });
    // reload to ensure documentStructure is set
    await collection.reload();
    expect(collection.documentStructure).not.toBe(null);
    const archiveRes = await server.post("/api/collections.archive", admin, {
      body: {
        id: collection.id,
      },
    });
    const [, archiveBody] = await Promise.all([
      collection.reload(),
      archiveRes.json(),
    ]);
    expect(archiveRes.status).toEqual(200);
    expect(archiveBody.data.archivedAt).not.toBe(null);
    await document.update({ deprecatedReason: "Outdated" });
    await collection.update({ deprecatedReason: "Collection is outdated" });
    const res = await server.post("/api/collections.restore", admin, {
      body: {
        id: collection.id,
      },
    });
    const [, body] = await Promise.all([collection.reload(), res.json()]);
    expect(res.status).toEqual(200);
    expect(body.data.archivedAt).toBe(null);
    await document.reload();
    expect(document.deprecatedReason).toBeNull();
    expect(collection.deprecatedReason).toBeNull();
    expect(body.data.deprecatedReason).toBeNull();
    expect(collection.documentStructure).not.toBe(null);
  });

  it("should resolve index collision when restoring", async () => {
    const admin = await buildAdmin();
    let collection = await buildCollection({
      teamId: admin.teamId,
    });
    let archivedCollection = await buildCollection({
      teamId: admin.teamId,
      archivedAt: new Date(),
      archivedById: admin.id,
    });
    [collection, archivedCollection] = await Promise.all([
      collection.update({ index: "P" }, { hooks: false }),
      archivedCollection.update({ index: "P" }, { hooks: false }),
    ]);
    expect(collection.index).toEqual("P");
    expect(archivedCollection.index).toEqual("P");

    const res = await server.post("/api/collections.restore", admin, {
      body: {
        id: archivedCollection.id,
      },
    });
    const body = await res.json();

    expect(res.status).toEqual(200);
    expect(body.data.archivedAt).toBe(null);
    expect(body.data.index).not.toBe("P");
  });
});

describe("personal collections", () => {
  it("should not list the personal collection of another user", async () => {
    const team = await buildTeam();
    const owner = await buildUser({ teamId: team.id });
    const admin = await buildAdmin({ teamId: team.id });
    const personal = await buildPersonalCollection(owner);
    const own = await buildPersonalCollection(admin);

    for (const body of [{}, { includeListOnly: true }]) {
      const res = await server.post("/api/collections.list", admin, { body });
      const json = await res.json();
      expect(res.status).toEqual(200);
      const ids = json.data.map((c: { id: string }) => c.id);
      expect(ids).not.toContain(personal.id);
      expect(ids).toContain(own.id);
    }

    const res = await server.post("/api/collections.list", owner);
    const json = await res.json();
    expect(json.data.map((c: { id: string }) => c.id)).toEqual([personal.id]);
  });

  it("should not return the personal collection of another user", async () => {
    const team = await buildTeam();
    const owner = await buildUser({ teamId: team.id });
    const admin = await buildAdmin({ teamId: team.id });
    const personal = await buildPersonalCollection(owner);

    for (const route of [
      "collections.info",
      "collections.memberships",
      "collections.group_memberships",
      "collections.export",
      "collections.update",
      "collections.archive",
      "collections.delete",
    ]) {
      const res = await server.post(`/api/${route}`, admin, {
        body: { id: personal.id },
      });
      expect({ route, status: res.status }).toEqual({ route, status: 403 });
    }
  });

  it("should not allow membership changes", async () => {
    const team = await buildTeam();
    const owner = await buildUser({ teamId: team.id });
    const member = await buildUser({ teamId: team.id });
    const group = await buildGroup({ teamId: team.id });
    const personal = await buildPersonalCollection(owner);

    const res = await server.post("/api/collections.add_user", owner, {
      body: { id: personal.id, userId: member.id },
    });
    expect(res.status).toEqual(403);

    const res2 = await server.post("/api/collections.add_group", owner, {
      body: { id: personal.id, groupId: group.id },
    });
    expect(res2.status).toEqual(403);

    const res3 = await server.post("/api/collections.remove_user", owner, {
      body: { id: personal.id, userId: owner.id },
    });
    expect(res3.status).toEqual(403);
  });

  it("should not allow the owner to make it public or rename it", async () => {
    const owner = await buildUser();
    const personal = await buildPersonalCollection(owner);

    const res = await server.post("/api/collections.update", owner, {
      body: { id: personal.id, permission: CollectionPermission.ReadWrite },
    });
    expect(res.status).toEqual(400);

    const res2 = await server.post("/api/collections.update", owner, {
      body: { id: personal.id, name: "Notes" },
    });
    expect(res2.status).toEqual(400);

    const res3 = await server.post("/api/collections.update", owner, {
      body: { id: personal.id, sort: { field: "index", direction: "asc" } },
    });
    expect(res3.status).toEqual(200);
  });

  it("should not allow the owner to archive, delete or duplicate it", async () => {
    const owner = await buildUser();
    const personal = await buildPersonalCollection(owner);

    for (const route of [
      "collections.archive",
      "collections.delete",
      "collections.duplicate",
    ]) {
      const res = await server.post(`/api/${route}`, owner, {
        body: { id: personal.id },
      });
      expect({ route, status: res.status }).toEqual({ route, status: 403 });
    }
  });
});

describe("personal collection lists", () => {
  const keyword = "personalcollectionlists";

  type UserKey = "owner" | "collaborator" | "member" | "admin";

  const userKeys: UserKey[] = ["owner", "collaborator", "member", "admin"];

  let users: Record<UserKey, User>;
  let tokens: Record<UserKey, string>;
  let collectionId: string;
  let rootId: string;
  let nestedId: string;
  let publicDocumentId: string;

  /**
   * The personal ids that a user is expected to see. The collaborator has a
   * membership on the root document, which the nested document inherits.
   *
   * @param key The user.
   * @returns the ids of the collection and documents.
   */
  const readableIds = (key: UserKey) => {
    switch (key) {
      case "owner":
        return [collectionId, rootId, nestedId];
      case "collaborator":
        return [rootId, nestedId];
      default:
        return [];
    }
  };

  const personalIds = () => [collectionId, rootId, nestedId];

  beforeAll(async () => {
    const team = await buildTeam();
    const owner = await buildUser({ teamId: team.id });
    users = {
      owner,
      collaborator: await buildUser({ teamId: team.id }),
      member: await buildUser({ teamId: team.id }),
      admin: await buildAdmin({ teamId: team.id }),
    };

    const collection = await buildPersonalCollection(owner);
    const root = await buildDocument({
      teamId: team.id,
      userId: owner.id,
      collectionId: collection.id,
      title: `Root ${keyword}`,
      text: `Root ${keyword}`,
    });
    const nested = await buildDocument({
      teamId: team.id,
      userId: owner.id,
      collectionId: collection.id,
      parentDocumentId: root.id,
      title: `Nested ${keyword}`,
      text: `Nested ${keyword}`,
    });
    await collection.addDocumentToStructure(root, 0);
    await collection.addDocumentToStructure(nested, 0);

    await UserMembership.create({
      documentId: root.id,
      userId: users.collaborator.id,
      permission: DocumentPermission.Read,
      createdById: owner.id,
    });

    // A public document that links to the personal document.
    const publicCollection = await buildCollection({
      teamId: team.id,
      userId: owner.id,
    });
    const publicDocument = await buildDocument({
      teamId: team.id,
      userId: owner.id,
      collectionId: publicCollection.id,
    });
    await buildRelationship({
      userId: owner.id,
      documentId: publicDocument.id,
      reverseDocumentId: root.id,
    });

    // Everybody has viewed the document at some point.
    for (const user of Object.values(users)) {
      await View.create({ documentId: root.id, userId: user.id });
    }

    tokens = {} as Record<UserKey, string>;
    for (const key of userKeys) {
      const auth = await buildOAuthAuthentication({
        user: users[key],
        scope: [Scope.Read],
      });
      tokens[key] = auth.accessToken!;
    }

    collectionId = collection.id;
    rootId = root.id;
    nestedId = nested.id;
    publicDocumentId = publicDocument.id;
  });

  // Lists filter in queries rather than through the read policy, so they are
  // checked here for each user.
  it.each(userKeys)("only list what %s can read", async (key) => {
    const ids = (values: { id: string }[]) => values.map((value) => value.id);
    const post = async (route: string, body: Record<string, unknown>) => {
      const res = await server.post(`/api/${route}`, users[key], { body });
      expect({ route, status: res.status }).toEqual({ route, status: 200 });
      return res.json();
    };
    const mcpText = async (tool: string, args: Record<string, unknown>) => {
      const res = await callMcpTool(server, tokens[key], tool, args);
      return res?.result?.content?.map((c) => c.text).join("\n") ?? "";
    };

    const results: Record<string, string[]> = {
      "collections.list": ids((await post("collections.list", {})).data),
      "collections.list includeListOnly": ids(
        (await post("collections.list", { includeListOnly: true })).data
      ),
      "documents.list": ids((await post("documents.list", {})).data),
      "documents.viewed": ids((await post("documents.viewed", {})).data),
      "documents.search": (
        await post("documents.search", { query: keyword })
      ).data.map((result: { document: { id: string } }) => result.document.id),
      "documents.search_titles": ids(
        (await post("documents.search_titles", { query: keyword })).data
      ),
      "relationships.list": ids(
        (await post("relationships.list", { documentId: publicDocumentId }))
          .data.documents
      ),
    };

    // Documents include their collectionId, so only document ids are matched.
    const collectionsText = await mcpText("list_collections", {});
    const documentsText = await mcpText("list_documents", { query: keyword });
    results.list_collections = personalIds().filter((id) =>
      collectionsText.includes(id)
    );
    results.list_documents = [rootId, nestedId].filter((id) =>
      documentsText.includes(id)
    );

    const readable = readableIds(key);
    for (const [label, listed] of Object.entries(results)) {
      const leaked = listed.filter(
        (id) => personalIds().includes(id) && !readable.includes(id)
      );
      expect({ key, label, leaked }).toEqual({ key, label, leaked: [] });
    }

    if (key === "owner") {
      expect(results["collections.list"]).toContain(collectionId);
      expect(results["documents.search"]).toEqual(
        expect.arrayContaining([rootId, nestedId])
      );
    }
  });

  it("should include the owner for the owner and collaborators", async () => {
    for (const key of ["owner", "collaborator"] as const) {
      const res = await server.post("/api/documents.info", users[key], {
        body: { id: nestedId },
      });
      const body = await res.json();
      expect({ key, ownerId: body.data.ownerId }).toEqual({
        key,
        ownerId: users.owner.id,
      });
    }

    const res = await server.post("/api/documents.info", users.owner, {
      body: { id: publicDocumentId },
    });
    const body = await res.json();
    expect(body.data.ownerId).toBeNull();
  });
});
