import { MentionType } from "@shared/types";
import Collection from "@server/models/Collection";
import Document from "@server/models/Document";
import { DocumentHelper } from "@server/models/helpers/DocumentHelper";
import { ProsemirrorHelper } from "@server/models/helpers/ProsemirrorHelper";
import Logger from "@server/logging/Logger";
import BaseProcessor from "@server/queues/processors/BaseProcessor";
import type {
  CollectionEvent,
  DocumentEvent,
  RevisionEvent,
  Event,
} from "@server/types";
import { Linear } from "../linear";
import SyncLinearBacklinksTask from "../tasks/SyncLinearBacklinksTask";

/**
 * Processor that creates backlink attachments on Linear issues when they are
 * mentioned in Outline documents or collection overviews, and removes them
 * when mentions are deleted.
 */
export default class LinearBacklinksProcessor extends BaseProcessor {
  static applicableEvents: Event["name"][] = [
    "documents.publish",
    "documents.update.debounced",
    "documents.delete",
    "documents.permanent_delete",
    "collections.update",
    "collections.delete",
  ];

  async perform(event: DocumentEvent | RevisionEvent | CollectionEvent) {
    switch (event.name) {
      case "documents.publish":
      case "documents.update.debounced":
        return this.handleDocumentUpdate(event);
      case "documents.delete":
      case "documents.permanent_delete":
        return this.handleDelete({
          documentId: event.documentId,
          teamId: "teamId" in event ? event.teamId : undefined,
        });
      case "collections.update":
        return this.handleCollectionUpdate(event as CollectionEvent);
      case "collections.delete":
        return this.handleDelete({
          collectionId: (event as CollectionEvent).collectionId,
          teamId: "teamId" in event ? event.teamId : undefined,
        });
      default:
    }
  }

  /**
   * Retrieves the Linear workspace key for a team's integration.
   *
   * @param teamId The team ID to find the integration for.
   * @returns The workspace key, or undefined if not available.
   */
  private async getWorkspaceKey(teamId: string): Promise<string | undefined> {
    const integration = await Linear.getIntegrationForTeam(teamId);
    if (!integration) {
      return undefined;
    }

    const workspaceKey = integration.settings.linear?.workspace.key;
    if (!workspaceKey) {
      Logger.warn("Linear integration has no workspace key configured", {
        integrationId: integration.id,
        teamId,
      });
      return undefined;
    }

    return workspaceKey;
  }

  /**
   * Extracts Linear issue identifiers from document mentions and dispatches
   * a sync task to create or remove backlink attachments on Linear.
   *
   * @param event The document event that triggered the processor.
   */
  private async handleDocumentUpdate(event: DocumentEvent | RevisionEvent) {
    const document = await Document.findByPk(event.documentId);
    if (!document || !document.publishedAt) {
      return;
    }

    const workspaceKey = await this.getWorkspaceKey(document.teamId);
    if (!workspaceKey) {
      return;
    }

    const identifiers = this.extractLinearIssueIdentifiers(
      document,
      workspaceKey
    );

    await new SyncLinearBacklinksTask().schedule({
      documentId: document.id,
      teamId: document.teamId,
      currentIssueIdentifiers: identifiers,
    });
  }

  /**
   * Extracts Linear issue identifiers from collection overview content and
   * dispatches a sync task to create or remove backlink attachments on Linear.
   *
   * @param event The collection event that triggered the processor.
   */
  private async handleCollectionUpdate(event: CollectionEvent) {
    const collection = await Collection.findByPk(event.collectionId);
    if (!collection) {
      return;
    }

    const workspaceKey = await this.getWorkspaceKey(collection.teamId);
    if (!workspaceKey) {
      return;
    }

    const identifiers = this.extractLinearIssueIdentifiers(
      collection,
      workspaceKey
    );

    await new SyncLinearBacklinksTask().schedule({
      collectionId: collection.id,
      teamId: collection.teamId,
      currentIssueIdentifiers: identifiers,
    });
  }

  /**
   * Dispatches a sync task with an empty identifier list, which causes
   * all existing backlink attachments for the entity to be removed.
   *
   * @param params The document or collection ID and team ID.
   */
  private async handleDelete(params: {
    documentId?: string;
    collectionId?: string;
    teamId?: string;
  }) {
    const { documentId, collectionId, teamId } = params;
    if (!teamId) {
      return;
    }

    const integration = await Linear.getIntegrationForTeam(teamId);
    if (!integration) {
      return;
    }

    await new SyncLinearBacklinksTask().schedule({
      documentId,
      collectionId,
      teamId,
      currentIssueIdentifiers: [],
    });
  }

  /**
   * Extracts Linear issue identifiers from a document or collection using
   * the polymorphic DocumentHelper.toProsemirror method.
   *
   * @param entity The document or collection to extract identifiers from.
   * @param workspaceKey The Linear workspace key to filter by.
   * @returns An array of unique Linear issue identifiers.
   */
  private extractLinearIssueIdentifiers(
    entity: Document | Collection,
    workspaceKey: string
  ): string[] {
    try {
      const node = DocumentHelper.toProsemirror(entity);
      const mentions = ProsemirrorHelper.parseMentions(node, {
        type: MentionType.Issue,
      });

      const identifiers: string[] = [];

      for (const mention of mentions) {
        if (!mention.href) {
          continue;
        }

        const parsed = Linear.parseUrl(mention.href);
        if (parsed && parsed.id && parsed.workspaceKey === workspaceKey) {
          identifiers.push(parsed.id);
        }
      }

      return [...new Set(identifiers)];
    } catch (err) {
      const isDocument = entity instanceof Document;
      Logger.warn(
        `Failed to extract Linear issue identifiers from ${isDocument ? "document" : "collection"}`,
        {
          ...(isDocument ? { documentId: entity.id } : { collectionId: entity.id }),
          error: err,
        }
      );
      return [];
    }
  }
}
