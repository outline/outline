import { DocumentPermission, StatusFilter } from "@shared/types";
import SearchHelper from "@server/models/helpers/SearchHelper";
import {
  buildDocument,
  buildDraftDocument,
  buildCollection,
  buildTeam,
  buildUser,
  buildShare,
} from "@server/test/factories";
import UserMembership from "../UserMembership";

beforeEach(async () => {
  jest.resetAllMocks();
  await buildDocument();
});

describe("SearchHelper", () => {
  describe("#searchForTeam", () => {
    test("should return search results from public collections", async () => {
      const team = await buildTeam();
      const collection = await buildCollection({
        teamId: team.id,
      });
      const document = await buildDocument({
        teamId: team.id,
        collectionId: collection.id,
        title: "test",
      });
      const { results } = await SearchHelper.searchForTeam(team, "test");
      expect(results.length).toBe(1);
      expect(results[0].document?.id).toBe(document.id);
    });

    test("should not return results from private collections without providing collectionId", async () => {
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
      const { results } = await SearchHelper.searchForTeam(team, "test");
      expect(results.length).toBe(0);
    });

    test("should return results from private collections when collectionId is provided", async () => {
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
      const { results } = await SearchHelper.searchForTeam(team, "test", {
        collectionId: collection.id,
      });
      expect(results.length).toBe(1);
    });

    test("should return results from document tree of shared document", async () => {
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

      const { results } = await SearchHelper.searchForTeam(team, "test", {
        collectionId: collection.id,
        share,
      });
      expect(results.length).toBe(1);
    });

    test("should handle no collections", async () => {
      const team = await buildTeam();
      const { results } = await SearchHelper.searchForTeam(team, "test");
      expect(results.length).toBe(0);
    });

    test("should handle backslashes in search term", async () => {
      const team = await buildTeam();
      const { results } = await SearchHelper.searchForTeam(team, "\\\\");
      expect(results.length).toBe(0);
    });

    test("should return the total count of search results", async () => {
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
      const { totalCount } = await SearchHelper.searchForTeam(team, "test");
      expect(totalCount).toBe(2);
    });

    test("should return the document when searched with their previous titles", async () => {
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
      const { totalCount } = await SearchHelper.searchForTeam(
        team,
        "test number"
      );
      expect(totalCount).toBe(1);
    });

    test("should not return the document when searched with neither the titles nor the previous titles", async () => {
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
      const { totalCount } = await SearchHelper.searchForTeam(
        team,
        "title doesn't exist"
      );
      expect(totalCount).toBe(0);
    });
  });

  describe("#searchForUser", () => {
    test("should return search results from collections", async () => {
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
      const { results } = await SearchHelper.searchForUser(user, "test");
      expect(results.length).toBe(1);
      expect(results[0].ranking).toBeTruthy();
      expect(results[0].document?.id).toBe(document.id);
    });

    test("should handle no collections", async () => {
      const team = await buildTeam();
      const user = await buildUser({ teamId: team.id });
      const { results } = await SearchHelper.searchForUser(user, "test");
      expect(results.length).toBe(0);
    });

    test("should search only drafts created by user", async () => {
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
      const { results } = await SearchHelper.searchForUser(user, "test", {
        statusFilter: [StatusFilter.Draft],
      });
      expect(results.length).toBe(1);
    });

    test("should not include drafts with user read permission", async () => {
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

      const { results } = await SearchHelper.searchForUser(user, "test", {
        statusFilter: [StatusFilter.Published, StatusFilter.Archived],
      });
      expect(results.length).toBe(0);
    });

    test("should search only published created by user", async () => {
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
      const { results } = await SearchHelper.searchForUser(user, "test", {
        statusFilter: [StatusFilter.Published],
      });
      expect(results.length).toBe(1);
    });

    test("should search only archived documents created by user", async () => {
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
      const { results } = await SearchHelper.searchForUser(user, "test", {
        statusFilter: [StatusFilter.Archived],
      });
      expect(results.length).toBe(1);
    });

    test("should return results from archived and published", async () => {
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
      const { results } = await SearchHelper.searchForUser(user, "test", {
        statusFilter: [StatusFilter.Archived, StatusFilter.Published],
      });
      expect(results.length).toBe(2);
    });

    test("should return results from drafts and published", async () => {
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
      const { results } = await SearchHelper.searchForUser(user, "draft", {
        statusFilter: [StatusFilter.Published, StatusFilter.Draft],
      });
      expect(results.length).toBe(2);
    });

    test("should include results from drafts and archived", async () => {
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
      const { results } = await SearchHelper.searchForUser(user, "draft", {
        statusFilter: [StatusFilter.Draft, StatusFilter.Archived],
      });
      expect(results.length).toBe(2);
    });

    test("should return the total count of search results", async () => {
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
      const { totalCount } = await SearchHelper.searchForUser(user, "test");
      expect(totalCount).toBe(2);
    });

    test("should return the document when searched with their previous titles", async () => {
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
      const { totalCount } = await SearchHelper.searchForUser(
        user,
        "test number"
      );
      expect(totalCount).toBe(1);
    });

    test("should not return the document when searched with neither the titles nor the previous titles", async () => {
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
      const { totalCount } = await SearchHelper.searchForUser(
        user,
        "title doesn't exist"
      );
      expect(totalCount).toBe(0);
    });

    test("should find exact phrases", async () => {
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
      const { totalCount } = await SearchHelper.searchForUser(
        user,
        `"test number"`
      );
      expect(totalCount).toBe(1);
    });

    test("should correctly handle removal of trailing spaces", async () => {
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
      const { totalCount } = await SearchHelper.searchForUser(user, "env: ");
      expect(totalCount).toBe(1);
    });
  });

  describe("#searchTitlesForUser", () => {
    test("should return search results from collections", async () => {
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
      const documents = await SearchHelper.searchTitlesForUser(user, "test");
      expect(documents.length).toBe(1);
      expect(documents[0]?.id).toBe(document.id);
    });

    test("should filter to specific collection", async () => {
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
      const documents = await SearchHelper.searchTitlesForUser(user, "test", {
        collectionId: collection.id,
      });
      expect(documents.length).toBe(1);
      expect(documents[0]?.id).toBe(document.id);
    });

    test("should handle no collections", async () => {
      const team = await buildTeam();
      const user = await buildUser({ teamId: team.id });
      const documents = await SearchHelper.searchTitlesForUser(user, "test");
      expect(documents.length).toBe(0);
    });

    test("should search only drafts created by user", async () => {
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
      const documents = await SearchHelper.searchTitlesForUser(user, "test", {
        statusFilter: [StatusFilter.Draft],
      });
      expect(documents.length).toBe(1);
    });

    test("should search only published created by user", async () => {
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
      const documents = await SearchHelper.searchTitlesForUser(user, "test", {
        statusFilter: [StatusFilter.Published],
      });
      expect(documents.length).toBe(1);
    });

    test("should search only archived documents created by user", async () => {
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
      const documents = await SearchHelper.searchTitlesForUser(user, "test", {
        statusFilter: [StatusFilter.Archived],
      });
      expect(documents.length).toBe(1);
    });

    test("should return results from archived and published", async () => {
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
      const documents = await SearchHelper.searchTitlesForUser(user, "test", {
        statusFilter: [StatusFilter.Archived, StatusFilter.Published],
      });
      expect(documents.length).toBe(2);
    });

    test("should return results from drafts and published", async () => {
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
      const documents = await SearchHelper.searchTitlesForUser(user, "draft", {
        statusFilter: [StatusFilter.Published, StatusFilter.Draft],
      });
      expect(documents.length).toBe(2);
    });

    test("should include results from drafts and archived", async () => {
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
      const documents = await SearchHelper.searchTitlesForUser(user, "draft", {
        statusFilter: [StatusFilter.Draft, StatusFilter.Archived],
      });
      expect(documents.length).toBe(2);
    });
  });

  describe("webSearchQuery", () => {
    test("should correctly sanitize query", () => {
      expect(SearchHelper.webSearchQuery("one/two")).toBe("one/two:*");
      expect(SearchHelper.webSearchQuery("one\\two")).toBe("one\\\\two:*");
      expect(SearchHelper.webSearchQuery("test''")).toBe("test");
    });
    test("should wildcard unquoted queries", () => {
      expect(SearchHelper.webSearchQuery("test")).toBe("test:*");
      expect(SearchHelper.webSearchQuery("'")).toBe("");
      expect(SearchHelper.webSearchQuery("'quoted'")).toBe(`"quoted":*`);
    });
    test("should wildcard multi-word queries", () => {
      expect(SearchHelper.webSearchQuery("this is a test")).toBe(
        "this&is&a&test:*"
      );
    });
    test("should now wildcard quoted queries", () => {
      expect(SearchHelper.webSearchQuery(`"this is a test"`)).toBe(
        `"this<->is<->a<->test"`
      );
    });
  });
});
