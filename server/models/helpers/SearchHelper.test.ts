import { describe, expect } from "@jest/globals";
import { subMonths } from "date-fns";
import {
  buildTeam,
  buildUser,
  buildCollection,
  buildDocument,
} from "@server/test/factories";
import SearchHelper from "./SearchHelper";

describe("SearchHelper", () => {
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
