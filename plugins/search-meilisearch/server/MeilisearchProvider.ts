import { MeiliSearch } from "meilisearch";
import type {
  SearchOptions,
  SearchResponse,
} from "@server/utils/BaseSearchProvider";
import { BaseSearchProvider } from "@server/utils/BaseSearchProvider";
import type { SearchableModel } from "@shared/types";
import { DirectionFilter, SortFilter, StatusFilter } from "@shared/types";
import type Collection from "@server/models/Collection";
import type Comment from "@server/models/Comment";
import type Document from "@server/models/Document";
import Team from "@server/models/Team";
import User from "@server/models/User";
import Document from "@server/models/Document";
import Collection from "@server/models/Collection";
import { DocumentHelper } from "@server/models/helpers/DocumentHelper";
import Logger from "@server/logging/Logger";

export default class MeilisearchProvider extends BaseSearchProvider {
  id = "meilisearch";

  private client: MeiliSearch;
  private documentsIndex: string = "documents";
  private collectionsIndex: string = "collections";

  constructor() {
    super();
    const host = process.env.MEILISEARCH_HOST || "http://localhost:7700";
    const apiKey = process.env.MEILISEARCH_API_KEY || "";

    this.client = new MeiliSearch({ host, apiKey });
    this.initializeIndexes();
  }

  private async initializeIndexes(): Promise<void> {
    try {
      // Create or update documents index
      await this.client.index(this.documentsIndex).updateSettings({
        searchableAttributes: ["title", "text"],
        displayedAttributes: ["id", "title", "teamId", "collectionId"],
        filterableAttributes: [
          "teamId",
          "collectionId",
          "createdById",
          "publishedAt",
          "archivedAt",
          "deletedAt",
        ],
        sortableAttributes: ["updatedAt", "createdAt", "title"],
      });

      // Create or update collections index
      await this.client.index(this.collectionsIndex).updateSettings({
        searchableAttributes: ["name", "description"],
        displayedAttributes: ["id", "name", "teamId"],
        filterableAttributes: ["teamId"],
        sortableAttributes: ["name", "createdAt"],
      });

      Logger.debug("meilisearch", "Indexes initialized successfully");
    } catch (err) {
      Logger.error("meilisearch", `Failed to initialize indexes: ${err}`);
    }
  }

  async searchForUser(
    user: User,
    options: SearchOptions = {}
  ): Promise<SearchResponse> {
    const { limit = 15, offset = 0, query } = options;

    try {
      const filters = this.buildFilters(user, options, "user");
      const results = await this.client.index(this.documentsIndex).search(query || "", {
        limit,
        offset,
        filter: filters.length > 0 ? filters : undefined,
        sort: this.buildSort(options),
      } as any);

      // Fetch full documents
      const documents = await Document.findAll({
        where: {
          id: (results.hits as any[]).map((hit: any) => hit.id),
          teamId: user.teamId,
        },
        include: [
          {
            model: Collection,
            as: "collection",
          },
        ],
      });

      return {
        results: (results.hits as any[]).map((hit: any) => ({
          ranking: hit._rankingScore || 0,
          context: this.buildContext(hit, query),
          document: documents.find((doc) => doc.id === hit.id)!,
        })),
        total: results.estimatedTotalHits || 0,
      };
    } catch (err) {
      Logger.error("meilisearch", `Search failed: ${err}`);
      throw err;
    }
  }

  async searchForTeam(
    team: Team,
    options: SearchOptions = {}
  ): Promise<SearchResponse> {
    const { limit = 15, offset = 0, query } = options;

    try {
      const filters = this.buildFilters(team, options, "team");
      const results = await this.client.index(this.documentsIndex).search(query || "", {
        limit,
        offset,
        filter: [
          ...filters,
          'publishedAt IS NOT EMPTY AND archivedAt IS EMPTY',
        ],
        sort: this.buildSort(options),
      } as any);

      // Fetch full documents
      const documents = await Document.findAll({
        where: {
          id: (results.hits as any[]).map((hit: any) => hit.id),
          teamId: team.id,
        },
        include: [
          {
            model: Collection,
            as: "collection",
          },
        ],
      });

      return {
        results: (results.hits as any[]).map((hit: any) => ({
          ranking: hit._rankingScore || 0,
          context: this.buildContext(hit, query),
          document: documents.find((doc) => doc.id === hit.id)!,
        })),
        total: results.estimatedTotalHits || 0,
      };
    } catch (err) {
      Logger.error("meilisearch", `Team search failed: ${err}`);
      throw err;
    }
  }

  async searchTitlesForUser(
    user: User,
    options: SearchOptions = {}
  ): Promise<Document[]> {
    try {
      const results = await this.client.index(this.documentsIndex).search(
        options.query || "",
        {
          limit: options.limit || 15,
          offset: options.offset || 0,
          filter: [`teamId = "${user.teamId}"`],
        } as any
      );

      return Document.findAll({
        where: {
          id: (results.hits as any[]).map((hit: any) => hit.id),
          teamId: user.teamId,
        },
        limit: options.limit || 15,
        offset: options.offset || 0,
      });
    } catch (err) {
      Logger.error("meilisearch", `Title search failed: ${err}`);
      return [];
    }
  }

  async searchCollectionsForUser(
    user: User,
    options: SearchOptions = {}
  ): Promise<Collection[]> {
    try {
      const results = await this.client.index(this.collectionsIndex).search(
        options.query || "",
        {
          limit: options.limit || 15,
          offset: options.offset || 0,
          filter: [`teamId = "${user.teamId}"`],
        } as any
      );

      return Collection.findAll({
        where: {
          id: (results.hits as any[]).map((hit: any) => hit.id),
          teamId: user.teamId,
        },
      });
    } catch (err) {
      Logger.error("meilisearch", `Collection search failed: ${err}`);
      return [];
    }
  }

  async index(
    _model: SearchableModel,
    item: Document | Collection | Comment
  ): Promise<void> {
    try {
      if (item instanceof Document) {
        const doc = item as Document;
        await this.client.index(this.documentsIndex).updateDocuments(
          [
            {
              id: doc.id,
              title: doc.title,
              text: DocumentHelper.toPlainText(doc),
              teamId: doc.teamId,
              collectionId: doc.collectionId,
              createdById: doc.createdById,
              publishedAt: doc.publishedAt?.toISOString(),
              archivedAt: doc.archivedAt?.toISOString(),
              deletedAt: doc.deletedAt?.toISOString(),
              updatedAt: doc.updatedAt?.toISOString(),
              createdAt: doc.createdAt?.toISOString(),
            },
          ] as any
        );
      } else if (item instanceof Collection) {
        const col = item as Collection;
        await this.client.index(this.collectionsIndex).updateDocuments(
          [
            {
              id: col.id,
              name: col.name,
              description: col.description,
              teamId: col.teamId,
            },
          ] as any
        );
      }
    } catch (err) {
      Logger.error("meilisearch", `Indexing failed: ${err}`);
    }
  }

  async remove(
    _model: SearchableModel,
    id: string,
    _teamId: string
  ): Promise<void> {
    try {
      // Try to remove from both indexes
      await Promise.all([
        this.client
          .index(this.documentsIndex)
          .deleteDocument(id)
          .catch(() => {}),
        this.client
          .index(this.collectionsIndex)
          .deleteDocument(id)
          .catch(() => {}),
      ]);
    } catch (err) {
      Logger.error("meilisearch", `Document removal failed: ${err}`);
    }
  }

  async updateMetadata(
    _model: SearchableModel,
    id: string,
    metadata: Record<string, unknown>
  ): Promise<void> {
    try {
      await this.client.index(this.documentsIndex).updateDocuments(
        [
          {
            id,
            ...metadata,
          },
        ] as any
      );
    } catch (err) {
      Logger.error("meilisearch", `Metadata update failed: ${err}`);
    }
  }

  private buildFilters(
    user: User | Team,
    options: SearchOptions,
    scope: "user" | "team"
  ): string[] {
    const filters: string[] = [];
    const teamId = user instanceof Team ? user.id : user.teamId;

    filters.push(`teamId = "${teamId}"`);
    filters.push('deletedAt IS EMPTY');

    if (options.collectionId) {
      filters.push(`collectionId = "${options.collectionId}"`);
    }

    if (options.statusFilter) {
      const statusConditions = [];
      if (options.statusFilter.includes(StatusFilter.Published)) {
        statusConditions.push('publishedAt IS NOT EMPTY AND archivedAt IS EMPTY');
      }
      if (options.statusFilter.includes(StatusFilter.Draft)) {
        statusConditions.push('publishedAt IS EMPTY AND archivedAt IS EMPTY');
      }
      if (options.statusFilter.includes(StatusFilter.Archived)) {
        statusConditions.push('archivedAt IS NOT EMPTY');
      }
      if (statusConditions.length > 0) {
        filters.push(`(${statusConditions.join(' OR ')})`);
      }
    }

    return filters;
  }

  private buildSort(options: SearchOptions): string[] {
    const sort: string[] = [];

    if (options.sort === SortFilter.Title) {
      sort.push(
        `title:${options.direction === DirectionFilter.ASC ? 'asc' : 'desc'}`
      );
    } else {
      sort.push(
        `updatedAt:${options.direction === DirectionFilter.ASC ? 'asc' : 'desc'}`
      );
    }

    return sort;
  }

  private buildContext(hit: any, query?: string): string | undefined {
    if (!query) return undefined;

    const text = hit.text || "";
    const queryLower = query.toLowerCase();
    const index = text.toLowerCase().indexOf(queryLower);

    if (index === -1) return undefined;

    const start = Math.max(0, index - 50);
    const end = Math.min(text.length, index + query.length + 100);
    const context = text.slice(start, end);

    return context.replace(new RegExp(`(${query})`, "gi"), "<b>$1</b>");
  }
}
