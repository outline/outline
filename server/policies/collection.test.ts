import { CollectionPermission, UserRole } from "@shared/types";
import { UserMembership, Collection } from "@server/models";
import {
  buildUser,
  buildTeam,
  buildCollection,
  buildAdmin,
} from "@server/test/factories";
import { serialize } from "./index";

describe("admin", () => {
  it("should allow team admin to archive collection", async () => {
    const team = await buildTeam();
    const admin = await buildAdmin({ teamId: team.id });
    const collection = await buildCollection({ teamId: team.id });
    // reload to get membership
    const reloaded = await Collection.scope({
      method: ["withMembership", admin.id],
    }).findByPk(collection.id);
    const abilities = serialize(admin, reloaded);
    expect(abilities.read).toBeTruthy();
    expect(abilities.update).toBeTruthy();
    expect(abilities.readDocument).toBeTruthy();
    expect(abilities.updateDocument).toBeTruthy();
    expect(abilities.createDocument).toBeTruthy();
    expect(abilities.archive).toBeTruthy();
  });

  it("should allow updating collection but not reading documents", async () => {
    const team = await buildTeam();
    const user = await buildAdmin({
      teamId: team.id,
    });
    const collection = await buildCollection({
      teamId: team.id,
      permission: null,
    });
    // reload to get membership
    const reloaded = await Collection.scope({
      method: ["withMembership", user.id],
    }).findByPk(collection.id);
    const abilities = serialize(user, reloaded);
    expect(abilities.readDocument).toEqual(false);
    expect(abilities.updateDocument).toEqual(false);
    expect(abilities.createDocument).toEqual(false);
    expect(abilities.share).toEqual(false);
    expect(abilities.read).toBeTruthy();
    expect(abilities.update).toBeTruthy();
    expect(abilities.archive).toBeTruthy();
  });

  it("should allow updating documents in view only collection", async () => {
    const team = await buildTeam();
    const user = await buildAdmin({
      teamId: team.id,
    });
    const collection = await buildCollection({
      teamId: team.id,
      permission: CollectionPermission.Read,
    });
    // reload to get membership
    const reloaded = await Collection.scope({
      method: ["withMembership", user.id],
    }).findByPk(collection.id);
    const abilities = serialize(user, reloaded);
    expect(abilities.readDocument).toBeTruthy();
    expect(abilities.updateDocument).toBeTruthy();
    expect(abilities.createDocument).toBeTruthy();
    expect(abilities.share).toBeTruthy();
    expect(abilities.read).toBeTruthy();
    expect(abilities.update).toBeTruthy();
    expect(abilities.archive).toBeTruthy();
  });
});

describe("member", () => {
  describe("admin permission", () => {
    it("should allow member to update collection", async () => {
      const team = await buildTeam();
      const admin = await buildAdmin({ teamId: team.id });
      const member = await buildUser({ teamId: team.id });
      const collection = await buildCollection({ teamId: team.id });
      await collection.$add("user", member, {
        through: {
          permission: CollectionPermission.Admin,
          createdById: admin.id,
        },
      });
      // reload to get membership
      const reloaded = await Collection.scope({
        method: ["withMembership", member.id],
      }).findByPk(collection.id);
      const abilities = serialize(member, reloaded);
      expect(abilities.read).toBeTruthy();
      expect(abilities.update).toBeTruthy();
      expect(abilities.readDocument).toBeTruthy();
      expect(abilities.updateDocument).toBeTruthy();
      expect(abilities.createDocument).toBeTruthy();
      expect(abilities.share).toBeTruthy();
      expect(abilities.update).toBeTruthy();
      expect(abilities.archive).toBeTruthy();
    });
  });

  describe("read_write permission", () => {
    it("should disallow member to update collection", async () => {
      const team = await buildTeam();
      const admin = await buildAdmin({ teamId: team.id });
      const member = await buildUser({ teamId: team.id });

      const collection = await buildCollection({ teamId: team.id });
      await collection.$add("user", member, {
        through: {
          permission: CollectionPermission.ReadWrite,
          createdById: admin.id,
        },
      });
      // reload to get membership
      const reloaded = await Collection.scope({
        method: ["withMembership", member.id],
      }).findByPk(collection.id);
      const abilities = serialize(member, reloaded);
      expect(abilities.read).toBeTruthy();
      expect(abilities.update).toBe(false);
      expect(abilities.readDocument).toBeTruthy();
      expect(abilities.updateDocument).toBeTruthy();
      expect(abilities.createDocument).toBeTruthy();
      expect(abilities.archive).toBe(false);
    });

    it("should allow read write documents for team member", async () => {
      const team = await buildTeam();
      const user = await buildUser({
        teamId: team.id,
      });
      const collection = await buildCollection({
        teamId: team.id,
        permission: CollectionPermission.ReadWrite,
      });
      const abilities = serialize(user, collection);
      expect(abilities.read).toBeTruthy();
      expect(abilities.readDocument).toBeTruthy();
      expect(abilities.share).toBeTruthy();
      expect(abilities.update).toEqual(false);
      expect(abilities.archive).toEqual(false);
    });

    it("should override read membership permission", async () => {
      const team = await buildTeam();
      const user = await buildUser({
        teamId: team.id,
      });
      const collection = await buildCollection({
        teamId: team.id,
        permission: CollectionPermission.ReadWrite,
      });
      await UserMembership.create({
        createdById: user.id,
        collectionId: collection.id,
        userId: user.id,
        permission: CollectionPermission.Read,
      });
      // reload to get membership
      const reloaded = await Collection.scope({
        method: ["withMembership", user.id],
      }).findByPk(collection.id);
      const abilities = serialize(user, reloaded);
      expect(abilities.read).toBeTruthy();
      expect(abilities.readDocument).toBeTruthy();
      expect(abilities.share).toBeTruthy();
      expect(abilities.update).toEqual(false);
      expect(abilities.archive).toEqual(false);
    });
  });

  describe("read permission", () => {
    it("should disallow member to archive collection", async () => {
      const team = await buildTeam();
      const admin = await buildAdmin({ teamId: team.id });
      const member = await buildUser({ teamId: team.id });
      const collection = await buildCollection({
        teamId: team.id,
        permission: CollectionPermission.Read,
      });
      await collection.$add("user", member, {
        through: {
          permission: CollectionPermission.Read,
          createdById: admin.id,
        },
      });
      // reload to get membership
      const reloaded = await Collection.scope({
        method: ["withMembership", member.id],
      }).findByPk(collection.id);
      const abilities = serialize(member, reloaded);
      expect(abilities.read).toBeTruthy();
      expect(abilities.update).not.toBeTruthy();
      expect(abilities.readDocument).toBeTruthy();
      expect(abilities.updateDocument).toBe(false);
      expect(abilities.createDocument).toBe(false);
      expect(abilities.archive).toBe(false);
    });

    it("should allow read permissions for team member", async () => {
      const team = await buildTeam();
      const user = await buildUser({
        teamId: team.id,
      });
      const collection = await buildCollection({
        teamId: team.id,
        permission: CollectionPermission.Read,
      });
      const abilities = serialize(user, collection);
      expect(abilities.read).toBeTruthy();
      expect(abilities.update).toEqual(false);
      expect(abilities.share).toEqual(false);
      expect(abilities.archive).toEqual(false);
    });

    it("should allow override with read_write membership permission", async () => {
      const team = await buildTeam();
      const admin = await buildAdmin({ teamId: team.id });
      const member = await buildUser({ teamId: team.id });
      const collection = await buildCollection({
        teamId: team.id,
        permission: CollectionPermission.Read,
      });
      await collection.$add("user", member, {
        through: {
          permission: CollectionPermission.ReadWrite,
          createdById: admin.id,
        },
      });
      // reload to get membership
      const reloaded = await Collection.scope({
        method: ["withMembership", member.id],
      }).findByPk(collection.id);
      const abilities = serialize(member, reloaded);
      expect(abilities.read).toBeTruthy();
      expect(abilities.readDocument).toBeTruthy();
      expect(abilities.share).toBeTruthy();
      expect(abilities.update).toEqual(false);
      expect(abilities.archive).toEqual(false);
    });
  });

  describe("no permission", () => {
    it("should allow no permissions for team member", async () => {
      const team = await buildTeam();
      const user = await buildUser({
        teamId: team.id,
      });
      const collection = await buildCollection({
        teamId: team.id,
        permission: null,
      });
      const abilities = serialize(user, collection);
      expect(abilities.read).toEqual(false);
      expect(abilities.readDocument).toEqual(false);
      expect(abilities.createDocument).toEqual(false);
      expect(abilities.share).toEqual(false);
      expect(abilities.update).toEqual(false);
      expect(abilities.archive).toEqual(false);
    });

    it("should allow override with team member membership permission", async () => {
      const team = await buildTeam();
      const user = await buildUser({
        teamId: team.id,
      });
      const collection = await buildCollection({
        teamId: team.id,
        permission: null,
      });
      await UserMembership.create({
        createdById: user.id,
        collectionId: collection.id,
        userId: user.id,
        permission: CollectionPermission.ReadWrite,
      });
      // reload to get membership
      const reloaded = await Collection.scope({
        method: ["withMembership", user.id],
      }).findByPk(collection.id);
      const abilities = serialize(user, reloaded);
      expect(abilities.read).toBeTruthy();
      expect(abilities.readDocument).toBeTruthy();
      expect(abilities.createDocument).toBeTruthy();
      expect(abilities.share).toBeTruthy();
      expect(abilities.update).toEqual(false);
      expect(abilities.archive).toEqual(false);
    });
  });
});

describe("viewer", () => {
  describe("read_write permission", () => {
    it("should allow read permissions for viewer", async () => {
      const team = await buildTeam();
      const user = await buildUser({
        role: UserRole.Viewer,
        teamId: team.id,
      });
      const collection = await buildCollection({
        teamId: team.id,
        permission: CollectionPermission.ReadWrite,
      });
      const abilities = serialize(user, collection);
      expect(abilities.read).toBeTruthy();
      expect(abilities.readDocument).toBeTruthy();
      expect(abilities.createDocument).toEqual(false);
      expect(abilities.update).toEqual(false);
      expect(abilities.share).toEqual(false);
      expect(abilities.archive).toEqual(false);
    });

    it("should override read membership permission", async () => {
      const team = await buildTeam();
      const user = await buildUser({
        role: UserRole.Viewer,
        teamId: team.id,
      });
      const collection = await buildCollection({
        teamId: team.id,
        permission: CollectionPermission.ReadWrite,
      });
      await UserMembership.create({
        createdById: user.id,
        collectionId: collection.id,
        userId: user.id,
        permission: CollectionPermission.ReadWrite,
      });
      // reload to get membership
      const reloaded = await Collection.scope({
        method: ["withMembership", user.id],
      }).findByPk(collection.id);
      const abilities = serialize(user, reloaded);
      expect(abilities.read).toBeTruthy();
      expect(abilities.readDocument).toBeTruthy();
      expect(abilities.share).toBeTruthy();
      expect(abilities.update).toEqual(false);
      expect(abilities.archive).toEqual(false);
    });
  });

  describe("read permission", () => {
    it("should allow override with read_write membership permission", async () => {
      const team = await buildTeam();
      const user = await buildUser({
        role: UserRole.Viewer,
        teamId: team.id,
      });
      const collection = await buildCollection({
        teamId: team.id,
        permission: CollectionPermission.Read,
      });
      await UserMembership.create({
        createdById: user.id,
        collectionId: collection.id,
        userId: user.id,
        permission: CollectionPermission.ReadWrite,
      });
      // reload to get membership
      const reloaded = await Collection.scope({
        method: ["withMembership", user.id],
      }).findByPk(collection.id);
      const abilities = serialize(user, reloaded);
      expect(abilities.read).toBeTruthy();
      expect(abilities.readDocument).toBeTruthy();
      expect(abilities.createDocument).toBeTruthy();
      expect(abilities.share).toBeTruthy();
      expect(abilities.update).toEqual(false);
      expect(abilities.archive).toEqual(false);
    });
  });

  describe("no permission", () => {
    it("should allow no permissions for viewer", async () => {
      const team = await buildTeam();
      const user = await buildUser({
        role: UserRole.Viewer,
        teamId: team.id,
      });
      const collection = await buildCollection({
        teamId: team.id,
        permission: null,
      });
      const abilities = serialize(user, collection);
      expect(abilities.read).toEqual(false);
      expect(abilities.update).toEqual(false);
      expect(abilities.share).toEqual(false);
      expect(abilities.archive).toEqual(false);
    });

    it("should allow override with team member membership permission", async () => {
      const team = await buildTeam();
      const user = await buildUser({
        role: UserRole.Viewer,
        teamId: team.id,
      });
      const collection = await buildCollection({
        teamId: team.id,
        permission: null,
      });
      await UserMembership.create({
        createdById: user.id,
        collectionId: collection.id,
        userId: user.id,
        permission: CollectionPermission.ReadWrite,
      });
      // reload to get membership
      const reloaded = await Collection.scope({
        method: ["withMembership", user.id],
      }).findByPk(collection.id);
      const abilities = serialize(user, reloaded);
      expect(abilities.read).toBeTruthy();
      expect(abilities.readDocument).toBeTruthy();
      expect(abilities.createDocument).toBeTruthy();
      expect(abilities.share).toBeTruthy();
      expect(abilities.update).toEqual(false);
      expect(abilities.archive).toEqual(false);
    });
  });
});

describe("guest", () => {
  describe("read_write permission", () => {
    it("should allow no permissions for guest", async () => {
      const team = await buildTeam();
      const user = await buildUser({
        role: UserRole.Guest,
        teamId: team.id,
      });
      const collection = await buildCollection({
        teamId: team.id,
        permission: CollectionPermission.ReadWrite,
      });
      const abilities = serialize(user, collection);
      expect(abilities.read).toEqual(false);
      expect(abilities.readDocument).toEqual(false);
      expect(abilities.createDocument).toEqual(false);
      expect(abilities.update).toEqual(false);
      expect(abilities.share).toEqual(false);
      expect(abilities.archive).toEqual(false);
    });
  });

  it("should allow override with team member membership permission", async () => {
    const team = await buildTeam();
    const user = await buildUser({
      role: UserRole.Guest,
      teamId: team.id,
    });
    const collection = await buildCollection({
      teamId: team.id,
      permission: null,
    });
    await UserMembership.create({
      createdById: user.id,
      collectionId: collection.id,
      userId: user.id,
      permission: CollectionPermission.Read,
    });
    // reload to get membership
    const reloaded = await Collection.scope({
      method: ["withMembership", user.id],
    }).findByPk(collection.id);
    const abilities = serialize(user, reloaded);
    expect(abilities.read).toBeTruthy();
    expect(abilities.readDocument).toBeTruthy();
    expect(abilities.createDocument).toEqual(false);
    expect(abilities.share).toEqual(false);
    expect(abilities.update).toEqual(false);
    expect(abilities.archive).toEqual(false);
  });
});
