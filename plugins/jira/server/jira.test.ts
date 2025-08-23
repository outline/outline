import { Jira } from "./jira";
import { UnfurlResourceType } from "@shared/types";

describe("Jira", () => {
  beforeEach(() => {
    // Reset the client before each test
    (Jira as any).client = undefined;
  });

  describe("parseUrl", () => {
    it("should parse browse URLs correctly", () => {
      const url = "https://mycompany.atlassian.net/browse/PROJ-123";
      const result = Jira.parseUrl(url);

      expect(result).toEqual({
        type: UnfurlResourceType.Issue,
        issueKey: "PROJ-123",
      });
    });

    it("should parse project issue URLs correctly", () => {
      const url =
        "https://mycompany.atlassian.net/projects/PROJ/issues/PROJ-456";
      const result = Jira.parseUrl(url);

      expect(result).toEqual({
        type: UnfurlResourceType.Issue,
        issueKey: "PROJ-456",
      });
    });

    it("should return null for invalid URLs", () => {
      const url = "https://example.com/not-a-jira-url";
      const result = Jira.parseUrl(url);

      expect(result).toBeNull();
    });

    it("should handle URLs with different domains", () => {
      const url = "https://different-domain.atlassian.net/browse/TEST-789";
      const result = Jira.parseUrl(url);

      expect(result).toEqual({
        type: UnfurlResourceType.Issue,
        issueKey: "TEST-789",
      });
    });
  });

  describe("getColorForStatus", () => {
    it("should return correct colors for known statuses", () => {
      expect((Jira as any).getColorForStatus("green")).toBe("#28a745");
      expect((Jira as any).getColorForStatus("red")).toBe("#dc3545");
      expect((Jira as any).getColorForStatus("yellow")).toBe("#ffc107");
      expect((Jira as any).getColorForStatus("blue")).toBe("#007bff");
    });

    it("should return default color for unknown statuses", () => {
      expect((Jira as any).getColorForStatus("unknown")).toBe("#6c757d");
    });
  });

  describe("getPriorityColor", () => {
    it("should return correct colors for known priorities", () => {
      expect((Jira as any).getPriorityColor("Highest")).toBe("#dc3545");
      expect((Jira as any).getPriorityColor("High")).toBe("#fd7e14");
      expect((Jira as any).getPriorityColor("Medium")).toBe("#ffc107");
      expect((Jira as any).getPriorityColor("Low")).toBe("#28a745");
      expect((Jira as any).getPriorityColor("Lowest")).toBe("#6c757d");
    });

    it("should return default color for unknown priorities", () => {
      expect((Jira as any).getPriorityColor("Unknown")).toBe("#6c757d");
    });
  });

  describe("getPriorityIconUrl", () => {
    it("should return undefined when JIRA_URL is not configured", async () => {
      const result = await (Jira as any).getPriorityIconUrl("High");
      expect(result).toBeUndefined();
    });
  });
});
