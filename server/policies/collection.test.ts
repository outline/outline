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
    expect(abilities.read).toEqual(true);
    expect(abilities.update).toEqual(true);
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
    const abilities = serialize(user, collection);
    expect(abilities.readDocument).toEqual(true);
    expect(abilities.updateDocument).toEqual(true);
    expect(abilities.createDocument).toEqual(true);
    expect(abilities.share).toEqual(true);
    expect(abilities.read).toEqual(true);
    expect(abilities.update).toEqual(true);
  });
});

describe("member", () => {
  describe("admin permission", () => {
    it("should allow updating collection", async () => {
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
        permission: CollectionPermission.Admin,
      });
      // reload to get membership
      const reloaded = await Collection.scope({
        method: ["withMembership", user.id],
      }).findByPk(collection.id);
      const abilities = serialize(user, reloaded);
      expect(abilities.read).toEqual(true);
      expect(abilities.readDocument).toEqual(true);
      // expect(abilities.createDocument).toEqual(true);
      // expect(abilities.share).toEqual(true);
      expect(abilities.update).toEqual(true);
    });
  });

  describe("read_write permission", () => {
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
      expect(abilities.read).toEqual(true);
      expect(abilities.readDocument).toEqual(true);
      expect(abilities.share).toEqual(true);
      expect(abilities.update).toEqual(false);
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
      expect(abilities.read).toEqual(true);
      expect(abilities.readDocument).toEqual(true);
      expect(abilities.share).toEqual(true);
      expect(abilities.update).toEqual(false);
    });
  });

  describe("read permission", () => {
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
      expect(abilities.read).toEqual(true);
      expect(abilities.update).toEqual(false);
      expect(abilities.share).toEqual(false);
    });

    it("should allow override with read_write membership permission", async () => {
      const team = await buildTeam();
      const user = await buildUser({
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
      expect(abilities.read).toEqual(true);
      expect(abilities.readDocument).toEqual(true);
      expect(abilities.share).toEqual(true);
      expect(abilities.update).toEqual(false);
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
      expect(abilities.read).toEqual(true);
      expect(abilities.readDocument).toEqual(true);
      expect(abilities.createDocument).toEqual(true);
      expect(abilities.share).toEqual(true);
      expect(abilities.update).toEqual(false);
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
      expect(abilities.read).toEqual(true);
      expect(abilities.readDocument).toEqual(true);
      expect(abilities.createDocument).toEqual(false);
      expect(abilities.update).toEqual(false);
      expect(abilities.share).toEqual(false);
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
      expect(abilities.read).toEqual(true);
      expect(abilities.readDocument).toEqual(true);
      expect(abilities.share).toEqual(true);
      expect(abilities.update).toEqual(false);
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
      expect(abilities.read).toEqual(true);
      expect(abilities.readDocument).toEqual(true);
      expect(abilities.createDocument).toEqual(true);
      expect(abilities.share).toEqual(true);
      expect(abilities.update).toEqual(false);
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
      expect(abilities.read).toEqual(true);
      expect(abilities.readDocument).toEqual(true);
      expect(abilities.createDocument).toEqual(true);
      expect(abilities.share).toEqual(true);
      expect(abilities.update).toEqual(false);
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
    expect(abilities.read).toEqual(true);
    expect(abilities.readDocument).toEqual(true);
    expect(abilities.createDocument).toEqual(false);
    expect(abilities.share).toEqual(false);
    expect(abilities.update).toEqual(false);
  });
});
