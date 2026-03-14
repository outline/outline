import type { LinearClient } from "@linear/sdk";
import env from "@server/env";
import Logger from "@server/logging/Logger";
import Collection from "@server/models/Collection";
import Document from "@server/models/Document";
import { BaseTask, TaskPriority } from "@server/queues/tasks/base/BaseTask";
import { Linear } from "../linear";

interface Props {
  /** The Outline document ID (mutually exclusive with collectionId). */
  documentId?: string;
  /** The Outline collection ID (mutually exclusive with documentId). */
  collectionId?: string;
  /** The team ID for finding the Linear integration. */
  teamId: string;
  /** Current Linear issue identifiers mentioned in the document/collection (e.g., ["ENG-456"]). */
  currentIssueIdentifiers: string[];
}

interface LinearAttachment {
  id: string;
  url: string;
  issue: {
    id: string;
    identifier: string;
  };
}

/** Subtitle used to identify attachments created by Outline. */
const OUTLINE_ATTACHMENT_SUBTITLE = "Outline";

/** Query parameter name used to identify Outline-created attachments. */
const OUTLINE_REF_PARAM = "ref";

/** Query parameter value used to identify Outline-created attachments. */
const OUTLINE_REF_VALUE = "outline-backlink";

/**
 * Builds the attachment URL with the Outline source identifier.
 *
 * @param baseUrl The base document/collection URL.
 * @returns URL with the source query parameter.
 * @throws If baseUrl is not a valid URL.
 */
function buildAttachmentUrl(baseUrl: string): string {
  try {
    const url = new URL(baseUrl);
    url.searchParams.set(OUTLINE_REF_PARAM, OUTLINE_REF_VALUE);
    return url.toString();
  } catch (err) {
    throw new Error(`Invalid attachment base URL: ${baseUrl}`);
  }
}

/**
 * Task that synchronizes backlink attachments on Linear issues. For each
 * document update, it compares the current set of Linear issue mentions
 * against existing attachments in Linear and creates or deletes as needed.
 */
export default class SyncLinearBacklinksTask extends BaseTask<Props> {
  public get options() {
    return {
      attempts: 3,
      priority: TaskPriority.Background,
      backoff: {
        type: "exponential" as const,
        delay: 30 * 1000,
      },
    };
  }

  public async perform({
    documentId,
    collectionId,
    teamId,
    currentIssueIdentifiers,
  }: Props) {
    const client = await Linear.getClientForTeam(teamId);
    if (!client) {
      return;
    }

    // Load either document or collection based on what ID was provided
    const { title, url: baseUrl } = await this.resolveTarget(
      documentId,
      collectionId
    );
    if (!baseUrl) {
      Logger.debug(
        "task",
        "Target not found, skipping Linear backlinks sync",
        { documentId, collectionId }
      );
      return;
    }

    // Build the full URL with Outline identifier for consistent matching
    const attachmentUrl = buildAttachmentUrl(baseUrl);

    // Query Linear for existing attachments linked to this URL
    const existingAttachments = await this.fetchAttachmentsForUrl(
      client,
      attachmentUrl
    );

    // Since we query with the full Outline URL (including ref parameter),
    // all returned attachments are Outline-created by definition
    const existingIdentifiers = new Set(
      existingAttachments.map((a) => a.issue.identifier)
    );
    const desiredIdentifiers = new Set(currentIssueIdentifiers);

    // Create attachments for newly added mentions
    const toCreate = currentIssueIdentifiers.filter(
      (id) => !existingIdentifiers.has(id)
    );
    // Delete attachments for removed mentions
    const toDelete = existingAttachments.filter(
      (a) => !desiredIdentifiers.has(a.issue.identifier)
    );

    const targetTitle = title || "Untitled";

    const operations = [
      ...toCreate.map((identifier) => ({
        type: "create" as const,
        identifier,
        promise: this.createAttachment(client, {
          issueIdentifier: identifier,
          title: targetTitle,
          url: attachmentUrl,
        }),
      })),
      ...toDelete.map((attachment) => ({
        type: "delete" as const,
        identifier: attachment.issue.identifier,
        promise: this.deleteAttachment(client, attachment.id),
      })),
    ];

    const results = await Promise.allSettled(
      operations.map((op) => op.promise)
    );

    let succeeded = 0;
    let failed = 0;

    for (let i = 0; i < results.length; i++) {
      if (results[i].status === "rejected") {
        failed++;
        const rejected = results[i] as PromiseRejectedResult;
        Logger.warn("Linear backlink sync operation failed", {
          documentId,
          collectionId,
          operation: operations[i].type,
          issueIdentifier: operations[i].identifier,
          error:
            rejected.reason instanceof Error
              ? rejected.reason.message
              : String(rejected.reason),
        });
      } else {
        succeeded++;
      }
    }

    if (operations.length > 0) {
      Logger.info("task", "Linear backlinks sync completed", {
        documentId,
        collectionId,
        created: toCreate.length,
        deleted: toDelete.length,
        succeeded,
        failed,
      });
    }
  }

  /**
   * Resolves either a document or collection ID to its title and URL.
   *
   * @param documentId The document ID (optional).
   * @param collectionId The collection ID (optional).
   * @returns An object with title and url, or empty strings if not found.
   */
  private async resolveTarget(
    documentId?: string,
    collectionId?: string
  ): Promise<{ title: string; url: string }> {
    if (documentId && collectionId) {
      Logger.warn(
        "Both documentId and collectionId provided to resolveTarget, using documentId",
        { documentId, collectionId }
      );
    }

    if (!env.URL) {
      Logger.warn(
        "env.URL is not configured, cannot construct attachment URL"
      );
      return { title: "", url: "" };
    }

    if (documentId) {
      const document = await Document.findByPk(documentId);
      if (!document?.path) {
        return { title: "", url: "" };
      }
      return {
        title: document.title || "Untitled",
        url: this.buildEntityUrl(document.path),
      };
    }

    if (collectionId) {
      const collection = await Collection.findByPk(collectionId);
      if (!collection?.path) {
        return { title: "", url: "" };
      }
      return {
        title: collection.name || "Untitled Collection",
        url: this.buildEntityUrl(collection.path),
      };
    }

    return { title: "", url: "" };
  }

  /**
   * Constructs a full URL for a document or collection path.
   *
   * @param path The entity path (e.g., "/doc/slug-abc123").
   * @returns The full URL including the base URL.
   */
  private buildEntityUrl(path: string): string {
    return `${env.URL}${path.startsWith("/") ? path : `/${path}`}`;
  }

  /**
   * Queries Linear for existing attachments linked to the given document URL.
   *
   * @param client The Linear SDK client.
   * @param url The Outline document URL to search for.
   * @returns An array of existing attachments.
   */
  private async fetchAttachmentsForUrl(
    client: LinearClient,
    url: string
  ): Promise<LinearAttachment[]> {
    try {
      const result = await client.attachmentsForURL(url);

      // Fetch all issues in parallel to avoid N+1 queries
      const issuePromises = result.nodes.map(async (attachment) => {
        const issue = await attachment.issue;
        return { attachment, issue };
      });
      const resolved = await Promise.all(issuePromises);

      return resolved
        .filter((r): r is typeof r & { issue: NonNullable<typeof r.issue> } =>
          r.issue !== undefined
        )
        .map((r) => ({
          id: r.attachment.id,
          url: r.attachment.url,
          issue: {
            id: r.issue.id,
            identifier: r.issue.identifier,
          },
        }));
    } catch (err) {
      Logger.warn("Failed to fetch Linear attachments for URL", {
        url,
        error: err,
      });
      return [];
    }
  }

  /**
   * Creates a backlink attachment on a Linear issue.
   *
   * @param client The Linear SDK client.
   * @param params The attachment parameters.
   */
  private async createAttachment(
    client: LinearClient,
    params: {
      issueIdentifier: string;
      title: string;
      url: string;
    }
  ) {
    // First resolve the issue identifier to get the issue ID
    const issue = await client.issue(params.issueIdentifier);
    if (!issue) {
      Logger.debug(
        "task",
        `Linear issue ${params.issueIdentifier} not found, skipping attachment`
      );
      return;
    }

    try {
      const result = await client.createAttachment({
        issueId: issue.id,
        title: params.title,
        subtitle: OUTLINE_ATTACHMENT_SUBTITLE,
        url: params.url,
        iconUrl: `${env.URL}/images/icon-192.png`,
      });

      if (!result.success) {
        throw new Error(
          `Linear attachmentCreate returned success=false for issue ${params.issueIdentifier}`
        );
      }
    } catch (err) {
      // Check for permission errors (need re-auth with write scope)
      const message = err instanceof Error ? err.message : String(err);
      if (message.includes("Forbidden") || message.includes("403")) {
        Logger.warn(
          "Linear integration lacks write permission for attachments. " +
            "Please re-authorize the Linear integration with updated scopes.",
          { issueIdentifier: params.issueIdentifier }
        );
        return;
      }
      throw err;
    }
  }

  /**
   * Deletes a backlink attachment from Linear.
   *
   * @param client The Linear SDK client.
   * @param attachmentId The Linear attachment ID to delete.
   */
  private async deleteAttachment(client: LinearClient, attachmentId: string) {
    try {
      const result = await client.deleteAttachment(attachmentId);

      if (!result.success) {
        throw new Error(
          `Linear attachmentDelete returned success=false for attachment ${attachmentId}`
        );
      }
    } catch (err) {
      // Ignore 404 - attachment already deleted
      const message = err instanceof Error ? err.message : String(err);
      if (message.includes("Not found") || message.includes("404")) {
        return;
      }
      throw err;
    }
  }
}
