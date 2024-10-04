import {
  CollectionPermission,
  DocumentPermission,
  UserRole,
} from "@shared/types";
import { Document, UserMembership } from "@server/models";
import {
  buildUser,
  buildTeam,
  buildDocument,
  buildDraftDocument,
  buildCollection,
} from "@server/test/factories";
import { serialize } from "./index";

describe("read_write collection", () => {
  it("should allow read write permissions for member", async () => {
    const team = await buildTeam();
    const user = await buildUser({ teamId: team.id });
    const collection = await buildCollection({
      teamId: team.id,
      permission: CollectionPermission.ReadWrite,
    });
    const doc = await buildDocument({
      teamId: team.id,
      collectionId: collection.id,
    });
    // reload to get membership
    const document = await Document.findByPk(doc.id, { userId: user.id });
    const abilities = serialize(user, document);
    expect(abilities.read).toBeTruthy();
    expect(abilities.download).toBeTruthy();
    expect(abilities.update).toBeTruthy();
    expect(abilities.createChildDocument).toBeTruthy();
    expect(abilities.manageUsers).toBeTruthy();
    expect(abilities.archive).toBeTruthy();
    expect(abilities.delete).toBeTruthy();
    expect(abilities.share).toBeTruthy();
    expect(abilities.move).toBeTruthy();
    expect(abilities.comment).toBeTruthy();
  });

  it("should allow read permissions for viewer", async () => {
    const team = await buildTeam();
    const user = await buildUser({
      teamId: team.id,
      role: UserRole.Viewer,
    });
    const collection = await buildCollection({
      teamId: team.id,
      permission: CollectionPermission.ReadWrite,
    });
    const doc = await buildDocument({
      teamId: team.id,
      collectionId: collection.id,
    });
    // reload to get membership
    const document = await Document.findByPk(doc.id, { userId: user.id });
    const abilities = serialize(user, document);
    expect(abilities.read).toBeTruthy();
    expect(abilities.download).toBeTruthy();
    expect(abilities.update).toEqual(false);
    expect(abilities.createChildDocument).toEqual(false);
    expect(abilities.manageUsers).toEqual(false);
    expect(abilities.archive).toEqual(false);
    expect(abilities.delete).toEqual(false);
    expect(abilities.share).toEqual(false);
    expect(abilities.move).toEqual(false);
    expect(abilities.subscribe).toBeTruthy();
    expect(abilities.unsubscribe).toBeTruthy();
    expect(abilities.comment).toBeTruthy();
  });

  it("should allow no permissions for guest", async () => {
    const team = await buildTeam();
    const user = await buildUser({
      teamId: team.id,
      role: UserRole.Guest,
    });
    const collection = await buildCollection({
      teamId: team.id,
      permission: CollectionPermission.ReadWrite,
    });
    const doc = await buildDocument({
      teamId: team.id,
      collectionId: collection.id,
    });
    // reload to get membership
    const document = await Document.findByPk(doc.id, { userId: user.id });
    const abilities = serialize(user, document);
    expect(abilities.read).toEqual(false);
    expect(abilities.download).toEqual(false);
    expect(abilities.update).toEqual(false);
    expect(abilities.createChildDocument).toEqual(false);
    expect(abilities.manageUsers).toEqual(false);
    expect(abilities.archive).toEqual(false);
    expect(abilities.delete).toEqual(false);
    expect(abilities.share).toEqual(false);
    expect(abilities.move).toEqual(false);
    expect(abilities.subscribe).toEqual(false);
    expect(abilities.unsubscribe).toEqual(false);
    expect(abilities.comment).toEqual(false);
  });
});

describe("read collection", () => {
  it("should allow read permissions for team member", async () => {
    const team = await buildTeam();
    const user = await buildUser({ teamId: team.id });
    const collection = await buildCollection({
      teamId: team.id,
      permission: CollectionPermission.Read,
    });
    const doc = await buildDocument({
      teamId: team.id,
      collectionId: collection.id,
    });
    // reload to get membership
    const document = await Document.findByPk(doc.id, { userId: user.id });
    const abilities = serialize(user, document);
    expect(abilities.read).toBeTruthy();
    expect(abilities.download).toBeTruthy();
    expect(abilities.update).toEqual(false);
    expect(abilities.createChildDocument).toEqual(false);
    expect(abilities.archive).toEqual(false);
    expect(abilities.delete).toEqual(false);
    expect(abilities.share).toEqual(false);
    expect(abilities.move).toEqual(false);
    expect(abilities.subscribe).toBeTruthy();
    expect(abilities.unsubscribe).toBeTruthy();
    expect(abilities.comment).toBeTruthy();
  });

  it("should allow no permissions for guest", async () => {
    const team = await buildTeam();
    const user = await buildUser({
      teamId: team.id,
      role: UserRole.Guest,
    });
    const collection = await buildCollection({
      teamId: team.id,
      permission: CollectionPermission.Read,
    });
    const doc = await buildDocument({
      teamId: team.id,
      collectionId: collection.id,
    });
    // reload to get membership
    const document = await Document.findByPk(doc.id, { userId: user.id });
    const abilities = serialize(user, document);
    expect(abilities.read).toEqual(false);
    expect(abilities.download).toEqual(false);
    expect(abilities.update).toEqual(false);
    expect(abilities.createChildDocument).toEqual(false);
    expect(abilities.manageUsers).toEqual(false);
    expect(abilities.archive).toEqual(false);
    expect(abilities.delete).toEqual(false);
    expect(abilities.share).toEqual(false);
    expect(abilities.move).toEqual(false);
    expect(abilities.subscribe).toEqual(false);
    expect(abilities.unsubscribe).toEqual(false);
    expect(abilities.comment).toEqual(false);
  });
});

describe("private collection", () => {
  it("should allow no permissions for team member", async () => {
    const team = await buildTeam();
    const user = await buildUser({ teamId: team.id });
    const collection = await buildCollection({
      teamId: team.id,
      permission: null,
    });
    const document = await buildDocument({
      teamId: team.id,
      collectionId: collection.id,
    });
    const abilities = serialize(user, document);
    expect(abilities.read).toEqual(false);
    expect(abilities.download).toEqual(false);
    expect(abilities.update).toEqual(false);
    expect(abilities.createChildDocument).toEqual(false);
    expect(abilities.manageUsers).toEqual(false);
    expect(abilities.archive).toEqual(false);
    expect(abilities.delete).toEqual(false);
    expect(abilities.share).toEqual(false);
    expect(abilities.move).toEqual(false);
    expect(abilities.subscribe).toEqual(false);
    expect(abilities.unsubscribe).toEqual(false);
    expect(abilities.comment).toEqual(false);
  });

  it("should allow no permissions for guest", async () => {
    const team = await buildTeam();
    const user = await buildUser({
      teamId: team.id,
      role: UserRole.Guest,
    });
    const collection = await buildCollection({
      teamId: team.id,
      permission: null,
    });
    const document = await buildDocument({
      teamId: team.id,
      collectionId: collection.id,
    });
    const abilities = serialize(user, document);
    expect(abilities.read).toEqual(false);
    expect(abilities.download).toEqual(false);
    expect(abilities.update).toEqual(false);
    expect(abilities.createChildDocument).toEqual(false);
    expect(abilities.manageUsers).toEqual(false);
    expect(abilities.archive).toEqual(false);
    expect(abilities.delete).toEqual(false);
    expect(abilities.share).toEqual(false);
    expect(abilities.move).toEqual(false);
    expect(abilities.subscribe).toEqual(false);
    expect(abilities.unsubscribe).toEqual(false);
    expect(abilities.comment).toEqual(false);
  });
});

describe("no collection", () => {
  it("should allow no permissions for team member", async () => {
    const team = await buildTeam();
    const user = await buildUser({ teamId: team.id });
    const document = await buildDraftDocument({
      teamId: team.id,
    });
    const abilities = serialize(user, document);
    expect(abilities.read).toEqual(false);
    expect(abilities.download).toEqual(false);
    expect(abilities.update).toEqual(false);
    expect(abilities.createChildDocument).toEqual(false);
    expect(abilities.archive).toEqual(false);
    expect(abilities.delete).toEqual(false);
    expect(abilities.share).toEqual(false);
    expect(abilities.move).toEqual(false);
    expect(abilities.subscribe).toEqual(false);
    expect(abilities.unsubscribe).toEqual(false);
    expect(abilities.comment).toEqual(false);
  });

  it("should allow no permissions for guest", async () => {
    const team = await buildTeam();
    const user = await buildUser({
      teamId: team.id,
      role: UserRole.Guest,
    });
    const document = await buildDraftDocument({
      teamId: team.id,
    });
    const abilities = serialize(user, document);
    expect(abilities.read).toEqual(false);
    expect(abilities.download).toEqual(false);
    expect(abilities.update).toEqual(false);
    expect(abilities.createChildDocument).toEqual(false);
    expect(abilities.archive).toEqual(false);
    expect(abilities.delete).toEqual(false);
    expect(abilities.share).toEqual(false);
    expect(abilities.move).toEqual(false);
    expect(abilities.subscribe).toEqual(false);
    expect(abilities.unsubscribe).toEqual(false);
    expect(abilities.comment).toEqual(false);
  });

  it("should allow edit permissions for creator", async () => {
    const team = await buildTeam();
    const user = await buildUser({ teamId: team.id });
    const doc = await buildDraftDocument({
      teamId: team.id,
      userId: user.id,
    });
    // reload to get membership
    const document = await Document.findByPk(doc.id, { userId: user.id });
    const abilities = serialize(user, document);
    expect(abilities.read).toBeTruthy();
    expect(abilities.download).toBeTruthy();
    expect(abilities.update).toBeTruthy();
    expect(abilities.createChildDocument).toEqual(false);
    expect(abilities.archive).toEqual(false);
    expect(abilities.delete).toBeTruthy();
    expect(abilities.share).toBeTruthy();
    expect(abilities.move).toBeTruthy();
    expect(abilities.subscribe).toBeTruthy();
    expect(abilities.unsubscribe).toBeTruthy();
    expect(abilities.comment).toBeTruthy();
  });
});

describe("archived document", () => {
  it("should have correct permissions", async () => {
    const team = await buildTeam();
    const user = await buildUser({ teamId: team.id });
    const doc = await buildDocument({
      teamId: team.id,
      userId: user.id,
      archivedAt: new Date(),
    });
    // reload to get membership
    const document = await Document.findByPk(doc.id, { userId: user.id });
    const abilities = serialize(user, document);
    expect(abilities.read).toBeTruthy();
    expect(abilities.download).toBeTruthy();
    expect(abilities.delete).toBeTruthy();
    expect(abilities.unsubscribe).toBeTruthy();
    expect(abilities.unarchive).toBeTruthy();
    expect(abilities.update).toEqual(false);
    expect(abilities.createChildDocument).toEqual(false);
    expect(abilities.manageUsers).toEqual(false);
    expect(abilities.archive).toEqual(false);
    expect(abilities.share).toEqual(false);
    expect(abilities.move).toEqual(false);
    expect(abilities.comment).toEqual(false);
  });
});

describe("read document", () => {
  for (const role of Object.values(UserRole)) {
    it(`should allow read permissions for ${role}`, async () => {
      const team = await buildTeam();
      const user = await buildUser({ teamId: team.id });
      const collection = await buildCollection({
        teamId: team.id,
        permission: null,
      });
      const doc = await buildDocument({
        teamId: team.id,
        collectionId: collection.id,
      });
      await UserMembership.create({
        userId: user.id,
        documentId: doc.id,
        permission: DocumentPermission.Read,
        createdById: user.id,
      });

      // reload to get membership
      const document = await Document.findByPk(doc.id, { userId: user.id });
      const abilities = serialize(user, document);
      expect(abilities.read).toBeTruthy();
      expect(abilities.download).toBeTruthy();
      expect(abilities.subscribe).toBeTruthy();
      expect(abilities.unsubscribe).toBeTruthy();
      expect(abilities.comment).toBeTruthy();
      expect(abilities.update).toEqual(false);
      expect(abilities.createChildDocument).toEqual(false);
      expect(abilities.manageUsers).toEqual(false);
      expect(abilities.archive).toEqual(false);
      expect(abilities.delete).toEqual(false);
      expect(abilities.share).toEqual(false);
      expect(abilities.move).toEqual(false);
    });
  }
});

describe("read_write document", () => {
  for (const role of Object.values(UserRole)) {
    it(`should allow write permissions for ${role}`, async () => {
      const team = await buildTeam();
      const user = await buildUser({ teamId: team.id, role });
      const collection = await buildCollection({
        teamId: team.id,
        permission: null,
      });
      const doc = await buildDocument({
        teamId: team.id,
        collectionId: collection.id,
      });
      await UserMembership.create({
        userId: user.id,
        documentId: doc.id,
        permission: DocumentPermission.ReadWrite,
        createdById: user.id,
      });

      // reload to get membership
      const document = await Document.findByPk(doc.id, { userId: user.id });
      const abilities = serialize(user, document);
      expect(abilities.read).toBeTruthy();
      expect(abilities.download).toBeTruthy();
      expect(abilities.update).toBeTruthy();
      expect(abilities.delete).toBeTruthy();
      expect(abilities.subscribe).toBeTruthy();
      expect(abilities.unsubscribe).toBeTruthy();
      expect(abilities.comment).toBeTruthy();
      expect(abilities.createChildDocument).toBeTruthy();
      expect(abilities.manageUsers).toEqual(false);
      expect(abilities.archive).toEqual(false);
      expect(abilities.share).toEqual(false);
      expect(abilities.move).toEqual(false);
    });
  }
});

describe("manage document", () => {
  for (const role of Object.values(UserRole)) {
    it(`should allow write permissions, user management, and sub-document creation for ${role}`, async () => {
      const team = await buildTeam();
      const user = await buildUser({
        teamId: team.id,
        role,
      });
      const collection = await buildCollection({
        teamId: team.id,
        permission: null,
      });
      const doc = await buildDocument({
        teamId: team.id,
        collectionId: collection.id,
      });
      await UserMembership.create({
        userId: user.id,
        documentId: doc.id,
        permission: DocumentPermission.Admin,
        createdById: user.id,
      });

      // reload to get membership
      const document = await Document.findByPk(doc.id, { userId: user.id });
      const abilities = serialize(user, document);
      expect(abilities.read).toBeTruthy();
      expect(abilities.download).toBeTruthy();
      expect(abilities.update).toBeTruthy();
      expect(abilities.delete).toBeTruthy();
      expect(abilities.subscribe).toBeTruthy();
      expect(abilities.unsubscribe).toBeTruthy();
      expect(abilities.comment).toBeTruthy();
      expect(abilities.createChildDocument).toBeTruthy();
      expect(abilities.manageUsers).toBeTruthy();
      expect(abilities.archive).toBeTruthy();
      expect(abilities.move).toEqual(false);
      expect(abilities.share).toEqual(false);
    });
  }
});
