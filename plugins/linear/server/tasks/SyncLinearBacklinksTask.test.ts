import { v4 as uuidv4 } from "uuid";
import fetchMock from "jest-fetch-mock";
import {
  IntegrationService,
  type IntegrationSettings,
  IntegrationType,
} from "@shared/types";
import {
  buildDocument,
  buildIntegration,
  buildTeam,
  buildUser,
} from "@server/test/factories";
import SyncLinearBacklinksTask from "./SyncLinearBacklinksTask";

beforeEach(() => {
  jest.resetAllMocks();
  fetchMock.resetMocks();
  fetchMock.doMock();
});

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

/**
 * Returns a mock Linear GraphQL response body.
 *
 * @param data The data payload to include in the response.
 * @returns A JSON string representing the GraphQL response.
 */
function graphqlResponse(data: Record<string, unknown>) {
  return JSON.stringify({ data });
}

/**
 * Returns a mock attachmentsForURL response with the given attachments.
 *
 * @param attachments Array of attachment objects to return.
 * @returns A JSON string representing the GraphQL response.
 */
function attachmentsForUrlResponse(
  attachments: Array<{
    id: string;
    url: string;
    issue: { id: string; identifier: string };
  }>
) {
  return graphqlResponse({
    attachmentsForURL: { nodes: attachments },
  });
}

describe("SyncLinearBacklinksTask", () => {
  it("should create attachments for new issue mentions", async () => {
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

    // Mock responses in order:
    // 1. attachmentsForURL → empty (no existing attachments)
    // 2. issue(id: "ENG-456") → resolve to UUID
    // 3. attachmentCreate → success
    fetchMock
      .mockResponseOnce(attachmentsForUrlResponse([]))
      .mockResponseOnce(
        graphqlResponse({ issue: { id: "linear-issue-uuid-456" } })
      )
      .mockResponseOnce(
        graphqlResponse({
          attachmentCreate: {
            success: true,
            attachment: { id: "attachment-uuid-1" },
          },
        })
      );

    const task = new SyncLinearBacklinksTask();
    await task.perform({
      documentId: document.id,
      teamId: team.id,
      currentIssueIdentifiers: ["ENG-456"],
    });

    expect(fetchMock).toHaveBeenCalledTimes(3);

    // Verify attachmentsForURL query
    const firstCall = JSON.parse(fetchMock.mock.calls[0]![1]!.body!.toString());
    expect(firstCall.query).toContain("attachmentsForURL");

    // Verify issue resolution
    const secondCall = JSON.parse(
      fetchMock.mock.calls[1]![1]!.body!.toString()
    );
    expect(secondCall.query).toContain("issue");
    expect(secondCall.variables.id).toBe("ENG-456");

    // Verify attachmentCreate
    const thirdCall = JSON.parse(
      fetchMock.mock.calls[2]![1]!.body!.toString()
    );
    expect(thirdCall.query).toContain("attachmentCreate");
    expect(thirdCall.variables.input.issueId).toBe("linear-issue-uuid-456");
    expect(thirdCall.variables.input.title).toBe(document.title);
    expect(thirdCall.variables.input.subtitle).toBe("Outline");
  });

  it("should delete attachments for removed mentions", async () => {
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

    // Mock: existing attachment for ENG-456, but no current mentions
    fetchMock
      .mockResponseOnce(
        attachmentsForUrlResponse([
          {
            id: "attachment-to-delete",
            url: `https://app.outline.dev${document.path}`,
            issue: { id: "issue-uuid", identifier: "ENG-456" },
          },
        ])
      )
      .mockResponseOnce(
        graphqlResponse({ attachmentDelete: { success: true } })
      );

    const task = new SyncLinearBacklinksTask();
    await task.perform({
      documentId: document.id,
      teamId: team.id,
      currentIssueIdentifiers: [],
    });

    expect(fetchMock).toHaveBeenCalledTimes(2);

    // Verify attachmentDelete
    const deleteCall = JSON.parse(
      fetchMock.mock.calls[1]![1]!.body!.toString()
    );
    expect(deleteCall.query).toContain("attachmentDelete");
    expect(deleteCall.variables.id).toBe("attachment-to-delete");
  });

  it("should skip already existing attachments", async () => {
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

    // Mock: ENG-456 already exists as attachment, and it's still mentioned
    fetchMock.mockResponseOnce(
      attachmentsForUrlResponse([
        {
          id: "existing-attachment",
          url: `https://app.outline.dev${document.path}`,
          issue: { id: "issue-uuid", identifier: "ENG-456" },
        },
      ])
    );

    const task = new SyncLinearBacklinksTask();
    await task.perform({
      documentId: document.id,
      teamId: team.id,
      currentIssueIdentifiers: ["ENG-456"],
    });

    // Only the attachmentsForURL call, no create or delete
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("should handle missing document gracefully", async () => {
    const team = await buildTeam();
    await buildIntegration({
      teamId: team.id,
      service: IntegrationService.Linear,
      type: IntegrationType.Embed,
      settings: buildLinearSettings("myteam"),
    });

    const task = new SyncLinearBacklinksTask();
    await task.perform({
      documentId: "non-existent-id",
      teamId: team.id,
      currentIssueIdentifiers: [],
    });

    // No API calls since document not found
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("should handle no Linear integration gracefully", async () => {
    const team = await buildTeam();
    const user = await buildUser({ teamId: team.id });
    const document = await buildDocument({
      teamId: team.id,
      userId: user.id,
    });

    const task = new SyncLinearBacklinksTask();
    await task.perform({
      documentId: document.id,
      teamId: team.id,
      currentIssueIdentifiers: ["ENG-456"],
    });

    // No API calls since no integration
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("should handle 403 from Linear gracefully", async () => {
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

    fetchMock
      .mockResponseOnce(attachmentsForUrlResponse([]))
      .mockResponseOnce(
        graphqlResponse({ issue: { id: "linear-issue-uuid" } })
      )
      .mockResponseOnce("Forbidden", { status: 403 });

    const task = new SyncLinearBacklinksTask();

    // Should not throw despite 403
    await expect(
      task.perform({
        documentId: document.id,
        teamId: team.id,
        currentIssueIdentifiers: ["ENG-456"],
      })
    ).resolves.not.toThrow();
  });

  it("should handle issue not found gracefully", async () => {
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

    fetchMock
      .mockResponseOnce(attachmentsForUrlResponse([]))
      .mockResponseOnce(
        JSON.stringify({
          data: null,
          errors: [{ message: "Not found", extensions: { code: "NOT_FOUND" } }],
        })
      );

    const task = new SyncLinearBacklinksTask();

    // Should not throw — issue resolution failure is handled
    await expect(
      task.perform({
        documentId: document.id,
        teamId: team.id,
        currentIssueIdentifiers: ["NONEXISTENT-999"],
      })
    ).resolves.not.toThrow();
  });
});
