import {
  DirectionFilter,
  DocumentPermission,
  SortFilter,
  StatusFilter,
} from "@shared/types";
import {
  buildDocument,
  buildDraftDocument,
  buildCollection,
  buildTeam,
  buildUser,
  buildShare,
  buildGroup,
} from "@server/test/factories";
import UserMembership from "@server/models/UserMembership";
import GroupMembership from "@server/models/GroupMembership";
import SearchProviderManager from "@server/utils/SearchProviderManager";
import PostgresSearchProvider from "./PostgresSearchProvider";

const provider = SearchProviderManager.getProvider();

beforeEach(async () => {
  jest.resetAllMocks();
  await buildDocument();
});

describe("PostgresSearchProvider", () => {
  describe("#searchForTeam", () => {
    it("should return search results from public collections", async () => {
      const team = await buildTeam();
      const collection = await buildCollection({
        teamId: team.id,
      });
      const document = await buildDocument({
        teamId: team.id,
        collectionId: collection.id,
        title: "test",
      });
      const { results } = await provider.searchForTeam(team, {
        query: "test",
      });
      expect(results.length).toBe(1);
      expect(results[0].document?.id).toBe(document.id);
    });

    it("should return search results from a collection without search term", async () => {
      const team = await buildTeam();
      const collection = await buildCollection({
        teamId: team.id,
      });
      const documents = await Promise.all([
        buildDocument({
          teamId: team.id,
          collectionId: collection.id,
          title: "document 1",
        }),
        buildDocument({
          teamId: team.id,
          collectionId: collection.id,
          title: "document 2",
        }),
      ]);
      const { results } = await provider.searchForTeam(team);
      expect(results.length).toBe(2);
      expect(results.map((r) => r.document.id).sort()).toEqual(
        documents.map((doc) => doc.id).sort()
      );
    });

    it("should not return results from private collections without providing collectionId", async () => {
      const team = await buildTeam();
      const collection = await buildCollection({
        permission: null,
        teamId: team.id,
      });
      await buildDocument({
        teamId: team.id,
        collectionId: collection.id,
        title: "test",
      });
      const { results } = await provider.searchForTeam(team, {
        query: "test",
      });
      expect(results.length).toBe(0);
    });

    it("should return results from private collections when collectionId is provided", async () => {
      const team = await buildTeam();
      const collection = await buildCollection({
        permission: null,
        teamId: team.id,
      });
      await buildDocument({
        teamId: team.id,
        collectionId: collection.id,
        title: "test",
      });
      const { results } = await provider.searchForTeam(team, {
        query: "test",
        collectionId: collection.id,
      });
      expect(results.length).toBe(1);
    });

    it("should return results from document tree of shared document", async () => {
      const team = await buildTeam();
      const collection = await buildCollection({
        permission: null,
        teamId: team.id,
      });
      const document = await buildDocument({
        teamId: team.id,
        collectionId: collection.id,
        title: "test 1",
      });
      await buildDocument({
        teamId: team.id,
        collectionId: collection.id,
        title: "test 2",
      });

      const share = await buildShare({
        documentId: document.id,
        includeChildDocuments: true,
      });

      const { results } = await provider.searchForTeam(team, {
        query: "test",
        collectionId: collection.id,
        share,
      });
      expect(results.length).toBe(1);
    });

    it("should handle no collections", async () => {
      const team = await buildTeam();
      const { results } = await provider.searchForTeam(team, {
        query: "test",
      });
      expect(results.length).toBe(0);
    });

    it("should handle backslashes in search term", async () => {
      const team = await buildTeam();
      const collection = await buildCollection({
        teamId: team.id,
      });
      const document = await buildDocument({
        teamId: team.id,
        collectionId: collection.id,
        title: "test with backslash \\",
      });
      const { results } = await provider.searchForTeam(team, {
        query: "test with backslash \\",
      });
      expect(results.length).toBe(1);
      expect(results[0].document?.id).toBe(document.id);
    });

    it("should return the total count of search results", async () => {
      const team = await buildTeam();
      const collection = await buildCollection({
        teamId: team.id,
      });
      await buildDocument({
        teamId: team.id,
        collectionId: collection.id,
        title: "test number 1",
      });
      await buildDocument({
        teamId: team.id,
        collectionId: collection.id,
        title: "test number 2",
      });
      const { total } = await provider.searchForTeam(team, {
        query: "test",
      });
      expect(total).toBe(2);
    });

    it("should return the document when searched with their previous titles", async () => {
      const team = await buildTeam();
      const collection = await buildCollection({
        teamId: team.id,
      });
      const document = await buildDocument({
        teamId: team.id,
        collectionId: collection.id,
        title: "test number 1",
      });
      document.title = "change";
      await document.save();
      const { total } = await provider.searchForTeam(team, {
        query: "test number",
      });
      expect(total).toBe(1);
    });

    it("should not return the document when searched with neither the titles nor the previous titles", async () => {
      const team = await buildTeam();
      const collection = await buildCollection({
        teamId: team.id,
      });
      const document = await buildDocument({
        teamId: team.id,
        collectionId: collection.id,
        title: "test number 1",
      });
      document.title = "change";
      await document.save();
      const { total } = await provider.searchForTeam(team, {
        query: "title doesn't exist",
      });
      expect(total).toBe(0);
    });
  });

  describe("#searchForUser", () => {
    it("should return search results from collections", async () => {
      const team = await buildTeam();
      const user = await buildUser({ teamId: team.id });
      const collection = await buildCollection({
        userId: user.id,
        teamId: team.id,
      });
      const document = await buildDocument({
        userId: user.id,
        teamId: team.id,
        collectionId: collection.id,
        title: "test",
      });
      await buildDocument({
        userId: user.id,
        teamId: team.id,
        collectionId: collection.id,
        deletedAt: new Date(),
        title: "test",
      });
      const { results } = await provider.searchForUser(user, {
        query: "test",
      });
      expect(results.length).toBe(1);
      expect(results[0].ranking).toBeTruthy();
      expect(results[0].document?.id).toBe(document.id);
    });

    it("should return search results for a user without search term", async () => {
      const team = await buildTeam();
      const user = await buildUser({ teamId: team.id });
      const collection = await buildCollection({
        teamId: team.id,
        userId: user.id,
      });
      const documents = await Promise.all([
        buildDocument({
          teamId: team.id,
          userId: user.id,
          collectionId: collection.id,
          title: "document 1",
        }),
        buildDocument({
          teamId: team.id,
          userId: user.id,
          collectionId: collection.id,
          title: "document 2",
        }),
      ]);
      const { results } = await provider.searchForUser(user);
      expect(results.length).toBe(2);
      expect(results.map((r) => r.document.id).sort()).toEqual(
        documents.map((doc) => doc.id).sort()
      );
    });

    it("should return search results from a collection without search term", async () => {
      const team = await buildTeam();
      const user = await buildUser({ teamId: team.id });
      const collection = await buildCollection({
        teamId: team.id,
        userId: user.id,
      });
      const documents = await Promise.all([
        buildDocument({
          teamId: team.id,
          userId: user.id,
          collectionId: collection.id,
          title: "document 1",
        }),
        buildDocument({
          teamId: team.id,
          userId: user.id,
          collectionId: collection.id,
          title: "document 2",
        }),
      ]);
      const { results } = await provider.searchForUser(user, {
        collectionId: collection.id,
      });
      expect(results.length).toBe(2);
      expect(results.map((r) => r.document.id).sort()).toEqual(
        documents.map((doc) => doc.id).sort()
      );
    });

    it("should not return documents from other collections when filtering by specific collection without search term", async () => {
      const team = await buildTeam();
      const user = await buildUser({ teamId: team.id });
      const collection1 = await buildCollection({
        teamId: team.id,
        userId: user.id,
      });
      const collection2 = await buildCollection({
        teamId: team.id,
        userId: user.id,
      });
      const docsInCollection1 = await Promise.all([
        buildDocument({
          teamId: team.id,
          userId: user.id,
          collectionId: collection1.id,
          title: "document 1 in collection 1",
        }),
        buildDocument({
          teamId: team.id,
          userId: user.id,
          collectionId: collection1.id,
          title: "document 2 in collection 1",
        }),
      ]);
      await Promise.all([
        buildDocument({
          teamId: team.id,
          userId: user.id,
          collectionId: collection2.id,
          title: "document 1 in collection 2",
        }),
        buildDocument({
          teamId: team.id,
          userId: user.id,
          collectionId: collection2.id,
          title: "document 2 in collection 2",
        }),
      ]);
      const { results } = await provider.searchForUser(user, {
        collectionId: collection1.id,
      });
      expect(results.length).toBe(2);
      expect(results.map((r) => r.document.id).sort()).toEqual(
        docsInCollection1.map((doc) => doc.id).sort()
      );
    });

    it("should handle no collections", async () => {
      const team = await buildTeam();
      const user = await buildUser({ teamId: team.id });
      const { results } = await provider.searchForUser(user, {
        query: "test",
      });
      expect(results.length).toBe(0);
    });

    it("should search only drafts created by user", async () => {
      const user = await buildUser();
      await buildDraftDocument({
        title: "test",
      });
      await buildDraftDocument({
        teamId: user.teamId,
        userId: user.id,
        createdById: user.id,
        title: "test",
      });
      await buildDocument({
        userId: user.id,
        teamId: user.teamId,
        createdById: user.id,
        title: "test",
      });
      await buildDocument({
        userId: user.id,
        teamId: user.teamId,
        createdById: user.id,
        title: "test",
        archivedAt: new Date(),
      });
      const { results } = await provider.searchForUser(user, {
        query: "test",
        statusFilter: [StatusFilter.Draft],
      });
      expect(results.length).toBe(1);
    });

    it("should include drafts with no collection created by user", async () => {
      const user = await buildUser();
      const draft = await buildDraftDocument({
        teamId: user.teamId,
        userId: user.id,
        createdById: user.id,
        collectionId: null,
        title: "test",
      });
      const { results } = await provider.searchForUser(user, {
        query: "test",
        statusFilter: [StatusFilter.Draft],
      });
      expect(results.length).toBe(1);
      expect(results[0].document?.id).toBe(draft.id);
    });

    it("should not include drafts created by user in inaccessible collections", async () => {
      const team = await buildTeam();
      const user = await buildUser({ teamId: team.id });
      const otherUser = await buildUser({ teamId: team.id });
      const privateCollection = await buildCollection({
        teamId: team.id,
        userId: otherUser.id,
        permission: null,
      });
      await buildDraftDocument({
        teamId: team.id,
        userId: user.id,
        createdById: user.id,
        collectionId: privateCollection.id,
        title: "test",
      });
      const { results } = await provider.searchForUser(user, {
        query: "test",
        statusFilter: [StatusFilter.Draft],
      });
      expect(results.length).toBe(0);
    });

    it("should not include drafts with user read permission", async () => {
      const user = await buildUser();
      await buildDraftDocument({
        title: "test",
      });
      const draft = await buildDraftDocument({
        teamId: user.teamId,
        userId: user.id,
        createdById: user.id,
        title: "test",
      });
      await UserMembership.create({
        createdById: user.id,
        documentId: draft.id,
        userId: user.id,
        permission: DocumentPermission.Read,
      });

      const { results } = await provider.searchForUser(user, {
        query: "test",
        statusFilter: [StatusFilter.Published, StatusFilter.Archived],
      });
      expect(results.length).toBe(0);
    });

    it("should search only published created by user", async () => {
      const user = await buildUser();
      await buildDocument({
        title: "test",
      });
      await buildDraftDocument({
        teamId: user.teamId,
        userId: user.id,
        createdById: user.id,
        title: "test",
      });
      await buildDocument({
        userId: user.id,
        teamId: user.teamId,
        createdById: user.id,
        title: "test",
      });
      await buildDocument({
        userId: user.id,
        teamId: user.teamId,
        createdById: user.id,
        title: "test",
        archivedAt: new Date(),
      });
      const { results } = await provider.searchForUser(user, {
        query: "test",
        statusFilter: [StatusFilter.Published],
      });
      expect(results.length).toBe(1);
    });

    it("should search only archived documents created by user", async () => {
      const user = await buildUser();
      await buildDocument({
        title: "test",
      });
      await buildDraftDocument({
        teamId: user.teamId,
        userId: user.id,
        createdById: user.id,
        title: "test",
      });
      await buildDocument({
        userId: user.id,
        teamId: user.teamId,
        createdById: user.id,
        title: "test",
      });
      await buildDocument({
        userId: user.id,
        teamId: user.teamId,
        createdById: user.id,
        title: "test",
      });
      await buildDocument({
        userId: user.id,
        teamId: user.teamId,
        createdById: user.id,
        title: "test",
        archivedAt: new Date(),
      });
      const { results } = await provider.searchForUser(user, {
        query: "test",
        statusFilter: [StatusFilter.Archived],
      });
      expect(results.length).toBe(1);
    });

    it("should return results from archived and published", async () => {
      const user = await buildUser();
      await buildDraftDocument({
        teamId: user.teamId,
        userId: user.id,
        createdById: user.id,
        title: "test",
      });
      await buildDocument({
        userId: user.id,
        teamId: user.teamId,
        createdById: user.id,
        title: "test",
      });
      await buildDocument({
        userId: user.id,
        teamId: user.teamId,
        createdById: user.id,
        title: "test",
        archivedAt: new Date(),
      });
      const { results } = await provider.searchForUser(user, {
        query: "test",
        statusFilter: [StatusFilter.Archived, StatusFilter.Published],
      });
      expect(results.length).toBe(2);
    });

    it("should return results from drafts and published", async () => {
      const user = await buildUser();
      await buildDocument({
        userId: user.id,
        teamId: user.teamId,
        createdById: user.id,
        title: "not draft",
      });
      await buildDraftDocument({
        teamId: user.teamId,
        userId: user.id,
        createdById: user.id,
        title: "draft",
      });
      await buildDocument({
        userId: user.id,
        teamId: user.teamId,
        createdById: user.id,
        title: "archived not draft",
        archivedAt: new Date(),
      });
      const { results } = await provider.searchForUser(user, {
        query: "draft",
        statusFilter: [StatusFilter.Published, StatusFilter.Draft],
      });
      expect(results.length).toBe(2);
    });

    it("should include results from drafts and archived", async () => {
      const user = await buildUser();
      await buildDocument({
        userId: user.id,
        teamId: user.teamId,
        createdById: user.id,
        title: "not draft",
      });
      await buildDraftDocument({
        teamId: user.teamId,
        userId: user.id,
        createdById: user.id,
        title: "draft",
      });
      await buildDocument({
        userId: user.id,
        teamId: user.teamId,
        createdById: user.id,
        title: "archived not draft",
        archivedAt: new Date(),
      });
      const { results } = await provider.searchForUser(user, {
        query: "draft",
        statusFilter: [StatusFilter.Draft, StatusFilter.Archived],
      });
      expect(results.length).toBe(2);
    });

    it("should return the total count of search results", async () => {
      const team = await buildTeam();
      const user = await buildUser({ teamId: team.id });
      const collection = await buildCollection({
        userId: user.id,
        teamId: team.id,
      });
      await buildDocument({
        userId: user.id,
        teamId: team.id,
        collectionId: collection.id,
        title: "test number 1",
      });
      await buildDocument({
        userId: user.id,
        teamId: team.id,
        collectionId: collection.id,
        title: "test number 2",
      });
      const { total } = await provider.searchForUser(user, {
        query: "test",
      });
      expect(total).toBe(2);
    });

    it("should return the document when searched with their previous titles", async () => {
      const team = await buildTeam();
      const user = await buildUser({ teamId: team.id });
      const collection = await buildCollection({
        teamId: team.id,
        userId: user.id,
      });
      const document = await buildDocument({
        teamId: team.id,
        userId: user.id,
        collectionId: collection.id,
        title: "test number 1",
      });
      document.title = "change";
      await document.save();
      const { total } = await provider.searchForUser(user, {
        query: "test number",
      });
      expect(total).toBe(1);
    });

    it("should not return the document when searched with neither the titles nor the previous titles", async () => {
      const team = await buildTeam();
      const user = await buildUser({ teamId: team.id });
      const collection = await buildCollection({
        teamId: team.id,
        userId: user.id,
      });
      const document = await buildDocument({
        teamId: team.id,
        userId: user.id,
        collectionId: collection.id,
        title: "test number 1",
      });
      document.title = "change";
      await document.save();
      const { total } = await provider.searchForUser(user, {
        query: "title doesn't exist",
      });
      expect(total).toBe(0);
    });

    it("should find exact phrases", async () => {
      const team = await buildTeam();
      const user = await buildUser({ teamId: team.id });
      const collection = await buildCollection({
        teamId: team.id,
        userId: user.id,
      });
      const document = await buildDocument({
        teamId: team.id,
        userId: user.id,
        collectionId: collection.id,
        text: "test number 1",
      });
      document.title = "change";
      await document.save();
      const { total } = await provider.searchForUser(user, {
        query: `"test number"`,
      });
      expect(total).toBe(1);
    });

    it("should correctly handle removal of trailing spaces", async () => {
      const team = await buildTeam();
      const user = await buildUser({ teamId: team.id });
      const collection = await buildCollection({
        teamId: team.id,
        userId: user.id,
      });
      const document = await buildDocument({
        teamId: team.id,
        userId: user.id,
        collectionId: collection.id,
        text: "env: some env",
      });
      document.title = "change";
      await document.save();
      const { total } = await provider.searchForUser(user, {
        query: "env: ",
      });
      expect(total).toBe(1);
    });

    it("should return search results from group memberships", async () => {
      const team = await buildTeam();
      const user = await buildUser({ teamId: team.id });
      const otherUser = await buildUser({ teamId: team.id });
      const collection = await buildCollection({
        userId: otherUser.id,
        teamId: team.id,
        permission: null,
      });
      const document = await buildDocument({
        userId: otherUser.id,
        teamId: team.id,
        collectionId: collection.id,
        title: "group test document",
      });

      await buildDocument({
        userId: otherUser.id,
        teamId: team.id,
        collectionId: collection.id,
        title: "group test document 2",
      });

      const group = await buildGroup({
        teamId: team.id,
      });
      await group.$add("user", user, {
        through: {
          createdById: otherUser.id,
        },
      });

      await GroupMembership.create({
        createdById: otherUser.id,
        groupId: group.id,
        documentId: document.id,
      });

      const { results } = await provider.searchForUser(user, {
        query: "group test",
      });

      expect(results.length).toBe(1);
      expect(results[0].ranking).toBeTruthy();
      expect(results[0].document?.id).toBe(document.id);
    });
  });

  describe("#searchTitlesForUser", () => {
    it("should return search results from collections", async () => {
      const team = await buildTeam();
      const user = await buildUser({ teamId: team.id });
      const collection = await buildCollection({
        userId: user.id,
        teamId: team.id,
      });
      const document = await buildDocument({
        userId: user.id,
        teamId: team.id,
        collectionId: collection.id,
        title: "test",
      });
      const documents = await provider.searchTitlesForUser(user, {
        query: "test",
      });
      expect(documents.length).toBe(1);
      expect(documents[0]?.id).toBe(document.id);
    });

    it("should filter to specific collection", async () => {
      const team = await buildTeam();
      const user = await buildUser({ teamId: team.id });
      const collection = await buildCollection({
        userId: user.id,
        teamId: team.id,
      });
      const collection1 = await buildCollection({
        userId: user.id,
        teamId: team.id,
      });
      const document = await buildDocument({
        userId: user.id,
        teamId: team.id,
        collectionId: collection.id,
        title: "test",
      });
      await buildDraftDocument({
        teamId: team.id,
        userId: user.id,
        title: "test",
      });
      await buildDocument({
        userId: user.id,
        teamId: team.id,
        collectionId: collection1.id,
        title: "test",
      });
      const documents = await provider.searchTitlesForUser(user, {
        query: "test",
        collectionId: collection.id,
      });
      expect(documents.length).toBe(1);
      expect(documents[0]?.id).toBe(document.id);
    });

    it("should handle no collections", async () => {
      const team = await buildTeam();
      const user = await buildUser({ teamId: team.id });
      const documents = await provider.searchTitlesForUser(user, {
        query: "test",
      });
      expect(documents.length).toBe(0);
    });

    it("should search only drafts created by user", async () => {
      const user = await buildUser();
      await buildDraftDocument({
        title: "test",
      });
      await buildDraftDocument({
        teamId: user.teamId,
        userId: user.id,
        createdById: user.id,
        title: "test",
      });
      await buildDocument({
        userId: user.id,
        teamId: user.teamId,
        createdById: user.id,
        title: "test",
      });
      await buildDocument({
        userId: user.id,
        teamId: user.teamId,
        createdById: user.id,
        title: "test",
        archivedAt: new Date(),
      });
      const documents = await provider.searchTitlesForUser(user, {
        query: "test",
        statusFilter: [StatusFilter.Draft],
      });
      expect(documents.length).toBe(1);
    });

    it("should search only published created by user", async () => {
      const user = await buildUser();
      await buildDocument({
        title: "test",
      });
      await buildDraftDocument({
        teamId: user.teamId,
        userId: user.id,
        createdById: user.id,
        title: "test",
      });
      await buildDocument({
        userId: user.id,
        teamId: user.teamId,
        createdById: user.id,
        title: "test",
      });
      await buildDocument({
        userId: user.id,
        teamId: user.teamId,
        createdById: user.id,
        title: "test",
        archivedAt: new Date(),
      });
      const documents = await provider.searchTitlesForUser(user, {
        query: "test",
        statusFilter: [StatusFilter.Published],
      });
      expect(documents.length).toBe(1);
    });

    it("should search only archived documents created by user", async () => {
      const user = await buildUser();
      await buildDocument({
        title: "test",
      });
      await buildDraftDocument({
        teamId: user.teamId,
        userId: user.id,
        createdById: user.id,
        title: "test",
      });
      await buildDocument({
        userId: user.id,
        teamId: user.teamId,
        createdById: user.id,
        title: "test",
      });
      await buildDocument({
        userId: user.id,
        teamId: user.teamId,
        createdById: user.id,
        title: "test",
      });
      await buildDocument({
        userId: user.id,
        teamId: user.teamId,
        createdById: user.id,
        title: "test",
        archivedAt: new Date(),
      });
      const documents = await provider.searchTitlesForUser(user, {
        query: "test",
        statusFilter: [StatusFilter.Archived],
      });
      expect(documents.length).toBe(1);
    });

    it("should return results from archived and published", async () => {
      const user = await buildUser();
      await buildDraftDocument({
        teamId: user.teamId,
        userId: user.id,
        createdById: user.id,
        title: "test",
      });
      await buildDocument({
        userId: user.id,
        teamId: user.teamId,
        createdById: user.id,
        title: "test",
      });
      await buildDocument({
        userId: user.id,
        teamId: user.teamId,
        createdById: user.id,
        title: "test",
        archivedAt: new Date(),
      });
      const documents = await provider.searchTitlesForUser(user, {
        query: "test",
        statusFilter: [StatusFilter.Archived, StatusFilter.Published],
      });
      expect(documents.length).toBe(2);
    });

    it("should return results from drafts and published", async () => {
      const user = await buildUser();
      await buildDocument({
        userId: user.id,
        teamId: user.teamId,
        createdById: user.id,
        title: "not draft",
      });
      await buildDraftDocument({
        teamId: user.teamId,
        userId: user.id,
        createdById: user.id,
        title: "draft",
      });
      await buildDocument({
        userId: user.id,
        teamId: user.teamId,
        createdById: user.id,
        title: "archived not draft",
        archivedAt: new Date(),
      });
      const documents = await provider.searchTitlesForUser(user, {
        query: "draft",
        statusFilter: [StatusFilter.Published, StatusFilter.Draft],
      });
      expect(documents.length).toBe(2);
    });

    it("should include results from drafts and archived", async () => {
      const user = await buildUser();
      await buildDocument({
        userId: user.id,
        teamId: user.teamId,
        createdById: user.id,
        title: "not draft",
      });
      await buildDraftDocument({
        teamId: user.teamId,
        userId: user.id,
        createdById: user.id,
        title: "draft",
      });
      await buildDocument({
        userId: user.id,
        teamId: user.teamId,
        createdById: user.id,
        title: "archived not draft",
        archivedAt: new Date(),
      });
      const documents = await provider.searchTitlesForUser(user, {
        query: "draft",
        statusFilter: [StatusFilter.Draft, StatusFilter.Archived],
      });
      expect(documents.length).toBe(2);
    });

    it("should return search results from group memberships", async () => {
      const team = await buildTeam();
      const user = await buildUser({ teamId: team.id });
      const otherUser = await buildUser({ teamId: team.id });
      const collection = await buildCollection({
        userId: otherUser.id,
        teamId: team.id,
        permission: null,
      });
      const document = await buildDocument({
        userId: otherUser.id,
        teamId: team.id,
        collectionId: collection.id,
        title: "group title test document",
      });

      await buildDocument({
        userId: otherUser.id,
        teamId: team.id,
        collectionId: collection.id,
        title: "group title test document 2",
      });

      const group = await buildGroup({
        teamId: team.id,
      });
      await group.$add("user", user, {
        through: {
          createdById: otherUser.id,
        },
      });

      await GroupMembership.create({
        createdById: otherUser.id,
        groupId: group.id,
        documentId: document.id,
      });

      const documents = await provider.searchTitlesForUser(user, {
        query: "group title",
      });

      expect(documents.length).toBe(1);
      expect(documents[0].id).toBe(document.id);
    });
  });

  describe("#searchCollectionsForUser", () => {
    it("should return search results from collections", async () => {
      const team = await buildTeam();
      const user = await buildUser({ teamId: team.id });
      const collection1 = await buildCollection({
        teamId: team.id,
        userId: user.id,
        name: "Test Collection",
      });
      await buildCollection({
        teamId: team.id,
        userId: user.id,
        name: "Other Collection",
      });

      const results = await provider.searchCollectionsForUser(user, {
        query: "test",
      });

      expect(results.length).toBe(1);
      expect(results[0].id).toBe(collection1.id);
    });

    it("should return all collections when no query provided", async () => {
      const team = await buildTeam();
      const user = await buildUser({ teamId: team.id });
      const collection1 = await buildCollection({
        teamId: team.id,
        userId: user.id,
        name: "Alpha",
      });
      const collection2 = await buildCollection({
        teamId: team.id,
        userId: user.id,
        name: "Beta",
      });

      const results = await provider.searchCollectionsForUser(user);

      expect(results.length).toBe(2);
      expect(results[0].id).toBe(collection1.id);
      expect(results[1].id).toBe(collection2.id);
    });
  });

  describe("sorting", () => {
    it("should sort search results by title ascending", async () => {
      const team = await buildTeam();
      const user = await buildUser({ teamId: team.id });
      const collection = await buildCollection({
        teamId: team.id,
        userId: user.id,
      });
      const doc1 = await buildDocument({
        teamId: team.id,
        collectionId: collection.id,
        userId: user.id,
        title: "Zebra Document",
      });
      const doc2 = await buildDocument({
        teamId: team.id,
        collectionId: collection.id,
        userId: user.id,
        title: "Alpha Document",
      });
      const doc3 = await buildDocument({
        teamId: team.id,
        collectionId: collection.id,
        userId: user.id,
        title: "Beta Document",
      });

      const { results } = await provider.searchForUser(user, {
        sort: SortFilter.Title,
        direction: DirectionFilter.ASC,
      });

      expect(results.length).toBe(3);
      expect(results[0].document.id).toBe(doc2.id);
      expect(results[1].document.id).toBe(doc3.id);
      expect(results[2].document.id).toBe(doc1.id);
    });

    it("should sort search results by title descending", async () => {
      const team = await buildTeam();
      const user = await buildUser({ teamId: team.id });
      const collection = await buildCollection({
        teamId: team.id,
        userId: user.id,
      });
      const doc1 = await buildDocument({
        teamId: team.id,
        collectionId: collection.id,
        userId: user.id,
        title: "Zebra Document",
      });
      const doc2 = await buildDocument({
        teamId: team.id,
        collectionId: collection.id,
        userId: user.id,
        title: "Alpha Document",
      });
      const doc3 = await buildDocument({
        teamId: team.id,
        collectionId: collection.id,
        userId: user.id,
        title: "Beta Document",
      });

      const { results } = await provider.searchForUser(user, {
        sort: SortFilter.Title,
        direction: DirectionFilter.DESC,
      });

      expect(results.length).toBe(3);
      expect(results[0].document.id).toBe(doc1.id);
      expect(results[1].document.id).toBe(doc3.id);
      expect(results[2].document.id).toBe(doc2.id);
    });

    it("should sort search results by createdAt ascending", async () => {
      const team = await buildTeam();
      const user = await buildUser({ teamId: team.id });
      const collection = await buildCollection({
        teamId: team.id,
        userId: user.id,
      });
      const doc1 = await buildDocument({
        teamId: team.id,
        collectionId: collection.id,
        userId: user.id,
        title: "First Document",
        createdAt: new Date("2023-01-01"),
        updatedAt: new Date("2023-12-03"),
      });
      const doc2 = await buildDocument({
        teamId: team.id,
        collectionId: collection.id,
        userId: user.id,
        title: "Second Document",
        createdAt: new Date("2023-06-01"),
        updatedAt: new Date("2023-12-02"),
      });
      const doc3 = await buildDocument({
        teamId: team.id,
        collectionId: collection.id,
        userId: user.id,
        title: "Third Document",
        createdAt: new Date("2023-12-01"),
        updatedAt: new Date("2023-12-01"),
      });

      const { results } = await provider.searchForUser(user, {
        sort: SortFilter.CreatedAt,
        direction: DirectionFilter.ASC,
      });

      expect(results.length).toBe(3);
      expect(results[0].document.id).toBe(doc1.id);
      expect(results[1].document.id).toBe(doc2.id);
      expect(results[2].document.id).toBe(doc3.id);
    });

    it("should sort search results by updatedAt descending by default", async () => {
      const team = await buildTeam();
      const user = await buildUser({ teamId: team.id });
      const collection = await buildCollection({
        teamId: team.id,
        userId: user.id,
      });
      const doc1 = await buildDocument({
        teamId: team.id,
        collectionId: collection.id,
        userId: user.id,
        title: "Document 1",
        updatedAt: new Date("2023-01-01"),
      });
      const doc2 = await buildDocument({
        teamId: team.id,
        collectionId: collection.id,
        userId: user.id,
        title: "Document 2",
        updatedAt: new Date("2023-12-01"),
      });
      const doc3 = await buildDocument({
        teamId: team.id,
        collectionId: collection.id,
        userId: user.id,
        title: "Document 3",
        updatedAt: new Date("2023-06-01"),
      });

      const { results } = await provider.searchForUser(user);

      expect(results.length).toBe(3);
      expect(results[0].document.id).toBe(doc2.id);
      expect(results[1].document.id).toBe(doc3.id);
      expect(results[2].document.id).toBe(doc1.id);
    });

    it("should order results by search ranking when query is provided and no explicit sort", async () => {
      const team = await buildTeam();
      const user = await buildUser({ teamId: team.id });
      const collection = await buildCollection({
        teamId: team.id,
        userId: user.id,
      });

      // Create a document with a less relevant title but more recent updatedAt
      const recentDoc = await buildDocument({
        teamId: team.id,
        collectionId: collection.id,
        userId: user.id,
        title: "unrelated recent",
        text: "This document mentions search only once",
        updatedAt: new Date("2025-12-01"),
      });

      // Create a document with a highly relevant title but older updatedAt
      const relevantDoc = await buildDocument({
        teamId: team.id,
        collectionId: collection.id,
        userId: user.id,
        title: "search search search",
        text: "search search search search search",
        updatedAt: new Date("2023-01-01"),
      });

      const { results } = await provider.searchForUser(user, {
        query: "search",
      });

      expect(results.length).toBe(2);
      // The more relevant document should come first, despite being older
      expect(results[0].document.id).toBe(relevantDoc.id);
      expect(results[1].document.id).toBe(recentDoc.id);
    });

    it("should use explicit sort over search ranking when sort is provided", async () => {
      const team = await buildTeam();
      const user = await buildUser({ teamId: team.id });
      const collection = await buildCollection({
        teamId: team.id,
        userId: user.id,
      });

      await buildDocument({
        teamId: team.id,
        collectionId: collection.id,
        userId: user.id,
        title: "search search search",
        text: "search search search search search",
        updatedAt: new Date("2023-01-01"),
      });

      const recentDoc = await buildDocument({
        teamId: team.id,
        collectionId: collection.id,
        userId: user.id,
        title: "unrelated recent",
        text: "This document mentions search only once",
        updatedAt: new Date("2025-12-01"),
      });

      const { results } = await provider.searchForUser(user, {
        query: "search",
        sort: SortFilter.UpdatedAt,
        direction: DirectionFilter.DESC,
      });

      expect(results.length).toBe(2);
      // With explicit sort, updatedAt should take priority
      expect(results[0].document.id).toBe(recentDoc.id);
    });
  });

  describe("popularity boost", () => {
    it("should not apply popularity boost when usePopularityBoost is false", async () => {
      const team = await buildTeam();
      const collection = await buildCollection({
        teamId: team.id,
      });

      // Create a less relevant document with a high popularity score
      await buildDocument({
        teamId: team.id,
        collectionId: collection.id,
        title: "guide",
        text: "This is a guide that mentions testing once",
        popularityScore: 1000,
      });

      // Create a highly relevant document with no popularity
      const relevantDoc = await buildDocument({
        teamId: team.id,
        collectionId: collection.id,
        title: "testing testing testing",
        text: "testing testing testing testing testing",
        popularityScore: 0,
      });

      // Without popularity boost, pure relevance should win
      const { results: withoutBoost } = await provider.searchForTeam(team, {
        query: "testing",
        usePopularityBoost: false,
      });

      expect(withoutBoost.length).toBe(2);
      expect(withoutBoost[0].document.id).toBe(relevantDoc.id);

      // With popularity boost, the popular document may rank higher
      const { results: withBoost } = await provider.searchForTeam(team, {
        query: "testing",
        usePopularityBoost: true,
      });

      expect(withBoost.length).toBe(2);
      // The popular document should have a higher ranking with boost
      expect(withBoost[0].ranking).toBeGreaterThanOrEqual(
        withoutBoost[0].ranking
      );
    });
  });

  describe("webSearchQuery", () => {
    it("should correctly sanitize query", () => {
      expect(PostgresSearchProvider.webSearchQuery("one/two")).toBe(
        "one/two:*"
      );
      expect(PostgresSearchProvider.webSearchQuery("one\\two")).toBe(
        "one\\\\two:*"
      );
      expect(PostgresSearchProvider.webSearchQuery("test''")).toBe("test");
    });
    it("should wildcard unquoted queries", () => {
      expect(PostgresSearchProvider.webSearchQuery("test")).toBe("test:*");
      expect(PostgresSearchProvider.webSearchQuery("'")).toBe("");
      expect(PostgresSearchProvider.webSearchQuery("'quoted'")).toBe(
        `"quoted":*`
      );
    });
    it("should wildcard multi-word queries", () => {
      expect(PostgresSearchProvider.webSearchQuery("this is a test")).toBe(
        "this&is&a&test:*"
      );
    });
    it("should not wildcard quoted queries", () => {
      expect(PostgresSearchProvider.webSearchQuery(`"this is a test"`)).toBe(
        `"this<->is<->a<->test"`
      );
    });
  });
});
