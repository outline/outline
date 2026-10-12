import { CollectionPermission, TeamPreference, UserRole } from "@shared/types";
import { UserMembership, Collection } from "@server/models";
import {
  buildUser,
  buildTeam,
  buildCollection,
  buildAdmin,
  buildPersonalCollection,
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
    const reloaded = await Collection.findByPk(collection.id, {
      userId: user.id,
    });
    const abilities = serialize(user, reloaded);
    expect(abilities.readDocument).toEqual(false);
    expect(abilities.updateDocument).toEqual(false);
    expect(abilities.createDocument).toEqual(false);
    expect(abilities.share).toEqual(false);
    expect(abilities.read).toBeTruthy();
    expect(abilities.update).toBeTruthy();
    expect(abilities.archive).toBeTruthy();
  });

  it("should have correct permissions in view only collection", async () => {
    const team = await buildTeam();
    const user = await buildAdmin({
      teamId: team.id,
    });
    const collection = await buildCollection({
      teamId: team.id,
      permission: CollectionPermission.Read,
    });
    // reload to get membership
    const reloaded = await Collection.findByPk(collection.id, {
      userId: user.id,
    });
    const abilities = serialize(user, reloaded);
    expect(abilities.readDocument).toBeTruthy();
    expect(abilities.share).toBeTruthy();
    expect(abilities.read).toBeTruthy();
    expect(abilities.update).toBeTruthy();
    expect(abilities.archive).toBeTruthy();

    // admins should not be able to update documents when all users have view only access
    expect(abilities.updateDocument).toBeFalsy();
    expect(abilities.createDocument).toBeFalsy();
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
      const reloaded = await Collection.findByPk(collection.id, {
        userId: member.id,
      });
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
      const reloaded = await Collection.findByPk(collection.id, {
        userId: member.id,
      });
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
      const reloaded = await Collection.findByPk(collection.id, {
        userId: user.id,
      });
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
      const reloaded = await Collection.findByPk(collection.id, {
        userId: member.id,
      });
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
      const reloaded = await Collection.findByPk(collection.id, {
        userId: member.id,
      });
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
      const reloaded = await Collection.findByPk(collection.id, {
        userId: user.id,
      });
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
      const reloaded = await Collection.findByPk(collection.id, {
        userId: user.id,
      });
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
      const reloaded = await Collection.findByPk(collection.id, {
        userId: user.id,
      });
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
      const reloaded = await Collection.findByPk(collection.id, {
        userId: user.id,
      });
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
    const reloaded = await Collection.findByPk(collection.id, {
      userId: user.id,
    });
    const abilities = serialize(user, reloaded);
    expect(abilities.read).toBeTruthy();
    expect(abilities.readDocument).toBeTruthy();
    expect(abilities.createDocument).toEqual(false);
    expect(abilities.share).toEqual(false);
    expect(abilities.update).toEqual(false);
    expect(abilities.archive).toEqual(false);
  });
});

describe("manage templates", () => {
  describe("templateManagement is members (read_write)", () => {
    it("should allow member with read_write membership", async () => {
      const team = await buildTeam();
      const admin = await buildAdmin({ teamId: team.id });
      const member = await buildUser({ teamId: team.id });
      const collection = await buildCollection({
        teamId: team.id,
        permission: null,
        templateManagement: CollectionPermission.ReadWrite,
      });
      await collection.$add("user", member, {
        through: {
          permission: CollectionPermission.ReadWrite,
          createdById: admin.id,
        },
      });
      // reload to get membership
      const reloaded = await Collection.findByPk(collection.id, {
        userId: member.id,
      });
      const abilities = serialize(member, reloaded);
      expect(abilities.createTemplate).toBeTruthy();
      expect(abilities.manageTemplate).toBeTruthy();
    });

    it("should allow viewer with read_write membership", async () => {
      const team = await buildTeam();
      const admin = await buildAdmin({ teamId: team.id });
      const user = await buildUser({
        role: UserRole.Viewer,
        teamId: team.id,
      });
      const collection = await buildCollection({
        teamId: team.id,
        permission: null,
        templateManagement: CollectionPermission.ReadWrite,
      });
      await collection.$add("user", user, {
        through: {
          permission: CollectionPermission.ReadWrite,
          createdById: admin.id,
        },
      });
      // reload to get membership
      const reloaded = await Collection.findByPk(collection.id, {
        userId: user.id,
      });
      const abilities = serialize(user, reloaded);
      expect(abilities.createTemplate).toBeTruthy();
      expect(abilities.manageTemplate).toBeTruthy();
    });

    it("should disallow viewer without membership in an open collection", async () => {
      const team = await buildTeam();
      const user = await buildUser({
        role: UserRole.Viewer,
        teamId: team.id,
      });
      const collection = await buildCollection({
        teamId: team.id,
        permission: CollectionPermission.ReadWrite,
        templateManagement: CollectionPermission.ReadWrite,
      });
      const abilities = serialize(user, collection);
      expect(abilities.createTemplate).toEqual(false);
      expect(abilities.manageTemplate).toEqual(false);
    });

    it("should disallow guest with read_write membership", async () => {
      const team = await buildTeam();
      const admin = await buildAdmin({ teamId: team.id });
      const user = await buildUser({
        role: UserRole.Guest,
        teamId: team.id,
      });
      const collection = await buildCollection({
        teamId: team.id,
        permission: null,
        templateManagement: CollectionPermission.ReadWrite,
      });
      await collection.$add("user", user, {
        through: {
          permission: CollectionPermission.ReadWrite,
          createdById: admin.id,
        },
      });
      // reload to get membership
      const reloaded = await Collection.findByPk(collection.id, {
        userId: user.id,
      });
      const abilities = serialize(user, reloaded);
      expect(abilities.createTemplate).toEqual(false);
      expect(abilities.manageTemplate).toEqual(false);
    });
  });

  describe("templateManagement is managers (admin)", () => {
    it("should disallow member with read_write membership", async () => {
      const team = await buildTeam();
      const admin = await buildAdmin({ teamId: team.id });
      const member = await buildUser({ teamId: team.id });
      const collection = await buildCollection({
        teamId: team.id,
        permission: null,
        templateManagement: CollectionPermission.Admin,
      });
      await collection.$add("user", member, {
        through: {
          permission: CollectionPermission.ReadWrite,
          createdById: admin.id,
        },
      });
      // reload to get membership
      const reloaded = await Collection.findByPk(collection.id, {
        userId: member.id,
      });
      const abilities = serialize(member, reloaded);
      expect(abilities.createTemplate).toEqual(false);
      expect(abilities.manageTemplate).toEqual(false);
    });

    it("should allow member with admin membership", async () => {
      const team = await buildTeam();
      const admin = await buildAdmin({ teamId: team.id });
      const member = await buildUser({ teamId: team.id });
      const collection = await buildCollection({
        teamId: team.id,
        permission: null,
        templateManagement: CollectionPermission.Admin,
      });
      await collection.$add("user", member, {
        through: {
          permission: CollectionPermission.Admin,
          createdById: admin.id,
        },
      });
      // reload to get membership
      const reloaded = await Collection.findByPk(collection.id, {
        userId: member.id,
      });
      const abilities = serialize(member, reloaded);
      expect(abilities.createTemplate).toBeTruthy();
      expect(abilities.manageTemplate).toBeTruthy();
    });
  });
});

describe("personal collection", () => {
  const buildPersonal = async () => {
    const team = await buildTeam();
    team.setPreference(TeamPreference.PersonalDocs, true);
    await team.save();
    const owner = await buildUser({ teamId: team.id });
    const collection = await buildPersonalCollection(owner);
    return { team, owner, collection };
  };

  it("should allow the owner to use but not share or remove it", async () => {
    const { owner, collection } = await buildPersonal();
    const reloaded = await Collection.findByPk(collection.id, {
      userId: owner.id,
    });
    const abilities = serialize(owner, reloaded);
    expect(abilities.read).toBeTruthy();
    expect(abilities.readDocument).toBeTruthy();
    expect(abilities.createDocument).toBeTruthy();
    expect(abilities.updateDocument).toBeTruthy();
    expect(abilities.update).toBeTruthy();
    expect(abilities.export).toBeTruthy();
    expect(abilities.shareDocument).toBeTruthy();
    expect(abilities.share).toEqual(false);
    expect(abilities.star).toEqual(false);
    expect(abilities.unstar).toEqual(false);
    expect(abilities.createTemplate).toEqual(false);
    expect(abilities.manageTemplate).toEqual(false);
    expect(abilities.manageUsers).toEqual(false);
    expect(abilities.duplicate).toEqual(false);
    expect(abilities.archive).toEqual(false);
    expect(abilities.delete).toEqual(false);
    expect(abilities.move).toEqual(false);
  });

  it("should allow nothing for a workspace admin", async () => {
    const { team, collection } = await buildPersonal();
    const admin = await buildAdmin({ teamId: team.id });
    const reloaded = await Collection.findByPk(collection.id, {
      userId: admin.id,
    });
    const abilities = serialize(admin, reloaded);
    for (const [ability, value] of Object.entries(abilities)) {
      expect({ ability, value }).toEqual({ ability, value: false });
    }
  });

  it("should allow nothing for a workspace admin with a membership", async () => {
    const { team, owner, collection } = await buildPersonal();
    const admin = await buildAdmin({ teamId: team.id });
    await UserMembership.create({
      collectionId: collection.id,
      userId: admin.id,
      permission: CollectionPermission.Admin,
      createdById: owner.id,
    });
    const reloaded = await Collection.findByPk(collection.id, {
      userId: admin.id,
    });
    const abilities = serialize(admin, reloaded);
    for (const [ability, value] of Object.entries(abilities)) {
      expect({ ability, value }).toEqual({ ability, value: false });
    }
  });

  it("should allow nothing for another member", async () => {
    const { team, collection } = await buildPersonal();
    const member = await buildUser({ teamId: team.id });
    const reloaded = await Collection.findByPk(collection.id, {
      userId: member.id,
    });
    const abilities = serialize(member, reloaded);
    for (const [ability, value] of Object.entries(abilities)) {
      expect({ ability, value }).toEqual({ ability, value: false });
    }
  });

  it("should be read-only when personal documents are turned off", async () => {
    const { team, owner, collection } = await buildPersonal();
    team.setPreference(TeamPreference.PersonalDocs, false);
    await team.save();
    owner.team = team;
    const reloaded = await Collection.findByPk(collection.id, {
      userId: owner.id,
    });
    const abilities = serialize(owner, reloaded);
    expect(abilities.read).toBeTruthy();
    expect(abilities.readDocument).toBeTruthy();
    expect(abilities.createDocument).toEqual(false);
    expect(abilities.updateDocument).toEqual(false);
    expect(abilities.createTemplate).toEqual(false);
  });

  it("should become an ordinary private collection without an owner", async () => {
    const { team, collection } = await buildPersonal();
    const admin = await buildAdmin({ teamId: team.id });
    collection.ownerId = null;
    await collection.save();
    const reloaded = await Collection.findByPk(collection.id, {
      userId: admin.id,
    });
    const abilities = serialize(admin, reloaded);
    expect(abilities.read).toBeTruthy();
    expect(abilities.update).toBeTruthy();
    expect(abilities.manageUsers).toBeTruthy();
    expect(abilities.readDocument).toEqual(false);
  });

  it("should allow only members to create a personal collection", async () => {
    const team = await buildTeam();
    const member = await buildUser({ teamId: team.id });
    const viewer = await buildUser({ teamId: team.id, role: UserRole.Viewer });
    const guest = await buildUser({ teamId: team.id, role: UserRole.Guest });
    expect(serialize(member, team).createPersonalCollection).toBeTruthy();
    expect(serialize(viewer, team).createPersonalCollection).toEqual(false);
    expect(serialize(guest, team).createPersonalCollection).toEqual(false);

    team.setPreference(TeamPreference.PersonalDocs, false);
    await team.save();
    expect(serialize(member, team).createPersonalCollection).toEqual(false);
  });
});
