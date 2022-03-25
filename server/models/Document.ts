import removeMarkdown from "@tommoor/remove-markdown";
import { compact, find, map, uniq } from "lodash";
import randomstring from "randomstring";
import {
  Transaction,
  Op,
  QueryTypes,
  FindOptions,
  ScopeOptions,
} from "sequelize";
import {
  ForeignKey,
  BelongsTo,
  Column,
  Default,
  Length,
  PrimaryKey,
  Table,
  BeforeValidate,
  BeforeCreate,
  BeforeUpdate,
  HasMany,
  BeforeSave,
  DefaultScope,
  AfterCreate,
  Scopes,
  DataType,
} from "sequelize-typescript";
import MarkdownSerializer from "slate-md-serializer";
import isUUID from "validator/lib/isUUID";
import { MAX_TITLE_LENGTH } from "@shared/constants";
import { DateFilter } from "@shared/types";
import getTasks from "@shared/utils/getTasks";
import parseTitle from "@shared/utils/parseTitle";
import unescape from "@shared/utils/unescape";
import { SLUG_URL_REGEX } from "@shared/utils/urlHelpers";
import slugify from "@server/utils/slugify";
import Backlink from "./Backlink";
import Collection from "./Collection";
import Revision from "./Revision";
import Share from "./Share";
import Star from "./Star";
import Team from "./Team";
import User from "./User";
import View from "./View";
import ParanoidModel from "./base/ParanoidModel";
import Fix from "./decorators/Fix";

type SearchResponse = {
  results: {
    ranking: number;
    context: string;
    document: Document;
  }[];
  totalCount: number;
};

type SearchOptions = {
  limit?: number;
  offset?: number;
  collectionId?: string;
  documentId?: string;
  share?: Share;
  dateFilter?: DateFilter;
  collaboratorIds?: string[];
  includeArchived?: boolean;
  includeDrafts?: boolean;
};

const serializer = new MarkdownSerializer();

export const DOCUMENT_VERSION = 2;

@DefaultScope(() => ({
  attributes: {
    exclude: ["state"],
  },
  include: [
    {
      model: User,
      as: "createdBy",
      paranoid: false,
    },
    {
      model: User,
      as: "updatedBy",
      paranoid: false,
    },
  ],
  where: {
    publishedAt: {
      [Op.ne]: null,
    },
  },
}))
@Scopes(() => ({
  withCollection: (userId: string, paranoid = true) => {
    if (userId) {
      return {
        include: [
          {
            model: Collection.scope({
              method: ["withMembership", userId],
            }),
            as: "collection",
            paranoid,
          },
        ],
      };
    }

    return {
      include: [
        {
          model: Collection,
          as: "collection",
        },
      ],
    };
  },
  withoutState: {
    attributes: {
      exclude: ["state"],
    },
  },
  withState: {
    attributes: {
      // resets to include the state column
      exclude: [],
    },
  },
  withDrafts: {
    include: [
      {
        model: User,
        as: "createdBy",
        paranoid: false,
      },
      {
        model: User,
        as: "updatedBy",
        paranoid: false,
      },
    ],
  },
  withViews: (userId: string) => {
    if (!userId) {
      return {};
    }
    return {
      include: [
        {
          model: View,
          as: "views",
          where: {
            userId,
          },
          required: false,
          separate: true,
        },
      ],
    };
  },
}))
@Table({ tableName: "documents", modelName: "document" })
@Fix
class Document extends ParanoidModel {
  @PrimaryKey
  @Column
  urlId: string;

  @Length({
    min: 0,
    max: MAX_TITLE_LENGTH,
    msg: `Document title must be less than ${MAX_TITLE_LENGTH} characters`,
  })
  @Column
  title: string;

  @Column(DataType.ARRAY(DataType.STRING))
  previousTitles: string[] = [];

  @Column(DataType.SMALLINT)
  version: number;

  @Column
  template: boolean;

  @Column
  fullWidth: boolean;

  @Column
  editorVersion: string;

  @Column
  emoji: string | null;

  @Column(DataType.TEXT)
  text: string;

  @Column(DataType.BLOB)
  state: Uint8Array;

  @Default(false)
  @Column
  isWelcome: boolean;

  @Default(0)
  @Column(DataType.INTEGER)
  revisionCount: number;

  @Column
  archivedAt: Date | null;

  @Column
  publishedAt: Date | null;

  @Column(DataType.ARRAY(DataType.UUID))
  collaboratorIds: string[] = [];

  // getters

  get url() {
    if (!this.title) {
      return `/doc/untitled-${this.urlId}`;
    }
    const slugifiedTitle = slugify(this.title);
    return `/doc/${slugifiedTitle}-${this.urlId}`;
  }

  get tasks() {
    return getTasks(this.text || "");
  }

  // hooks

  @BeforeSave
  static async updateInCollectionStructure(model: Document) {
    if (!model.publishedAt || model.template) {
      return;
    }

    const collection = await Collection.findByPk(model.collectionId);

    if (!collection) {
      return;
    }

    await collection.updateDocument(model);
    model.collection = collection;
  }

  @AfterCreate
  static async addDocumentToCollectionStructure(model: Document) {
    if (!model.publishedAt || model.template) {
      return;
    }

    const collection = await Collection.findByPk(model.collectionId);

    if (!collection) {
      return;
    }

    await collection.addDocumentToStructure(model, 0);
    model.collection = collection;
  }

  @BeforeValidate
  static createUrlId(model: Document) {
    return (model.urlId = model.urlId || randomstring.generate(10));
  }

  @BeforeCreate
  static setDocumentVersion(model: Document) {
    if (model.version === undefined) {
      model.version = DOCUMENT_VERSION;
    }

    return this.processUpdate(model);
  }

  @BeforeUpdate
  static processUpdate(model: Document) {
    const { emoji } = parseTitle(model.text);
    // emoji in the title is split out for easier display
    model.emoji = emoji || null;

    // ensure documents have a title
    model.title = model.title || "";

    if (model.previous("title") && model.previous("title") !== model.title) {
      if (!model.previousTitles) {
        model.previousTitles = [];
      }

      model.previousTitles = uniq(
        model.previousTitles.concat(model.previous("title"))
      );
    }

    // add the current user as a collaborator on this doc
    if (!model.collaboratorIds) {
      model.collaboratorIds = [];
    }

    model.collaboratorIds = uniq(
      model.collaboratorIds.concat(model.lastModifiedById)
    );

    // increment revision
    model.revisionCount += 1;
  }

  // associations

  @BelongsTo(() => Document, "parentDocumentId")
  parentDocument: Document | null;

  @ForeignKey(() => Document)
  @Column(DataType.UUID)
  parentDocumentId: string | null;

  @BelongsTo(() => User, "lastModifiedById")
  updatedBy: User;

  @ForeignKey(() => User)
  @Column(DataType.UUID)
  lastModifiedById: string;

  @BelongsTo(() => User, "createdById")
  createdBy: User;

  @ForeignKey(() => User)
  @Column(DataType.UUID)
  createdById: string;

  @BelongsTo(() => Document, "templateId")
  document: Document;

  @ForeignKey(() => Document)
  @Column(DataType.UUID)
  templateId: string;

  @BelongsTo(() => Team, "teamId")
  team: Team;

  @ForeignKey(() => Team)
  @Column(DataType.UUID)
  teamId: string;

  @BelongsTo(() => Collection, "collectionId")
  collection: Collection;

  @ForeignKey(() => Collection)
  @Column(DataType.UUID)
  collectionId: string;

  @HasMany(() => Revision)
  revisions: Revision[];

  @HasMany(() => Backlink)
  backlinks: Backlink[];

  @HasMany(() => Star)
  starred: Star[];

  @HasMany(() => View)
  views: View[];

  static defaultScopeWithUser(userId: string) {
    const collectionScope: Readonly<ScopeOptions> = {
      method: ["withCollection", userId],
    };
    const viewScope: Readonly<ScopeOptions> = {
      method: ["withViews", userId],
    };
    return this.scope(["defaultScope", collectionScope, viewScope]);
  }

  static async findByPk(
    id: string,
    options: FindOptions<Document> & {
      userId?: string;
    } = {}
  ) {
    // allow default preloading of collection membership if `userId` is passed in find options
    // almost every endpoint needs the collection membership to determine policy permissions.
    const scope = this.scope([
      "withoutState",
      "withDrafts",
      {
        method: ["withCollection", options.userId, options.paranoid],
      },
      {
        method: ["withViews", options.userId],
      },
    ]);

    if (isUUID(id)) {
      return scope.findOne({
        where: {
          id,
        },
        ...options,
      });
    }

    const match = id.match(SLUG_URL_REGEX);
    if (match) {
      return scope.findOne({
        where: {
          urlId: match[1],
        },
        ...options,
      });
    }

    return undefined;
  }

  static async searchForTeam(
    team: Team,
    query: string,
    options: SearchOptions = {}
  ): Promise<SearchResponse> {
    const limit = options.limit || 15;
    const offset = options.offset || 0;
    const wildcardQuery = `${escape(query)}:*`;

    let collectionIds;
    if (options.collectionId) {
      collectionIds = [options.collectionId];
    } else {
      collectionIds = await team.collectionIds();
    }

    // short circuit if no relevant collections
    if (!collectionIds.length) {
      return {
        results: [],
        totalCount: 0,
      };
    }

    // restrict to documents in the tree of a shared document when one is provided
    let documentIds;
    if (options.documentId && options.share) {
      if (options.share.includeChildDocuments) {
        documentIds = await Document.getDocumentTree(options.documentId);
      }
    }

    // Build the SQL query to get documentIds, ranking, and search term context
    const whereClause = `
  "searchVector" @@ to_tsquery('english', :query) AND
    "teamId" = :teamId AND
    "collectionId" IN(:collectionIds) AND
    "deletedAt" IS NULL AND
    "publishedAt" IS NOT NULL
  `;
    const selectSql = `
    SELECT
      id,
      ts_rank(documents."searchVector", to_tsquery('english', :query)) as "searchRanking",
      ts_headline('english', "text", to_tsquery('english', :query), 'MaxFragments=1, MinWords=20, MaxWords=30') as "searchContext"
    FROM documents
    WHERE ${whereClause}
    ORDER BY
      "searchRanking" DESC,
      "updatedAt" DESC
    LIMIT :limit
    OFFSET :offset;
  `;
    const countSql = `
    SELECT COUNT(id)
    FROM documents
    WHERE ${whereClause}
  `;
    const queryReplacements = {
      teamId: team.id,
      query: wildcardQuery,
      collectionIds,
    };
    const resultsQuery = this.sequelize!.query(selectSql, {
      type: QueryTypes.SELECT,
      replacements: { ...queryReplacements, limit, offset },
    });
    const countQuery = this.sequelize!.query(countSql, {
      type: QueryTypes.SELECT,
      replacements: queryReplacements,
    });
    const [results, [{ count }]]: [any, any] = await Promise.all([
      resultsQuery,
      countQuery,
    ]);

    // Final query to get associated document data
    const documents = await this.findAll({
      where: {
        id: map(results, "id"),
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
      results: map(results, (result: any) => ({
        ranking: result.searchRanking,
        context: removeMarkdown(unescape(result.searchContext), {
          stripHTML: false,
        }),
        document: find(documents, {
          id: result.id,
        }) as Document,
      })),
      totalCount: count,
    };
  }

  static async searchForUser(
    user: User,
    query: string,
    options: SearchOptions = {}
  ): Promise<SearchResponse> {
    const limit = options.limit || 15;
    const offset = options.offset || 0;
    const wildcardQuery = `${escape(query)}:*`;

    // Ensure we're filtering by the users accessible collections. If
    // collectionId is passed as an option it is assumed that the authorization
    // has already been done in the router
    let collectionIds;

    if (options.collectionId) {
      collectionIds = [options.collectionId];
    } else {
      collectionIds = await user.collectionIds();
    }

    // If the user has access to no collections then shortcircuit the rest of this
    if (!collectionIds.length) {
      return {
        results: [],
        totalCount: 0,
      };
    }

    let dateFilter;

    if (options.dateFilter) {
      dateFilter = `1 ${options.dateFilter}`;
    }

    // Build the SQL query to get documentIds, ranking, and search term context
    const whereClause = `
  "searchVector" @@ to_tsquery('english', :query) AND
    "teamId" = :teamId AND
    "collectionId" IN(:collectionIds) AND
    ${
      options.dateFilter ? '"updatedAt" > now() - interval :dateFilter AND' : ""
    }
    ${
      options.collaboratorIds
        ? '"collaboratorIds" @> ARRAY[:collaboratorIds]::uuid[] AND'
        : ""
    }
    ${options.includeArchived ? "" : '"archivedAt" IS NULL AND'}
    "deletedAt" IS NULL AND
    ${
      options.includeDrafts
        ? '("publishedAt" IS NOT NULL OR "createdById" = :userId)'
        : '"publishedAt" IS NOT NULL'
    }
  `;
    const selectSql = `
  SELECT
    id,
    ts_rank(documents."searchVector", to_tsquery('english', :query)) as "searchRanking",
    ts_headline('english', "text", to_tsquery('english', :query), 'MaxFragments=1, MinWords=20, MaxWords=30') as "searchContext"
  FROM documents
  WHERE ${whereClause}
  ORDER BY
    "searchRanking" DESC,
    "updatedAt" DESC
  LIMIT :limit
  OFFSET :offset;
  `;
    const countSql = `
    SELECT COUNT(id)
    FROM documents
    WHERE ${whereClause}
  `;
    const queryReplacements = {
      teamId: user.teamId,
      userId: user.id,
      collaboratorIds: options.collaboratorIds,
      query: wildcardQuery,
      collectionIds,
      dateFilter,
    };
    const resultsQuery = this.sequelize!.query(selectSql, {
      type: QueryTypes.SELECT,
      replacements: { ...queryReplacements, limit, offset },
    });
    const countQuery = this.sequelize!.query(countSql, {
      type: QueryTypes.SELECT,
      replacements: queryReplacements,
    });
    const [results, [{ count }]]: [any, any] = await Promise.all([
      resultsQuery,
      countQuery,
    ]);

    // Final query to get associated document data
    const documents = await this.scope([
      "withoutState",
      "withDrafts",
      {
        method: ["withViews", user.id],
      },
      {
        method: ["withCollection", user.id],
      },
    ]).findAll({
      where: {
        teamId: user.teamId,
        id: map(results, "id"),
      },
    });

    return {
      results: map(results, (result: any) => ({
        ranking: result.searchRanking,
        context: removeMarkdown(unescape(result.searchContext), {
          stripHTML: false,
        }),
        document: find(documents, {
          id: result.id,
        }) as Document,
      })),
      totalCount: count,
    };
  }

  // instance methods

  toMarkdown = () => {
    const text = unescape(this.text);

    if (this.version) {
      return `# ${this.title}\n\n${text}`;
    }

    return text;
  };

  migrateVersion = () => {
    let migrated = false;

    // migrate from document version 0 -> 1
    if (!this.version) {
      // removing the title from the document text attribute
      this.text = this.text.replace(/^#\s(.*)\n/, "");
      this.version = 1;
      migrated = true;
    }

    // migrate from document version 1 -> 2
    if (this.version === 1) {
      const nodes = serializer.deserialize(this.text);
      this.text = serializer.serialize(nodes, {
        version: 2,
      });
      this.version = 2;
      migrated = true;
    }

    if (migrated) {
      return this.save({
        silent: true,
        hooks: false,
      });
    }

    return undefined;
  };

  archiveWithChildren = async (
    userId: string,
    options?: FindOptions<Document>
  ) => {
    const archivedAt = new Date();

    // Helper to archive all child documents for a document
    const archiveChildren = async (parentDocumentId: string) => {
      const childDocuments = await (this
        .constructor as typeof Document).findAll({
        where: {
          parentDocumentId,
        },
      });
      childDocuments.forEach(async (child) => {
        await archiveChildren(child.id);
        child.archivedAt = archivedAt;
        child.lastModifiedById = userId;
        await child.save(options);
      });
    };

    await archiveChildren(this.id);
    this.archivedAt = archivedAt;
    this.lastModifiedById = userId;
    return this.save(options);
  };

  publish = async (userId: string, options?: FindOptions<Document>) => {
    if (this.publishedAt) {
      return this.save(options);
    }

    if (!this.template) {
      const collection = await Collection.findByPk(this.collectionId);
      await collection?.addDocumentToStructure(this, 0);
    }

    this.lastModifiedById = userId;
    this.publishedAt = new Date();
    await this.save(options);
    return this;
  };

  unpublish = async (userId: string, options?: FindOptions<Document>) => {
    if (!this.publishedAt) {
      return this;
    }
    const collection = await this.$get("collection");
    await collection?.removeDocumentInStructure(this);

    // unpublishing a document converts the "ownership" to yourself, so that it
    // can appear in your drafts rather than the original creators
    this.createdById = userId;
    this.lastModifiedById = userId;
    this.publishedAt = null;
    await this.save(options);
    return this;
  };

  // Moves a document from being visible to the team within a collection
  // to the archived area, where it can be subsequently restored.
  archive = async (userId: string) => {
    // archive any children and remove from the document structure
    const collection = await this.$get("collection");
    if (collection) {
      await collection.removeDocumentInStructure(this);
      this.collection = collection;
    }

    await this.archiveWithChildren(userId);
    return this;
  };

  // Restore an archived document back to being visible to the team
  unarchive = async (userId: string) => {
    const collection = await this.$get("collection");

    // check to see if the documents parent hasn't been archived also
    // If it has then restore the document to the collection root.
    if (this.parentDocumentId) {
      const parent = await (this.constructor as typeof Document).findOne({
        where: {
          id: this.parentDocumentId,
          archivedAt: {
            [Op.is]: null,
          },
        },
      });
      if (!parent) {
        this.parentDocumentId = null;
      }
    }

    if (!this.template && collection) {
      await collection.addDocumentToStructure(this);
      this.collection = collection;
    }

    if (this.deletedAt) {
      await this.restore();
    }

    this.archivedAt = null;
    this.lastModifiedById = userId;
    await this.save();
    return this;
  };

  // Delete a document, archived or otherwise.
  delete = (userId: string) => {
    return this.sequelize.transaction(
      async (transaction: Transaction): Promise<Document> => {
        if (!this.archivedAt && !this.template) {
          // delete any children and remove from the document structure
          const collection = await this.$get("collection", {
            transaction,
          });
          if (collection) {
            await collection.deleteDocument(this);
          }
        } else {
          await this.destroy({
            transaction,
          });
        }

        await Revision.destroy({
          where: {
            documentId: this.id,
          },
          transaction,
        });
        await this.update(
          {
            lastModifiedById: userId,
          },
          {
            transaction,
          }
        );
        return this;
      }
    );
  };

  getTimestamp = () => {
    return Math.round(new Date(this.updatedAt).getTime() / 1000);
  };

  getSummary = () => {
    const plain = removeMarkdown(unescape(this.text), {
      stripHTML: false,
    });
    const lines = compact(plain.split("\n"));
    const notEmpty = lines.length >= 1;

    if (this.version) {
      return notEmpty ? lines[0] : "";
    }

    return notEmpty ? lines[1] : "";
  };

  toJSON = () => {
    // Warning: only use for new documents as order of children is
    // handled in the collection's documentStructure
    return {
      id: this.id,
      title: this.title,
      url: this.url,
      children: [],
    };
  };
}

function escape(query: string): string {
  // replace "\" with escaped "\\" because sequelize.escape doesn't do it
  // https://github.com/sequelize/sequelize/issues/2950
  return Document.sequelize!.escape(query).replace(/\\/g, "\\\\");
}

export default Document;
