import { UserMembership, GroupMembership } from "@server/models";
import {
  buildDocument,
  buildCollection,
  buildUser,
  buildTeam,
  buildAdmin,
  buildGroup,
} from "@server/test/factories";
import DocumentMovedProcessor from "./DocumentMovedProcessor";

const ip = "127.0.0.1";

describe("DocumentMovedProcessor", () => {
  describe("Bug fix - https://github.com/outline/outline/issues/11096", () => {
    it("should add sourced permissions from the top document when a document is moved into a new parent", async () => {
      const team = await buildTeam();
      const user = await buildAdmin({ teamId: team.id });
      const user2 = await buildUser({ teamId: team.id });
      const group = await buildGroup({ teamId: team.id });
      const collection = await buildCollection({
        userId: user.id,
        teamId: team.id,
      });

      const topDocument = await buildDocument({
        collectionId: collection.id,
        teamId: team.id,
      });
      const childDocument = await buildDocument({
        teamId: team.id,
        parentDocumentId: topDocument.id,
      });

      const sourceUserMembership = await UserMembership.create({
        userId: user2.id,
        documentId: topDocument.id,
        createdById: user.id,
      });
      const sourceGroupMembership = await GroupMembership.create({
        groupId: group.id,
        documentId: topDocument.id,
        createdById: user.id,
      });

      // remove sourced permissions from childDocument
      await UserMembership.destroy({
        where: { documentId: childDocument.id, userId: user2.id },
      });
      await GroupMembership.destroy({
        where: { documentId: childDocument.id, groupId: group.id },
      });

      // trigger move event on childDocument
      const processor = new DocumentMovedProcessor();
      await processor.perform({
        name: "documents.move",
        documentId: childDocument.id,
        collectionId: collection.id,
        teamId: team.id,
        actorId: user.id,
        ip,
        data: {
          collectionIds: [],
          documentIds: [],
        },
      });

      // doc2 should have sourced permissions from topDocument
      const memberships = await UserMembership.findAll({
        where: { documentId: childDocument.id, userId: user2.id },
      });
      const groupMemberships = await GroupMembership.findAll({
        where: { documentId: childDocument.id, groupId: group.id },
      });
      expect(memberships.length).toBe(1);
      expect(groupMemberships.length).toBe(1);

      expect(memberships[0].sourceId).toBe(sourceUserMembership.id);
      expect(groupMemberships[0].sourceId).toBe(sourceGroupMembership.id);
    });

    it("should not reapply sourced permissions to sibling documents when a document is moved into a new parent", async () => {
      const team = await buildTeam();
      const user = await buildAdmin({ teamId: team.id });
      const user2 = await buildUser({ teamId: team.id });
      const group = await buildGroup({ teamId: team.id });
      const collection = await buildCollection({
        userId: user.id,
        teamId: team.id,
      });

      const topDocument = await buildDocument({
        collectionId: collection.id,
        teamId: team.id,
      });
      const doc1 = await buildDocument({
        teamId: team.id,
        parentDocumentId: topDocument.id,
      });
      const doc2 = await buildDocument({
        teamId: team.id,
        parentDocumentId: topDocument.id,
      });

      await UserMembership.create({
        userId: user2.id,
        documentId: topDocument.id,
        createdById: user.id,
      });
      await GroupMembership.create({
        groupId: group.id,
        documentId: topDocument.id,
        createdById: user.id,
      });

      // Remove source permissions from doc2
      await UserMembership.destroy({
        where: { documentId: doc2.id, userId: user2.id },
      });
      await GroupMembership.destroy({
        where: { documentId: doc2.id, groupId: group.id },
      });

      // trigger move event on doc1
      const processor = new DocumentMovedProcessor();
      await processor.perform({
        name: "documents.move",
        documentId: doc1.id,
        collectionId: collection.id,
        teamId: team.id,
        actorId: user.id,
        ip,
        data: {
          collectionIds: [],
          documentIds: [],
        },
      });

      // sourced permission from user2 remains removed
      const userMemberships = await UserMembership.findAll({
        where: { documentId: doc2.id, userId: user2.id },
      });
      const groupMemberships = await GroupMembership.findAll({
        where: { documentId: doc2.id, groupId: group.id },
      });

      expect(userMemberships.length).toBe(0);
      expect(groupMemberships.length).toBe(0);
    });

    it("should not create duplicate sourced permissions when a document is moved", async () => {
      const team = await buildTeam();
      const user = await buildAdmin({ teamId: team.id });
      const user2 = await buildUser({ teamId: team.id });
      const group = await buildGroup({ teamId: team.id });
      const collection = await buildCollection({
        userId: user.id,
        teamId: team.id,
      });

      const topDocument = await buildDocument({
        collectionId: collection.id,
        teamId: team.id,
      });
      const doc1 = await buildDocument({
        teamId: team.id,
        parentDocumentId: topDocument.id,
      });
      const doc2 = await buildDocument({
        teamId: team.id,
        parentDocumentId: topDocument.id,
      });

      await UserMembership.create({
        userId: user2.id,
        documentId: topDocument.id,
        createdById: user.id,
      });
      await GroupMembership.create({
        groupId: group.id,
        documentId: topDocument.id,
        createdById: user.id,
      });

      // Trigger move event on doc1
      const processor = new DocumentMovedProcessor();
      await processor.perform({
        name: "documents.move",
        documentId: doc1.id,
        collectionId: collection.id,
        teamId: team.id,
        actorId: user.id,
        ip,
        data: {
          collectionIds: [],
          documentIds: [],
        },
      });

      // there should be no duplicate permissions are created for doc1 and doc2
      const doc1UserMemberships = await UserMembership.findAll({
        where: { documentId: doc1.id, userId: user2.id },
      });
      const doc2UserMemberships = await UserMembership.findAll({
        where: { documentId: doc2.id, userId: user2.id },
      });
      const doc1GroupMemberships = await GroupMembership.findAll({
        where: { documentId: doc1.id, groupId: group.id },
      });
      const doc2GroupMemberships = await GroupMembership.findAll({
        where: { documentId: doc2.id, groupId: group.id },
      });

      expect(doc1UserMemberships.length).toBe(1);
      expect(doc2UserMemberships.length).toBe(1);
      expect(doc1GroupMemberships.length).toBe(1);
      expect(doc2GroupMemberships.length).toBe(1);
    });

    it.only("should propagate sourced permissions to child documents of the moved document", async () => {
      const team = await buildTeam();
      const user = await buildAdmin({ teamId: team.id });
      const user2 = await buildUser({ teamId: team.id });
      const group = await buildGroup({ teamId: team.id });
      const collection = await buildCollection({
        userId: user.id,
        teamId: team.id,
      });

      const topDocument = await buildDocument({
        collectionId: collection.id,
        teamId: team.id,
      });
      const childDocument = await buildDocument({
        teamId: team.id,
        parentDocumentId: topDocument.id,
      });
      const grandChildDocument = await buildDocument({
        teamId: team.id,
        parentDocumentId: childDocument.id,
      });

      const sourceUserMembership = await UserMembership.create({
        userId: user2.id,
        documentId: topDocument.id,
        createdById: user.id,
      });
      const sourceGroupMembership = await GroupMembership.create({
        groupId: group.id,
        documentId: topDocument.id,
        createdById: user.id,
      });

      // Remove sourced permissions from childDocument and grandChildDocument
      await UserMembership.destroy({
        where: { documentId: childDocument.id, userId: user2.id },
      });
      await GroupMembership.destroy({
        where: { documentId: childDocument.id, groupId: group.id },
      });
      await UserMembership.destroy({
        where: { documentId: grandChildDocument.id, userId: user2.id },
      });
      await GroupMembership.destroy({
        where: { documentId: grandChildDocument.id, groupId: group.id },
      });

      // Trigger move event on childDocument
      const processor = new DocumentMovedProcessor();
      await processor.perform({
        name: "documents.move",
        documentId: childDocument.id,
        collectionId: collection.id,
        teamId: team.id,
        actorId: user.id,
        ip,
        data: {
          collectionIds: [],
          documentIds: [],
        },
      });

      // Verify permissions for childDocument
      const childUserMemberships = await UserMembership.findAll({
        where: { documentId: childDocument.id, userId: user2.id },
      });
      const childGroupMemberships = await GroupMembership.findAll({
        where: { documentId: childDocument.id, groupId: group.id },
      });
      expect(childUserMemberships.length).toBe(1);
      expect(childGroupMemberships.length).toBe(1);
      expect(childUserMemberships[0].sourceId).toBe(sourceUserMembership.id);
      expect(childGroupMemberships[0].sourceId).toBe(sourceGroupMembership.id);

      // Verify permissions for grandChildDocument
      const grandChildUserMemberships = await UserMembership.findAll({
        where: { documentId: grandChildDocument.id, userId: user2.id },
      });
      const grandChildGroupMemberships = await GroupMembership.findAll({
        where: { documentId: grandChildDocument.id, groupId: group.id },
      });
      expect(grandChildUserMemberships.length).toBe(1);
      expect(grandChildGroupMemberships.length).toBe(1);
      expect(grandChildUserMemberships[0].sourceId).toBe(
        sourceUserMembership.id
      );
      expect(grandChildGroupMemberships[0].sourceId).toBe(
        sourceGroupMembership.id
      );
    });
  });
});
