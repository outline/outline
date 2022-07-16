import { updateYFragment } from "@getoutline/y-prosemirror";
import removeMarkdown from "@tommoor/remove-markdown";
import invariant from "invariant";
import { compact, find, map, uniq } from "lodash";
import randomstring from "randomstring";
import type { SaveOptions } from "sequelize";
import {
  Transaction,
  Op,
  QueryTypes,
  FindOptions,
  ScopeOptions,
  WhereOptions,
} from "sequelize";
import {
  ForeignKey,
  BelongsTo,
  Column,
  Default,
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
  Length as SimpleLength,
  IsNumeric,
  IsDate,
} from "sequelize-typescript";
import MarkdownSerializer from "slate-md-serializer";
import isUUID from "validator/lib/isUUID";
import * as Y from "yjs";
import { MAX_TITLE_LENGTH } from "@shared/constants";
import { DateFilter } from "@shared/types";
import getTasks from "@shared/utils/getTasks";
import parseTitle from "@shared/utils/parseTitle";
import unescape from "@shared/utils/unescape";
import { SLUG_URL_REGEX } from "@shared/utils/urlHelpers";
import { parser } from "@server/editor";
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
import Length from "./validators/Length";

export type SearchResponse = {
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
  share?: Share;
  dateFilter?: DateFilter;
  collaboratorIds?: string[];
  includeArchived?: boolean;
  includeDrafts?: boolean;
  snippetMinWords?: number;
  snippetMaxWords?: number;
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
  withCollectionPermissions: (userId: string, paranoid = true) => {
    if (userId) {
      return {
        include: [
          {
            attributes: ["id", "permission", "sharing", "teamId", "deletedAt"],
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
          attributes: ["id", "permission", "sharing", "teamId", "deletedAt"],
          model: Collection,
          as: "collection",
          paranoid,
        },
      ],
    };
  },
  withoutState: {
    attributes: {
      exclude: ["state"],
    },
  },
  withCollection: {
    include: [
      {
        model: Collection,
        as: "collection",
      },
    ],
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
  @SimpleLength({
    min: 10,
    max: 10,
    msg: `urlId must be 10 characters`,
  })
  @PrimaryKey
  @Column
  urlId: string;

  @Length({
    max: MAX_TITLE_LENGTH,
    msg: `Document title must be ${MAX_TITLE_LENGTH} characters or less`,
  })
  @Column
  title: string;

  @Column(DataType.ARRAY(DataType.STRING))
  previousTitles: string[] = [];

  @IsNumeric
  @Column(DataType.SMALLINT)
  version: number;

  @Column
  template: boolean;

  @Column
  fullWidth: boolean;

  @SimpleLength({
    max: 255,
    msg: `editorVersion must be 255 characters or less`,
  })
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

  @IsNumeric
  @Default(0)
  @Column(DataType.INTEGER)
  revisionCount: number;

  @IsDate
  @Column
  archivedAt: Date | null;

  @IsDate
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
  static async updateTitleInCollectionStructure(
    model: Document,
    { transaction }: SaveOptions<Document>
  ) {
    // templates, drafts, and archived documents don't appear in the structure
    // and so never need to be updated when the title changes
    if (
      model.archivedAt ||
      model.template ||
      !model.publishedAt ||
      !model.changed("title")
    ) {
      return;
    }

    const collection = await Collection.findByPk(model.collectionId, {
      transaction,
      lock: Transaction.LOCK.UPDATE,
    });
    if (!collection) {
      return;
    }

    await collection.updateDocument(model, { transaction });
    model.collection = collection;
  }

  @AfterCreate
  static async addDocumentToCollectionStructure(model: Document) {
    if (model.archivedAt || model.template || !model.publishedAt) {
      return;
    }

    return this.sequelize!.transaction(async (transaction: Transaction) => {
      const collection = await Collection.findByPk(model.collectionId, {
        transaction,
        lock: transaction.LOCK.UPDATE,
      });
      if (!collection) {
        return;
      }

      await collection.addDocumentToStructure(model, 0, { transaction });
      model.collection = collection;
    });
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
      method: ["withCollectionPermissions", userId],
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
      includeState?: boolean;
    } = {}
  ): Promise<Document | null> {
    // allow default preloading of collection membership if `userId` is passed in find options
    // almost every endpoint needs the collection membership to determine policy permissions.
    const scope = this.scope([
      ...(options.includeState ? [] : ["withoutState"]),
      "withDrafts",
      {
        method: ["withCollectionPermissions", options.userId, options.paranoid],
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

    return null;
  }

  static async searchForTeam(
    team: Team,
    query: string,
    options: SearchOptions = {}
  ): Promise<SearchResponse> {
    const wildcardQuery = `${escape(query)}:*`;
    const {
      snippetMinWords = 20,
      snippetMaxWords = 30,
      limit = 15,
      offset = 0,
    } = options;

    // restrict to specific collection if provided
    // enables search in private collections if specified
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

    if (options.share?.includeChildDocuments) {
      const sharedDocument = await options.share.$get("document");
      invariant(sharedDocument, "Cannot find document for share");

      const childDocumentIds = await sharedDocument.getChildDocumentIds({
        archivedAt: {
          [Op.is]: null,
        },
      });
      documentIds = [sharedDocument.id, ...childDocumentIds];
    }

    const documentClause = documentIds ? `"id" IN(:documentIds) AND` : "";

    // Build the SQL query to get result documentIds, ranking, and search term context
    const whereClause = `
  "searchVector" @@ to_tsquery('english', :query) AND
    "teamId" = :teamId AND
    "collectionId" IN(:collectionIds) AND
    ${documentClause}
    "deletedAt" IS NULL AND
    "publishedAt" IS NOT NULL
  `;
    const selectSql = `
    SELECT
      id,
      ts_rank(documents."searchVector", to_tsquery('english', :query)) as "searchRanking",
      ts_headline('english', "text", to_tsquery('english', :query), :headlineOptions) as "searchContext"
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
      documentIds,
      headlineOptions: `MaxFragments=1, MinWords=${snippetMinWords}, MaxWords=${snippetMaxWords}`,
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
    const {
      snippetMinWords = 20,
      snippetMaxWords = 30,
      limit = 15,
      offset = 0,
    } = options;
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
    ts_headline('english', "text", to_tsquery('english', :query), :headlineOptions) as "searchContext"
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
      headlineOptions: `MaxFragments=1, MinWords=${snippetMinWords}, MaxWords=${snippetMaxWords}`,
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
        method: ["withCollectionPermissions", user.id],
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

  updateFromMarkdown = (text: string, append = false) => {
    this.text = append ? this.text + text : text;

    if (this.state) {
      const ydoc = new Y.Doc();
      Y.applyUpdate(ydoc, this.state);
      const type = ydoc.get("default", Y.XmlFragment) as Y.XmlFragment;
      const doc = parser.parse(this.text);

      if (!type.doc) {
        throw new Error("type.doc not found");
      }

      // apply new document to existing ydoc
      updateYFragment(type.doc, type, doc, new Map());

      const state = Y.encodeStateAsUpdate(ydoc);
      this.state = Buffer.from(state);
      this.changed("state", true);
    }
  };

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

  /**
   * Calculate all of the document ids that are children of this document by
   * iterating through parentDocumentId references in the most efficient way.
   *
   * @param options FindOptions
   * @returns A promise that resolves to a list of document ids
   */
  getChildDocumentIds = async (
    where?: Omit<WhereOptions<Document>, "parentDocumentId">,
    options?: FindOptions<Document>
  ): Promise<string[]> => {
    const getChildDocumentIds = async (
      ...parentDocumentId: string[]
    ): Promise<string[]> => {
      const childDocuments = await (this
        .constructor as typeof Document).findAll({
        attributes: ["id"],
        where: {
          parentDocumentId,
          ...where,
        },
        ...options,
      });

      const childDocumentIds = childDocuments.map((doc) => doc.id);

      if (childDocumentIds.length > 0) {
        return [
          ...childDocumentIds,
          ...(await getChildDocumentIds(...childDocumentIds)),
        ];
      }

      return childDocumentIds;
    };

    return getChildDocumentIds(this.id);
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

  publish = async (userId: string, { transaction }: SaveOptions<Document>) => {
    // If the document is already published then calling publish should act like
    // a regular save
    if (this.publishedAt) {
      return this.save({ transaction });
    }

    if (!this.template) {
      const collection = await Collection.findByPk(this.collectionId, {
        transaction,
        lock: Transaction.LOCK.UPDATE,
      });

      if (collection) {
        await collection.addDocumentToStructure(this, 0, { transaction });
        this.collection = collection;
      }
    }

    this.lastModifiedById = userId;
    this.publishedAt = new Date();
    return this.save({ transaction });
  };

  unpublish = async (userId: string) => {
    // If the document is already a draft then calling unpublish should act like
    // a regular save
    if (!this.publishedAt) {
      return this.save();
    }

    await this.sequelize.transaction(async (transaction: Transaction) => {
      const collection = await Collection.findByPk(this.collectionId, {
        transaction,
        lock: transaction.LOCK.UPDATE,
      });

      if (collection) {
        await collection.removeDocumentInStructure(this, { transaction });
        this.collection = collection;
      }
    });

    // unpublishing a document converts the ownership to yourself, so that it
    // will appear in your drafts rather than the original creators
    this.createdById = userId;
    this.lastModifiedById = userId;
    this.publishedAt = null;
    return this.save();
  };

  // Moves a document from being visible to the team within a collection
  // to the archived area, where it can be subsequently restored.
  archive = async (userId: string) => {
    await this.sequelize.transaction(async (transaction: Transaction) => {
      const collection = await Collection.findByPk(this.collectionId, {
        transaction,
        lock: transaction.LOCK.UPDATE,
      });

      if (collection) {
        await collection.removeDocumentInStructure(this, { transaction });
        this.collection = collection;
      }
    });

    await this.archiveWithChildren(userId);
    return this;
  };

  // Restore an archived document back to being visible to the team
  unarchive = async (userId: string) => {
    await this.sequelize.transaction(async (transaction: Transaction) => {
      const collection = await Collection.findByPk(this.collectionId, {
        transaction,
        lock: transaction.LOCK.UPDATE,
      });

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
        await collection.addDocumentToStructure(this, undefined, {
          transaction,
        });
        this.collection = collection;
      }
    });

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
    return this.sequelize.transaction(async (transaction: Transaction) => {
      if (!this.archivedAt && !this.template) {
        // delete any children and remove from the document structure
        const collection = await Collection.findByPk(this.collectionId, {
          transaction,
          lock: transaction.LOCK.UPDATE,
        });
        await collection?.deleteDocument(this, { transaction });
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
    });
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
