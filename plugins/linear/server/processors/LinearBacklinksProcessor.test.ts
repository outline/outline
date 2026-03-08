import { v4 as uuidv4 } from "uuid";
import {
  IntegrationService,
  type IntegrationSettings,
  IntegrationType,
} from "@shared/types";
import {
  buildCollection,
  buildDocument,
  buildIntegration,
  buildTeam,
  buildUser,
} from "@server/test/factories";
import type { CollectionEvent, DocumentEvent } from "@server/types";
import SyncLinearBacklinksTask from "../tasks/SyncLinearBacklinksTask";
import LinearBacklinksProcessor from "./LinearBacklinksProcessor";

jest.mock("../tasks/SyncLinearBacklinksTask");

const ip = "127.0.0.1";

/**
 * Builds Linear integration settings with required workspace fields.
 *
 * @param workspaceKey The workspace key (e.g., "myteam").
 * @param workspaceName The workspace display name.
 * @returns Settings object typed for Linear embed integration.
 */
function buildLinearSettings(
  workspaceKey: string,
  workspaceName = "My Team"
): IntegrationSettings<IntegrationType.Embed> {
  return {
    linear: {
      workspace: {
        id: uuidv4(),
        key: workspaceKey,
        name: workspaceName,
      },
    },
  };
}

beforeEach(() => {
  jest.resetAllMocks();
});

/**
 * Builds markdown text containing a Linear issue mention node.
 *
 * @param issueUrl The Linear issue URL.
 * @param label The display label for the mention.
 * @returns ProsemirrorData content array with a mention node.
 */
function buildLinearMentionContent(
  issueUrl: string,
  label = "ENG-456"
) {
  return {
    type: "doc",
    content: [
      {
        type: "paragraph",
        content: [
          {
            type: "text",
            text: "Relates to ",
          },
          {
            type: "mention",
            attrs: {
              id: uuidv4(),
              type: "issue",
              label,
              modelId: uuidv4(),
              actorId: undefined,
              href: issueUrl,
            },
          },
        ],
      },
    ],
  };
}

describe("LinearBacklinksProcessor", () => {
  describe("documents.publish", () => {
    it("should dispatch sync task with issue identifiers", async () => {
      const team = await buildTeam();
      const user = await buildUser({ teamId: team.id });

      await buildIntegration({
        teamId: team.id,
        service: IntegrationService.Linear,
        type: IntegrationType.Embed,
        settings: buildLinearSettings("myteam"),
      });

      const content = buildLinearMentionContent(
        "https://linear.app/myteam/issue/ENG-456/some-title"
      );
      const document = await buildDocument({
        teamId: team.id,
        userId: user.id,
        content,
        text: "Relates to ENG-456",
      });

      const processor = new LinearBacklinksProcessor();
      await processor.perform({
        name: "documents.publish",
        documentId: document.id,
        collectionId: document.collectionId!,
        teamId: team.id,
        actorId: user.id,
        ip,
      } as DocumentEvent);

      expect(
        jest.mocked(SyncLinearBacklinksTask.prototype.schedule)
      ).toHaveBeenCalledWith({
        documentId: document.id,
        teamId: team.id,
        currentIssueIdentifiers: ["ENG-456"],
      });
    });

    it("should extract multiple unique issue identifiers", async () => {
      const team = await buildTeam();
      const user = await buildUser({ teamId: team.id });

      await buildIntegration({
        teamId: team.id,
        service: IntegrationService.Linear,
        type: IntegrationType.Embed,
        settings: buildLinearSettings("myteam"),
      });

      const content = {
        type: "doc",
        content: [
          {
            type: "paragraph",
            content: [
              {
                type: "mention",
                attrs: {
                  id: uuidv4(),
                  type: "issue",
                  label: "ENG-100",
                  modelId: uuidv4(),
                  actorId: undefined,
                  href: "https://linear.app/myteam/issue/ENG-100/title",
                },
              },
              { type: "text", text: " and " },
              {
                type: "mention",
                attrs: {
                  id: uuidv4(),
                  type: "issue",
                  label: "ENG-200",
                  modelId: uuidv4(),
                  actorId: undefined,
                  href: "https://linear.app/myteam/issue/ENG-200/title",
                },
              },
            ],
          },
        ],
      };

      const document = await buildDocument({
        teamId: team.id,
        userId: user.id,
        content,
        text: "ENG-100 and ENG-200",
      });

      const processor = new LinearBacklinksProcessor();
      await processor.perform({
        name: "documents.publish",
        documentId: document.id,
        collectionId: document.collectionId!,
        teamId: team.id,
        actorId: user.id,
        ip,
      } as DocumentEvent);

      const scheduledArgs = jest.mocked(
        SyncLinearBacklinksTask.prototype.schedule
      ).mock.calls[0][0];

      expect(scheduledArgs.currentIssueIdentifiers).toHaveLength(2);
      expect(scheduledArgs.currentIssueIdentifiers).toContain("ENG-100");
      expect(scheduledArgs.currentIssueIdentifiers).toContain("ENG-200");
    });

    it("should exclude mentions from other workspaces", async () => {
      const team = await buildTeam();
      const user = await buildUser({ teamId: team.id });

      await buildIntegration({
        teamId: team.id,
        service: IntegrationService.Linear,
        type: IntegrationType.Embed,
        settings: buildLinearSettings("myteam"),
      });

      const content = {
        type: "doc",
        content: [
          {
            type: "paragraph",
            content: [
              {
                type: "mention",
                attrs: {
                  id: uuidv4(),
                  type: "issue",
                  label: "ENG-100",
                  modelId: uuidv4(),
                  actorId: undefined,
                  href: "https://linear.app/myteam/issue/ENG-100/title",
                },
              },
              { type: "text", text: " and " },
              {
                type: "mention",
                attrs: {
                  id: uuidv4(),
                  type: "issue",
                  label: "OTHER-200",
                  modelId: uuidv4(),
                  actorId: undefined,
                  href: "https://linear.app/otherteam/issue/OTHER-200/title",
                },
              },
            ],
          },
        ],
      };

      const document = await buildDocument({
        teamId: team.id,
        userId: user.id,
        content,
        text: "ENG-100 and OTHER-200",
      });

      const processor = new LinearBacklinksProcessor();
      await processor.perform({
        name: "documents.publish",
        documentId: document.id,
        collectionId: document.collectionId!,
        teamId: team.id,
        actorId: user.id,
        ip,
      } as DocumentEvent);

      const scheduledArgs = jest.mocked(
        SyncLinearBacklinksTask.prototype.schedule
      ).mock.calls[0][0];

      expect(scheduledArgs.currentIssueIdentifiers).toEqual(["ENG-100"]);
    });

    it("should not dispatch task if no Linear integration exists", async () => {
      const team = await buildTeam();
      const user = await buildUser({ teamId: team.id });

      const content = buildLinearMentionContent(
        "https://linear.app/myteam/issue/ENG-456/title"
      );
      const document = await buildDocument({
        teamId: team.id,
        userId: user.id,
        content,
        text: "ENG-456",
      });

      const processor = new LinearBacklinksProcessor();
      await processor.perform({
        name: "documents.publish",
        documentId: document.id,
        collectionId: document.collectionId!,
        teamId: team.id,
        actorId: user.id,
        ip,
      } as DocumentEvent);

      expect(
        jest.mocked(SyncLinearBacklinksTask.prototype.schedule)
      ).not.toHaveBeenCalled();
    });

    it("should not dispatch task for unpublished documents", async () => {
      const team = await buildTeam();
      const user = await buildUser({ teamId: team.id });

      await buildIntegration({
        teamId: team.id,
        service: IntegrationService.Linear,
        type: IntegrationType.Embed,
        settings: buildLinearSettings("myteam"),
      });

      const content = buildLinearMentionContent(
        "https://linear.app/myteam/issue/ENG-456/title"
      );
      const document = await buildDocument({
        teamId: team.id,
        userId: user.id,
        content,
        text: "ENG-456",
        collectionId: null,
      });

      const processor = new LinearBacklinksProcessor();
      await processor.perform({
        name: "documents.publish",
        documentId: document.id,
        collectionId: "",
        teamId: team.id,
        actorId: user.id,
        ip,
      } as DocumentEvent);

      expect(
        jest.mocked(SyncLinearBacklinksTask.prototype.schedule)
      ).not.toHaveBeenCalled();
    });
  });

  describe("documents.delete", () => {
    it("should dispatch sync task with empty identifiers", async () => {
      const team = await buildTeam();
      const user = await buildUser({ teamId: team.id });

      await buildIntegration({
        teamId: team.id,
        service: IntegrationService.Linear,
        type: IntegrationType.Embed,
        settings: buildLinearSettings("myteam"),
      });

      const document = await buildDocument({
        teamId: team.id,
        userId: user.id,
      });

      const processor = new LinearBacklinksProcessor();
      await processor.perform({
        name: "documents.delete",
        documentId: document.id,
        collectionId: document.collectionId!,
        teamId: team.id,
        actorId: user.id,
        ip,
      } as DocumentEvent);

      expect(
        jest.mocked(SyncLinearBacklinksTask.prototype.schedule)
      ).toHaveBeenCalledWith({
        documentId: document.id,
        teamId: team.id,
        currentIssueIdentifiers: [],
      });
    });
  });

  describe("documents.update.debounced", () => {
    it("should dispatch sync task with current identifiers", async () => {
      const team = await buildTeam();
      const user = await buildUser({ teamId: team.id });

      await buildIntegration({
        teamId: team.id,
        service: IntegrationService.Linear,
        type: IntegrationType.Embed,
        settings: buildLinearSettings("myteam"),
      });

      const content = buildLinearMentionContent(
        "https://linear.app/myteam/issue/ENG-789/title",
        "ENG-789"
      );
      const document = await buildDocument({
        teamId: team.id,
        userId: user.id,
        content,
        text: "ENG-789",
      });

      const processor = new LinearBacklinksProcessor();
      await processor.perform({
        name: "documents.update.debounced",
        documentId: document.id,
        collectionId: document.collectionId!,
        teamId: team.id,
        actorId: user.id,
        createdAt: new Date().toISOString(),
        ip,
      } as DocumentEvent);

      expect(
        jest.mocked(SyncLinearBacklinksTask.prototype.schedule)
      ).toHaveBeenCalledWith({
        documentId: document.id,
        teamId: team.id,
        currentIssueIdentifiers: ["ENG-789"],
      });
    });
  });

  describe("collections.update", () => {
    it("should dispatch sync task with issue identifiers from collection overview", async () => {
      const team = await buildTeam();
      const user = await buildUser({ teamId: team.id });

      await buildIntegration({
        teamId: team.id,
        service: IntegrationService.Linear,
        type: IntegrationType.Embed,
        settings: buildLinearSettings("myteam"),
      });

      const content = buildLinearMentionContent(
        "https://linear.app/myteam/issue/ENG-456/some-title"
      );
      const collection = await buildCollection({
        teamId: team.id,
        userId: user.id,
        content,
      });

      const processor = new LinearBacklinksProcessor();
      await processor.perform({
        name: "collections.update",
        collectionId: collection.id,
        teamId: team.id,
        actorId: user.id,
        ip,
      } as CollectionEvent);

      expect(
        jest.mocked(SyncLinearBacklinksTask.prototype.schedule)
      ).toHaveBeenCalledWith({
        collectionId: collection.id,
        teamId: collection.teamId,
        currentIssueIdentifiers: ["ENG-456"],
      });
    });

    it("should dispatch empty identifiers for collection without mentions", async () => {
      const team = await buildTeam();
      const user = await buildUser({ teamId: team.id });

      await buildIntegration({
        teamId: team.id,
        service: IntegrationService.Linear,
        type: IntegrationType.Embed,
        settings: buildLinearSettings("myteam"),
      });

      const collection = await buildCollection({
        teamId: team.id,
        userId: user.id,
        content: { type: "doc", content: [] },
      });

      const processor = new LinearBacklinksProcessor();
      await processor.perform({
        name: "collections.update",
        collectionId: collection.id,
        teamId: team.id,
        actorId: user.id,
        ip,
      } as CollectionEvent);

      expect(
        jest.mocked(SyncLinearBacklinksTask.prototype.schedule)
      ).toHaveBeenCalledWith({
        collectionId: collection.id,
        teamId: collection.teamId,
        currentIssueIdentifiers: [],
      });
    });

    it("should not dispatch task if no Linear integration exists", async () => {
      const team = await buildTeam();
      const user = await buildUser({ teamId: team.id });

      const content = buildLinearMentionContent(
        "https://linear.app/myteam/issue/ENG-456/title"
      );
      const collection = await buildCollection({
        teamId: team.id,
        userId: user.id,
        content,
      });

      const processor = new LinearBacklinksProcessor();
      await processor.perform({
        name: "collections.update",
        collectionId: collection.id,
        teamId: team.id,
        actorId: user.id,
        ip,
      } as CollectionEvent);

      expect(
        jest.mocked(SyncLinearBacklinksTask.prototype.schedule)
      ).not.toHaveBeenCalled();
    });
  });

  describe("collections.delete", () => {
    it("should dispatch sync task with empty identifiers", async () => {
      const team = await buildTeam();
      const user = await buildUser({ teamId: team.id });

      await buildIntegration({
        teamId: team.id,
        service: IntegrationService.Linear,
        type: IntegrationType.Embed,
        settings: buildLinearSettings("myteam"),
      });

      const collection = await buildCollection({
        teamId: team.id,
        userId: user.id,
      });

      const processor = new LinearBacklinksProcessor();
      await processor.perform({
        name: "collections.delete",
        collectionId: collection.id,
        teamId: team.id,
        actorId: user.id,
        ip,
      } as CollectionEvent);

      expect(
        jest.mocked(SyncLinearBacklinksTask.prototype.schedule)
      ).toHaveBeenCalledWith({
        collectionId: collection.id,
        teamId: team.id,
        currentIssueIdentifiers: [],
      });
    });
  });
});
