import { CollectionPermission, DocumentPermission } from "@shared/types";
import { GroupMembership, UserMembership } from "@server/models";
import {
  buildCollection,
  buildDocument,
  buildGroup,
  buildGroupUser,
  buildUser,
} from "@server/test/factories";
import { getDocumentPermission, isElevatedPermission } from "./permissions";

describe("permissions", () => {
  describe("isElevatedPermission", () => {
    it("should return false when user has higher permission through collection", async () => {
      const user = await buildUser();
      const collection = await buildCollection({
        teamId: user.teamId,
        permission: null,
      });
      const document = await buildDocument({
        collectionId: collection.id,
        teamId: user.teamId,
      });
      await UserMembership.create({
        createdById: user.id,
        collectionId: collection.id,
        userId: user.id,
        permission: CollectionPermission.ReadWrite,
      });

      const isElevated = await isElevatedPermission({
        userId: user.id,
        documentId: document.id,
        permission: DocumentPermission.Read,
      });

      expect(isElevated).toBe(false);
    });

    it("should return false when user has higher permission through document", async () => {
      const user = await buildUser();
      const collection = await buildCollection({
        teamId: user.teamId,
        permission: null,
      });
      const document = await buildDocument({
        collectionId: collection.id,
        teamId: user.teamId,
      });
      const group = await buildGroup();
      await Promise.all([
        await buildGroupUser({
          groupId: group.id,
          userId: user.id,
          teamId: user.teamId,
        }),
        await UserMembership.create({
          createdById: user.id,
          documentId: document.id,
          userId: user.id,
          permission: DocumentPermission.Read,
        }),
        await GroupMembership.create({
          createdById: user.id,
          documentId: document.id,
          groupId: group.id,
          permission: DocumentPermission.ReadWrite,
        }),
      ]);

      const isElevated = await isElevatedPermission({
        userId: user.id,
        documentId: document.id,
        permission: DocumentPermission.Read,
      });

      expect(isElevated).toBe(false);
    });

    it("should return false when user has the same permission", async () => {
      const user = await buildUser();
      const collection = await buildCollection({
        teamId: user.teamId,
        permission: null,
      });
      const document = await buildDocument({
        collectionId: collection.id,
        teamId: user.teamId,
      });
      const group = await buildGroup();
      await Promise.all([
        await buildGroupUser({
          groupId: group.id,
          userId: user.id,
          teamId: user.teamId,
        }),
        await UserMembership.create({
          createdById: user.id,
          documentId: document.id,
          userId: user.id,
          permission: DocumentPermission.Read,
        }),
        await GroupMembership.create({
          createdById: user.id,
          documentId: document.id,
          groupId: group.id,
          permission: DocumentPermission.ReadWrite,
        }),
      ]);

      const isElevated = await isElevatedPermission({
        userId: user.id,
        documentId: document.id,
        permission: DocumentPermission.ReadWrite,
      });

      expect(isElevated).toBe(false);
    });

    it("should return true when user has lower permission", async () => {
      const user = await buildUser();
      const collection = await buildCollection({
        teamId: user.teamId,
        permission: null,
      });
      const document = await buildDocument({
        collectionId: collection.id,
        teamId: user.teamId,
      });
      const group = await buildGroup();
      await Promise.all([
        await buildGroupUser({
          groupId: group.id,
          userId: user.id,
          teamId: user.teamId,
        }),
        await UserMembership.create({
          createdById: user.id,
          documentId: document.id,
          userId: user.id,
          permission: DocumentPermission.Read,
        }),
        await GroupMembership.create({
          createdById: user.id,
          documentId: document.id,
          groupId: group.id,
          permission: DocumentPermission.ReadWrite,
        }),
      ]);

      const isElevated = await isElevatedPermission({
        userId: user.id,
        documentId: document.id,
        permission: DocumentPermission.Admin,
      });

      expect(isElevated).toBe(true);
    });

    it("should return true when user does not have access", async () => {
      const user = await buildUser();
      const collection = await buildCollection({
        teamId: user.teamId,
        permission: null,
      });
      const document = await buildDocument({
        collectionId: collection.id,
        teamId: user.teamId,
      });

      const isElevated = await isElevatedPermission({
        userId: user.id,
        documentId: document.id,
        permission: DocumentPermission.Admin,
      });

      expect(isElevated).toBe(true);
    });
  });

  describe("getDocumentPermission", () => {
    it("should return the highest provided permission through collection", async () => {
      const user = await buildUser();
      const collection = await buildCollection({
        teamId: user.teamId,
        permission: null,
      });
      const document = await buildDocument({
        collectionId: collection.id,
        teamId: user.teamId,
      });
      await UserMembership.create({
        createdById: user.id,
        collectionId: collection.id,
        userId: user.id,
        permission: CollectionPermission.ReadWrite,
      });

      const permission = await getDocumentPermission({
        userId: user.id,
        documentId: document.id,
      });

      expect(permission).toEqual(DocumentPermission.ReadWrite);
    });

    it("should return the highest provided permission through document", async () => {
      const user = await buildUser();
      const collection = await buildCollection({
        teamId: user.teamId,
        permission: null,
      });
      const document = await buildDocument({
        collectionId: collection.id,
        teamId: user.teamId,
      });
      const group = await buildGroup();
      await Promise.all([
        await buildGroupUser({
          groupId: group.id,
          userId: user.id,
          teamId: user.teamId,
        }),
        await UserMembership.create({
          createdById: user.id,
          documentId: document.id,
          userId: user.id,
          permission: DocumentPermission.Read,
        }),
        await GroupMembership.create({
          createdById: user.id,
          documentId: document.id,
          groupId: group.id,
          permission: DocumentPermission.ReadWrite,
        }),
      ]);

      const permission = await getDocumentPermission({
        userId: user.id,
        documentId: document.id,
      });

      expect(permission).toEqual(DocumentPermission.ReadWrite);
    });

    it("should return the highest provided permission with skipped membership", async () => {
      const user = await buildUser();
      const collection = await buildCollection({
        teamId: user.teamId,
        permission: null,
      });
      const document = await buildDocument({
        collectionId: collection.id,
        teamId: user.teamId,
      });
      const group = await buildGroup();
      const [, , groupMembership] = await Promise.all([
        await buildGroupUser({
          groupId: group.id,
          userId: user.id,
          teamId: user.teamId,
        }),
        await UserMembership.create({
          createdById: user.id,
          documentId: document.id,
          userId: user.id,
          permission: DocumentPermission.Read,
        }),
        await GroupMembership.create({
          createdById: user.id,
          documentId: document.id,
          groupId: group.id,
          permission: DocumentPermission.ReadWrite,
        }),
      ]);

      const permission = await getDocumentPermission({
        userId: user.id,
        documentId: document.id,
        skipMembershipId: groupMembership.id,
      });

      expect(permission).toEqual(DocumentPermission.Read);
    });

    it("should return undefined when user does not have access", async () => {
      const user = await buildUser();
      const collection = await buildCollection({
        teamId: user.teamId,
        permission: null,
      });
      const document = await buildDocument({
        collectionId: collection.id,
        teamId: user.teamId,
      });

      const permission = await getDocumentPermission({
        userId: user.id,
        documentId: document.id,
      });

      expect(permission).toBeUndefined();
    });
  });
});
