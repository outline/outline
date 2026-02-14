import { SearchableModel } from "@shared/types";
import { Document, Collection, Comment } from "@server/models";
import BaseProcessor from "@server/queues/processors/BaseProcessor";
import type {
  DocumentEvent,
  DocumentMovedEvent,
  CollectionEvent,
  CommentEvent,
  CommentUpdateEvent,
  Event,
} from "@server/types";
import SearchProviderManager from "@server/utils/SearchProviderManager";

/**
 * Processor that keeps the search index in sync with data changes.
 * For PostgreSQL this is largely a no-op since tsvector triggers handle
 * indexing, but external providers (Elasticsearch, etc.) rely on these
 * events to maintain their indexes.
 */
export default class SearchIndexProcessor extends BaseProcessor {
  static applicableEvents: Event["name"][] = [
    "documents.publish",
    "documents.update.delayed",
    "documents.archive",
    "documents.unarchive",
    "documents.delete",
    "documents.permanent_delete",
    "documents.move",
    "collections.create",
    "collections.update",
    "collections.delete",
    "comments.create",
    "comments.update",
    "comments.delete",
  ];

  async perform(
    event: DocumentEvent | DocumentMovedEvent | CollectionEvent | CommentEvent
  ): Promise<void> {
    const provider = SearchProviderManager.getProvider();

    switch (event.name) {
      case "documents.publish":
      case "documents.update.delayed":
      case "documents.unarchive": {
        const document = await Document.findByPk(
          (event as DocumentEvent).documentId
        );
        if (document) {
          await provider.index(SearchableModel.Document, document);
        }
        break;
      }

      case "documents.archive":
      case "documents.delete": {
        const document = await Document.findByPk(
          (event as DocumentEvent).documentId,
          { paranoid: false }
        );
        if (document) {
          await provider.updateMetadata(
            SearchableModel.Document,
            document.id,
            {
              archivedAt: document.archivedAt,
              deletedAt: document.deletedAt,
            }
          );
        }
        break;
      }

      case "documents.permanent_delete": {
        await provider.remove(
          SearchableModel.Document,
          (event as DocumentEvent).documentId,
          event.teamId
        );
        break;
      }

      case "documents.move": {
        const movedEvent = event as DocumentMovedEvent;
        for (const documentId of movedEvent.data.documentIds) {
          await provider.updateMetadata(
            SearchableModel.Document,
            documentId,
            { collectionId: movedEvent.collectionId }
          );
        }
        break;
      }

      case "collections.create":
      case "collections.update": {
        const collection = await Collection.findByPk(
          (event as CollectionEvent).collectionId
        );
        if (collection) {
          await provider.index(SearchableModel.Collection, collection);
        }
        break;
      }

      case "collections.delete": {
        await provider.remove(
          SearchableModel.Collection,
          (event as CollectionEvent).collectionId,
          event.teamId
        );
        break;
      }

      case "comments.create":
      case "comments.update": {
        const comment = await Comment.findByPk(
          (event as CommentEvent | CommentUpdateEvent).modelId
        );
        if (comment) {
          await provider.index(SearchableModel.Comment, comment);
        }
        break;
      }

      case "comments.delete": {
        await provider.remove(
          SearchableModel.Comment,
          (event as CommentEvent).modelId,
          event.teamId
        );
        break;
      }

      default:
        break;
    }
  }
}
