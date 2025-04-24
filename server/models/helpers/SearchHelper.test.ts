import { describe, expect } from "@jest/globals";
import { subMonths } from "date-fns";
import { DocumentPermission, StatusFilter } from "@shared/types";
import {
  buildTeam,
  buildUser,
  buildCollection,
  buildDocument,
  buildDraftDocument,
  buildShare,
} from "@server/test/factories";
import UserMembership from "../UserMembership";
import SearchHelper from "./SearchHelper";

describe("SearchHelper", () => {
  describe("#searchForTeam", () => {
    beforeEach(async () => {
      jest.resetAllMocks();
      await buildDocument();
    });

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
      const { results } = await SearchHelper.searchForTeam(team, {
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
      const { results } = await SearchHelper.searchForTeam(team);
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
      const { results } = await SearchHelper.searchForTeam(team, {
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
      const { results } = await SearchHelper.searchForTeam(team, {
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

      const { results } = await SearchHelper.searchForTeam(team, {
        query: "test",
        collectionId: collection.id,
        share,
      });
      expect(results.length).toBe(1);
    });

    it("should handle no collections", async () => {
      const team = await buildTeam();
      const { results } = await SearchHelper.searchForTeam(team, {
        query: "test",
      });
      expect(results.length).toBe(0);
    });

    it("should handle backslashes in search term", async () => {
      const team = await buildTeam();
      const { results } = await SearchHelper.searchForTeam(team, {
        query: "\\\\",
      });
      expect(results.length).toBe(0);
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
      const { total } = await SearchHelper.searchForTeam(team, {
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
      const { total } = await SearchHelper.searchForTeam(team, {
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
      const { total } = await SearchHelper.searchForTeam(team, {
        query: "title doesn't exist",
      });
      expect(total).toBe(0);
    });
  });

  describe("#searchForUser", () => {
    beforeEach(async () => {
      jest.resetAllMocks();
      await buildDocument();
    });

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
      const { results } = await SearchHelper.searchForUser(user, {
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
      const { results } = await SearchHelper.searchForUser(user);
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
      const { results } = await SearchHelper.searchForUser(user, {
        collectionId: collection.id,
      });
      expect(results.length).toBe(2);
      expect(results.map((r) => r.document.id).sort()).toEqual(
        documents.map((doc) => doc.id).sort()
      );
    });

    it("should handle no collections", async () => {
      const team = await buildTeam();
      const user = await buildUser({ teamId: team.id });
      const { results } = await SearchHelper.searchForUser(user, {
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
      const { results } = await SearchHelper.searchForUser(user, {
        query: "test",
        statusFilter: [StatusFilter.Draft],
      });
      expect(results.length).toBe(1);
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

      const { results } = await SearchHelper.searchForUser(user, {
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
      const { results } = await SearchHelper.searchForUser(user, {
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
      const { results } = await SearchHelper.searchForUser(user, {
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
      const { results } = await SearchHelper.searchForUser(user, {
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
      const { results } = await SearchHelper.searchForUser(user, {
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
      const { results } = await SearchHelper.searchForUser(user, {
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
      const { total } = await SearchHelper.searchForUser(user, {
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
      const { total } = await SearchHelper.searchForUser(user, {
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
      const { total } = await SearchHelper.searchForUser(user, {
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
      const { total } = await SearchHelper.searchForUser(user, {
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
      const { total } = await SearchHelper.searchForUser(user, {
        query: "env: ",
      });
      expect(total).toBe(1);
    });
  });

  describe("#searchTitlesForUser", () => {
    beforeEach(async () => {
      jest.resetAllMocks();
      await buildDocument();
    });

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
      const documents = await SearchHelper.searchTitlesForUser(user, {
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
      const documents = await SearchHelper.searchTitlesForUser(user, {
        query: "test",
        collectionId: collection.id,
      });
      expect(documents.length).toBe(1);
      expect(documents[0]?.id).toBe(document.id);
    });

    it("should handle no collections", async () => {
      const team = await buildTeam();
      const user = await buildUser({ teamId: team.id });
      const documents = await SearchHelper.searchTitlesForUser(user, {
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
      const documents = await SearchHelper.searchTitlesForUser(user, {
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
      const documents = await SearchHelper.searchTitlesForUser(user, {
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
      const documents = await SearchHelper.searchTitlesForUser(user, {
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
      const documents = await SearchHelper.searchTitlesForUser(user, {
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
      const documents = await SearchHelper.searchTitlesForUser(user, {
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
      const documents = await SearchHelper.searchTitlesForUser(user, {
        query: "draft",
        statusFilter: [StatusFilter.Draft, StatusFilter.Archived],
      });
      expect(documents.length).toBe(2);
    });
  });

  describe("#searchCollectionsForUser", () => {
    beforeEach(async () => {
      jest.resetAllMocks();
      await buildDocument();
    });

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

      const results = await SearchHelper.searchCollectionsForUser(user, {
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

      const results = await SearchHelper.searchCollectionsForUser(user);

      expect(results.length).toBe(2);
      expect(results[0].id).toBe(collection1.id);
      expect(results[1].id).toBe(collection2.id);
    });
  });

  describe("webSearchQuery", () => {
    it("should correctly sanitize query", () => {
      expect(SearchHelper.webSearchQuery("one/two")).toBe("one/two:*");
      expect(SearchHelper.webSearchQuery("one\\two")).toBe("one\\\\two:*");
      expect(SearchHelper.webSearchQuery("test''")).toBe("test");
    });
    it("should wildcard unquoted queries", () => {
      expect(SearchHelper.webSearchQuery("test")).toBe("test:*");
      expect(SearchHelper.webSearchQuery("'")).toBe("");
      expect(SearchHelper.webSearchQuery("'quoted'")).toBe(`"quoted":*`);
    });
    it("should wildcard multi-word queries", () => {
      expect(SearchHelper.webSearchQuery("this is a test")).toBe(
        "this&is&a&test:*"
      );
    });
    it("should not wildcard quoted queries", () => {
      expect(SearchHelper.webSearchQuery(`"this is a test"`)).toBe(
        `"this<->is<->a<->test"`
      );
    });
  });

  describe("searchConfig", () => {
    it("should boost recent documents when boostRecentMonths is set", async () => {
      const team = await buildTeam();
      const user = await buildUser({ teamId: team.id });
      const collection = await buildCollection({ teamId: team.id });
      const now = new Date();

      const recentDoc = await buildDocument({
        teamId: team.id,
        collectionId: collection.id,
        title: "test document recent",
        text: "test search term recent",
      });

      // Set date 4 months ago
      const olderDoc = await buildDocument({
        teamId: team.id,
        collectionId: collection.id,
        title: "test document older",
        text: "test search term older test",
        createdAt: subMonths(now, 4),
        updatedAt: subMonths(now, 4),
      });

      // Search without recency boost
      const resultsWithoutBoost = await SearchHelper.searchForUser(user, {
        query: "test search term",
      });

      // Search with recency boost
      const resultsWithBoost = await SearchHelper.searchForUser(user, {
        query: "test search term",
        searchConfig: {
          boostRecent: true,
          boostRecentMonths: 6,
          maxRecentBoost: 2.0,
        },
      });

      // Without boost, documents should be ordered by base relevance
      expect(resultsWithoutBoost.results.length).toBe(2);
      expect(resultsWithoutBoost.results[0].document.id).toBe(olderDoc.id);
      expect(resultsWithoutBoost.results[1].document.id).toBe(recentDoc.id);

      // With boost, recent document should be ranked higher
      expect(resultsWithBoost.results.length).toBe(2);
      expect(resultsWithBoost.results[0].document.id).toBe(recentDoc.id);
      expect(resultsWithBoost.results[1].document.id).toBe(olderDoc.id);

      // Recent document should have higher ranking
      expect(resultsWithBoost.results[0].ranking).toBeGreaterThan(
        resultsWithBoost.results[1].ranking
      );
    });

    it("should respect different time windows", async () => {
      const team = await buildTeam();
      const user = await buildUser({ teamId: team.id });
      const collection = await buildCollection({ teamId: team.id });
      const now = new Date();

      const recentDoc = await buildDocument({
        teamId: team.id,
        collectionId: collection.id,
        title: "test document recent",
        text: "test search term recent",
      });

      // Set date 2 months ago
      const twoMonthOldDoc = await buildDocument({
        teamId: team.id,
        collectionId: collection.id,
        title: "test document two months",
        text: "test search term two months",
        createdAt: subMonths(now, 2),
        updatedAt: subMonths(now, 2),
      });

      // Search with 1-month window
      const resultsShortWindow = await SearchHelper.searchForUser(user, {
        query: "test search term",
        searchConfig: {
          boostRecent: true,
          boostRecentMonths: 1,
          maxRecentBoost: 2.0,
        },
      });

      // Search with 3-month window
      const resultsLongWindow = await SearchHelper.searchForUser(user, {
        query: "test search term",
        searchConfig: {
          boostRecentMonths: 3,
          maxRecentBoost: 2.0,
        },
      });

      // With 1-month window, two-month-old doc should have no boost
      expect(resultsShortWindow.results[0].document.id).toBe(recentDoc.id);
      expect(resultsShortWindow.results[1].document.id).toBe(twoMonthOldDoc.id);
      expect(resultsShortWindow.results[0].ranking).toBeGreaterThan(
        resultsShortWindow.results[1].ranking * 1.5
      );

      // With 3-month window, two-month-old doc should have some boost
      expect(resultsLongWindow.results[0].document.id).toBe(recentDoc.id);
      expect(resultsLongWindow.results[1].document.id).toBe(twoMonthOldDoc.id);
      const rankingRatio =
        resultsLongWindow.results[0].ranking /
        resultsLongWindow.results[1].ranking;
      expect(rankingRatio).toBeLessThan(1.5);
      expect(rankingRatio).toBeGreaterThan(1.0);
    });

    it("should respect custom boost factor", async () => {
      const team = await buildTeam();
      const user = await buildUser({ teamId: team.id });
      const collection = await buildCollection({ teamId: team.id });
      const now = new Date();

      const recentDoc = await buildDocument({
        teamId: team.id,
        collectionId: collection.id,
        title: "test document recent",
        text: "test search term recent",
      });

      // Set date 2 months ago
      await buildDocument({
        teamId: team.id,
        collectionId: collection.id,
        title: "test document older",
        text: "test search term older",
        createdAt: subMonths(now, 2),
        updatedAt: subMonths(now, 2),
      });

      // Search with low boost factor
      const resultsLowBoost = await SearchHelper.searchForUser(user, {
        query: "test search term",
        searchConfig: {
          boostRecent: true,
          boostRecentMonths: 6,
          maxRecentBoost: 1.2,
        },
      });

      // Search with high boost factor
      const resultsHighBoost = await SearchHelper.searchForUser(user, {
        query: "test search term",
        searchConfig: {
          boostRecent: true,
          boostRecentMonths: 6,
          maxRecentBoost: 3.0,
        },
      });

      // Both searches should rank recent document higher
      expect(resultsLowBoost.results[0].document.id).toBe(recentDoc.id);
      expect(resultsHighBoost.results[0].document.id).toBe(recentDoc.id);

      // High boost should have greater difference in rankings
      const lowBoostRatio =
        resultsLowBoost.results[0].ranking / resultsLowBoost.results[1].ranking;
      const highBoostRatio =
        resultsHighBoost.results[0].ranking /
        resultsHighBoost.results[1].ranking;
      expect(highBoostRatio).toBeGreaterThan(lowBoostRatio);
    });
  });
});
