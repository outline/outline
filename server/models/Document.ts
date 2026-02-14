/* oxlint-disable lines-between-class-members */
import compact from "lodash/compact";
import isNil from "lodash/isNil";
import uniq from "lodash/uniq";
import type {
  Identifier,
  InferAttributes,
  InferCreationAttributes,
  NonNullFindOptions,
  SaveOptions,
  ScopeOptions,
  FindOptions,
  WhereOptions,
} from "sequelize";
import { Transaction, Op, EmptyResultError, Sequelize } from "sequelize";
import {
  ForeignKey,
  BelongsTo,
  Column,
  Default,
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
  AllowNull,
  BelongsToMany,
  Unique,
  AfterUpdate,
  IsFloat,
} from "sequelize-typescript";
import { MaxLength } from "class-validator";
import isUUID from "validator/lib/isUUID";
import type {
  NavigationNode,
  ProsemirrorData,
  SourceMetadata,
} from "@shared/types";
import { ProsemirrorHelper } from "@shared/utils/ProsemirrorHelper";
import { UrlHelper } from "@shared/utils/UrlHelper";
import slugify from "@shared/utils/slugify";
import { DocumentValidation } from "@shared/validations";
import { ValidationError } from "@server/errors";
import { generateUrlId } from "@server/utils/url";
import { createContext } from "@server/context";
import Collection from "./Collection";
import FileOperation from "./FileOperation";
import Group from "./Group";
import GroupMembership from "./GroupMembership";
import GroupUser from "./GroupUser";
import Import from "./Import";
import Relationship from "./Relationship";
import Revision from "./Revision";
import Star from "./Star";
import Team from "./Team";
import User from "./User";
import UserMembership from "./UserMembership";
import View from "./View";
import ArchivableModel from "./base/ArchivableModel";
import Fix from "./decorators/Fix";
import { DocumentHelper } from "./helpers/DocumentHelper";
import IsHexColor from "./validators/IsHexColor";
import Length from "./validators/Length";
import type { APIContext } from "@server/types";
import { APIUpdateExtension } from "@server/collaboration/APIUpdateExtension";
import { SkipChangeset } from "./decorators/Changeset";
import type { HookContext } from "./base/Model";

export const DOCUMENT_VERSION = 2;

// If content (JSON) is null then we still need to return the state column (BINARY)
// as it's used as a fallback for content deserialization for older documents.
// This can be removed if content is 100% backfilled.
const stateIfContentEmpty = Sequelize.literal(
  `CASE WHEN document.content IS NULL THEN document.state ELSE NULL END AS state`
);

type AdditionalFindOptions = {
  /** The user ID to load associated permissions for. */
  userId?: string;
  /** Whether to include the state column in the attributes. */
  includeState?: boolean;
  /** Whether to views (default: true). */
  includeViews?: boolean;
  /** Whether to reject the query if no document is found. */
  rejectOnEmpty?: boolean | Error;
};

// @ts-expect-error Type 'Literal' is not assignable to type 'string | ProjectionAlias'.
@DefaultScope(() => ({
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
    sourceMetadata: {
      trial: {
        [Op.is]: null,
      },
    },
  },
  attributes: {
    include: [stateIfContentEmpty],
  },
}))
// @ts-expect-error Type 'Literal' is not assignable to type 'string | ProjectionAlias'.
@Scopes(() => ({
  withoutState: {
    attributes: {
      include: [stateIfContentEmpty],
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
      include: [],
    },
  },
  withDrafts: {
    include: [
      {
        association: "createdBy",
        paranoid: false,
      },
      {
        association: "updatedBy",
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
  withMembership: (userId: string, paranoid = true) => {
    if (!userId) {
      return {};
    }

    return {
      include: [
        {
          model: userId
            ? Collection.scope([
                "defaultScope",
                {
                  method: ["withMembership", userId],
                },
              ])
            : Collection,
          as: "collection",
          paranoid,
        },
        {
          association: "memberships",
          where: {
            userId,
          },
          required: false,
        },
        {
          association: "groupMemberships",
          required: false,
          // use of "separate" property: sequelize breaks when there are
          // nested "includes" with alternating values for "required"
          // see https://github.com/sequelize/sequelize/issues/9869
          separate: true,
          // include for groups that are members of this document,
          // of which userId is a member of, resulting in:
          // GroupMembership [inner join] Group [inner join] GroupUser [where] userId
          include: [
            {
              model: Group,
              as: "group",
              required: true,
              include: [
                {
                  model: GroupUser,
                  as: "groupUsers",
                  required: true,
                  where: {
                    userId,
                  },
                },
              ],
            },
          ],
        },
      ],
    };
  },
  withAllMemberships: {
    include: [
      {
        association: "memberships",
        required: false,
      },
      {
        model: GroupMembership,
        as: "groupMemberships",
        required: false,
        // use of "separate" property: sequelize breaks when there are
        // nested "includes" with alternating values for "required"
        // see https://github.com/sequelize/sequelize/issues/9869
        separate: true,
        // include for groups that are members of this collection,
        // of which userId is a member of, resulting in:
        // CollectionGroup [inner join] Group [inner join] GroupUser [where] userId
        include: [
          {
            model: Group,
            as: "group",
            required: true,
            include: [
              {
                model: GroupUser,
                as: "groupUsers",
                required: true,
              },
            ],
          },
        ],
      },
    ],
  },
}))
@Table({ tableName: "documents", modelName: "document" })
@Fix
class Document extends ArchivableModel<
  InferAttributes<Document>,
  Partial<InferCreationAttributes<Document>>
> {
  @SimpleLength({
    min: 10,
    max: 10,
    msg: `urlId must be 10 characters`,
  })
  @Unique
  @Column
  urlId: string;

  @Length({
    max: DocumentValidation.maxTitleLength,
    msg: `Document title must be ${DocumentValidation.maxTitleLength} characters or less`,
  })
  @Column
  title: string;

  @Length({
    max: DocumentValidation.maxSummaryLength,
    msg: `Document summary must be ${DocumentValidation.maxSummaryLength} characters or less`,
  })
  @Column
  @SkipChangeset
  summary: string;

  @Column(DataType.ARRAY(DataType.STRING))
  previousTitles: string[] = [];

  @IsNumeric
  @Column(DataType.SMALLINT)
  version?: number | null;

  @Default(false)
  @Column
  template: boolean;

  @Default(false)
  @Column
  fullWidth: boolean;

  @Column
  insightsEnabled: boolean;

  /** The version of the editor last used to edit this document. */
  @SimpleLength({
    max: 255,
    msg: `editorVersion must be 255 characters or less`,
  })
  @Column
  editorVersion: string | null;

  /** An icon to use as the document icon. */
  @Column
  icon: string | null;

  /** The color of the icon. */
  @IsHexColor
  @Column
  color: string | null;

  /**
   * The content of the document as Markdown.
   *
   * @deprecated Use `content` instead, or `DocumentHelper.toMarkdown` if exporting lossy markdown.
   * This column will be removed in a future migration.
   */
  @Column(DataType.TEXT)
  @SkipChangeset
  text: string;

  /** The likely language of the content, in ISO 639-1 format. */
  @Column(DataType.STRING(2))
  @MaxLength(2)
  language: string;

  /**
   * The content of the document as JSON, this is a snapshot at the last time the state was saved.
   */
  @Column(DataType.JSONB)
  @SkipChangeset
  content: ProsemirrorData | null;

  /**
   * The content of the document as YJS collaborative state, this column can be quite large and
   * should only be selected from the DB when the `content` snapshot cannot be used.
   */
  @SimpleLength({
    max: DocumentValidation.maxStateLength,
    msg: `Document collaborative state is too large, you must create a new document`,
  })
  @Column(DataType.BLOB)
  @SkipChangeset
  state?: Uint8Array | null;

  /** Whether this document is part of onboarding. */
  @Default(false)
  @Column
  isWelcome: boolean;

  /** How many versions there are in the history of this document. */
  @IsNumeric
  @Default(0)
  @Column(DataType.INTEGER)
  revisionCount: number;

  /** A score representing the popularity of this document based on views and engagement. */
  @IsFloat
  @Default(0)
  @Column(DataType.FLOAT)
  @SkipChangeset
  popularityScore: number;

  /** Whether the document is published, and if so when. */
  @IsDate
  @Column
  publishedAt: Date | null;

  /** An array of user IDs that have edited this document. */
  @Column(DataType.ARRAY(DataType.UUID))
  collaboratorIds: string[] = [];

  // getters

  /**
   * The frontend path to this document.
   *
   * @deprecated Use `path` instead.
   */
  get url() {
    return this.path;
  }

  /** The frontend path to this document. */
  get path() {
    return Document.getPath({
      title: this.title,
      urlId: this.urlId,
    });
  }

  get tasks() {
    return ProsemirrorHelper.getTasksSummary(
      DocumentHelper.toProsemirror(this)
    );
  }

  /**
   * Returns the key used to store the collaborators of a document in Redis.
   * @param documentId The ID of the document.
   * @returns Redis key for collaborators
   */
  static getCollaboratorKey(documentId: string) {
    return `collaborators:${documentId}`;
  }

  static getPath({ title, urlId }: { title: string; urlId: string }) {
    if (!title.length) {
      return `/doc/untitled-${urlId}`;
    }
    const slugifiedTitle = slugify(title);
    // If the slugified title is empty (e.g., title only had special characters),
    // use "untitled" as a fallback to prevent empty URL segments
    if (!slugifiedTitle) {
      return `/doc/untitled-${urlId}`;
    }
    return `/doc/${slugifiedTitle}-${urlId}`;
  }

  // hooks

  @BeforeSave
  static async updateCollectionStructure(
    model: Document,
    { transaction }: SaveOptions<InferAttributes<Document>>
  ) {
    // templates, drafts, and archived documents don't appear in the structure
    // and so never need to be updated when the title changes
    if (
      model.archivedAt ||
      model.template ||
      !model.publishedAt ||
      !(
        model.changed("title") ||
        model.changed("icon") ||
        model.changed("color")
      ) ||
      !model.collectionId
    ) {
      return;
    }

    const collection = await Collection.findByPk(model.collectionId, {
      includeDocumentStructure: true,
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
    if (
      model.archivedAt ||
      model.template ||
      !model.publishedAt ||
      !model.collectionId
    ) {
      return;
    }

    return this.sequelize!.transaction(async (transaction: Transaction) => {
      const collection = await Collection.findByPk(model.collectionId!, {
        includeDocumentStructure: true,
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
    return (model.urlId = model.urlId || generateUrlId());
  }

  @BeforeCreate
  static setDocumentVersion(model: Document) {
    if (model.version === undefined) {
      model.version = DOCUMENT_VERSION;
    }

    return this.processUpdate(model);
  }

  @BeforeUpdate
  static async processUpdate(model: Document) {
    // ensure documents have a title
    model.title = model.title || "";

    const previousTitle = model.previous("title");
    if (previousTitle && previousTitle !== model.title) {
      if (!model.previousTitles) {
        model.previousTitles = [];
      }

      model.previousTitles = uniq(model.previousTitles.concat(previousTitle));
    }

    // add the current user as a collaborator on this doc
    if (!model.collaboratorIds) {
      model.collaboratorIds = [];
    }

    // backfill content if it's missing
    if (!model.content) {
      model.content = await DocumentHelper.toJSON(model);
    }

    // ensure the last modifying user is a collaborator
    model.collaboratorIds = uniq(
      model.collaboratorIds.concat(model.lastModifiedById)
    );

    // increment revision
    model.revisionCount += 1;
  }

  @BeforeUpdate
  static async checkParentDocument(model: Document, options: SaveOptions) {
    if (
      model.previous("parentDocumentId") === model.parentDocumentId ||
      !model.parentDocumentId
    ) {
      return;
    }

    if (model.parentDocumentId === model.id) {
      throw ValidationError(
        "infinite loop detected, cannot nest a document inside itself"
      );
    }

    const childDocumentIds = await model.findAllChildDocumentIds(
      undefined,
      options
    );
    if (childDocumentIds.includes(model.parentDocumentId)) {
      throw ValidationError(
        "infinite loop detected, cannot nest a document inside itself"
      );
    }
  }

  @AfterUpdate
  static async publishTitleChangeEvent(
    model: Document,
    ctx: APIContext["context"]
  ) {
    if (model.changed("title")) {
      const hookContext = {
        ...ctx,
        event: { publish: true, persist: false },
      } as HookContext;
      await this.insertEvent("title_change", model, hookContext);
    }
  }

  @AfterUpdate
  static notifyCollaborationServer(model: Document, ctx: HookContext) {
    if (model.changed("state") && ctx.transaction && ctx.auth?.user?.id) {
      const actorId = ctx.auth.user.id;
      const transaction = ctx.transaction.parent || ctx.transaction;
      transaction.afterCommit(async () => {
        await APIUpdateExtension.notifyUpdate(model.id, actorId);
      });
    }
  }

  // associations

  @BelongsTo(() => FileOperation, "importId")
  import: FileOperation | null;

  @ForeignKey(() => FileOperation)
  @Column(DataType.UUID)
  importId: string | null;

  @BelongsTo(() => Import, "apiImportId")
  apiImport: Import<any> | null;

  @ForeignKey(() => Import)
  @Column(DataType.UUID)
  apiImportId: string | null;

  @AllowNull
  @Column(DataType.JSONB)
  sourceMetadata: SourceMetadata | null;

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
  collection: Collection | null;

  @BelongsToMany(() => User, () => UserMembership)
  users: User[];

  @ForeignKey(() => Collection)
  @Column(DataType.UUID)
  collectionId?: string | null;

  @HasMany(() => UserMembership)
  memberships: UserMembership[];

  @HasMany(() => GroupMembership, "documentId")
  groupMemberships: GroupMembership[];

  @HasMany(() => Revision)
  revisions: Revision[];

  @HasMany(() => Relationship)
  relationships: Relationship[];

  @HasMany(() => Star)
  starred: Star[];

  @HasMany(() => View)
  views: View[];

  /**
   * Returns an array of unique userIds that are members of a document
   * either via group or direct membership.
   *
   * @param documentId
   * @returns userIds
   */
  static async membershipUserIds(documentId: string) {
    const document = await this.scope("withAllMemberships").findOne({
      where: { id: documentId },
    });
    if (!document) {
      return [];
    }

    const groupMemberships = document.groupMemberships
      .map((gm) => gm.group.groupUsers)
      .flat();
    const membershipUserIds = [
      ...groupMemberships,
      ...document.memberships,
    ].map((membership) => membership.userId);
    return uniq(membershipUserIds);
  }

  static withMembershipScope(
    userId: string,
    options?: FindOptions<Document> & { includeDrafts?: boolean }
  ) {
    return this.scope([
      options?.includeDrafts ? "withDrafts" : "defaultScope",
      "withoutState",
      {
        method: ["withViews", userId],
      },
      {
        method: ["withMembership", userId, options?.paranoid],
      },
    ]);
  }

  /**
   * Overrides the standard findByPk behavior to allow also querying by urlId
   * and loading memberships for a user passed in by `userId`
   *
   * @param id uuid or urlId
   * @param options FindOptions
   * @returns A promise resolving to a document instance or null
   */
  static async findByPk(
    id: Identifier,
    options?: NonNullFindOptions<Document> & AdditionalFindOptions
  ): Promise<Document>;
  static async findByPk(
    id: Identifier,
    options?: FindOptions<Document> & AdditionalFindOptions
  ): Promise<Document | null>;
  static async findByPk(
    id: Identifier,
    options: (NonNullFindOptions<Document> | FindOptions<Document>) &
      AdditionalFindOptions = {}
  ): Promise<Document | null> {
    if (typeof id !== "string") {
      return null;
    }

    const {
      includeViews = true,
      includeState = false,
      userId,
      ...rest
    } = options;

    // allow default preloading of collection membership if `userId` is passed in find options
    // almost every endpoint needs the collection membership to determine policy permissions.
    const scope = this.scope([
      "withDrafts",
      includeState ? "withState" : "withoutState",
      ...((includeViews
        ? [
            {
              method: ["withViews", userId],
            },
          ]
        : []) as ScopeOptions[]),
      {
        method: ["withMembership", userId, rest.paranoid],
      },
    ]);

    if (isUUID(id)) {
      const document = await scope.findOne({
        where: {
          id,
        },
        ...rest,
        rejectOnEmpty: false,
      });

      if (!document && rest.rejectOnEmpty) {
        throw new EmptyResultError(`Document doesn't exist with id: ${id}`);
      }

      return document;
    }

    const match = id.match(UrlHelper.SLUG_URL_REGEX);
    if (match) {
      const document = await scope.findOne({
        where: {
          urlId: match[1],
        },
        ...rest,
        rejectOnEmpty: false,
      });

      if (!document && rest.rejectOnEmpty) {
        throw new EmptyResultError(`Document doesn't exist with id: ${id}`);
      }

      return document;
    }

    return null;
  }

  /**
   * Find many documents by their id, supports filtering by user memberships when `userId`
   * is specified in the options.
   *
   * @param ids An array of document ids
   * @param options FindOptions
   * @returns A promise resolving to the list of documents
   */
  static async findByIds(
    ids: string[],
    options: Omit<FindOptions<Document>, "where"> &
      Omit<AdditionalFindOptions, "rejectOnEmpty"> = {}
  ): Promise<Document[]> {
    const { userId, includeViews = true, includeState, ...rest } = options;

    const user = userId ? await User.findByPk(userId) : null;
    const documents = await this.scope([
      "withDrafts",
      includeState ? "withState" : "withoutState",
      ...((includeViews
        ? [
            {
              method: ["withViews", userId],
            },
          ]
        : []) as ScopeOptions[]),
      {
        method: ["withMembership", userId],
      },
    ]).findAll({
      where: {
        ...(user && { teamId: user.teamId }),
        id: ids,
      },
      ...rest,
    });

    if (!userId) {
      return documents;
    }

    return documents.filter(
      (doc) =>
        (!doc.collection?.isPrivate && !user?.isGuest) ||
        (doc.collection?.memberships.length || 0) > 0 ||
        (doc.collection?.groupMemberships.length || 0) > 0 ||
        doc.memberships.length > 0 ||
        doc.groupMemberships.length > 0
    );
  }

  // instance methods

  /**
   * Whether this document is considered active or not. A document is active if
   * it has not been archived or deleted.
   *
   * @returns boolean
   */
  get isActive(): boolean {
    return !this.archivedAt && !this.deletedAt;
  }

  /**
   * Convenience method that returns whether this document is a draft.
   *
   * @returns boolean
   */
  get isDraft(): boolean {
    return !this.publishedAt;
  }

  /**
   * Returns the title of the document or a default if the document is untitled.
   *
   * @returns boolean
   */
  get titleWithDefault(): string {
    return this.title || "Untitled";
  }

  /**
   * Whether this document was imported during a trial period.
   *
   * @returns boolean
   */
  get isTrialImport() {
    return !!(this.importId && this.sourceMetadata?.trial);
  }

  /**
   * Returns whether this document is a template created at the workspace level.
   */
  get isWorkspaceTemplate() {
    return this.template && !this.collectionId;
  }

  /**
   * Revert the state of the document to match the passed revision.
   *
   * @param revision The revision to revert to.
   */
  restoreFromRevision = async (revision: Revision) => {
    if (revision.documentId !== this.id) {
      throw new Error("Revision does not belong to this document");
    }

    this.content = revision.content;
    this.text = await DocumentHelper.toMarkdown(revision, {
      includeTitle: false,
    });
    this.title = revision.title;
    this.icon = revision.icon;
    this.color = revision.color;
  };

  /**
   * Get a list of users that have collaborated on this document
   *
   * @param options FindOptions
   * @returns A promise that resolve to a list of users
   */
  collaborators = async (options?: FindOptions<User>): Promise<User[]> =>
    await User.findAll({
      ...options,
      where: {
        ...options?.where,
        id: this.collaboratorIds,
      },
    });

  /**
   * Find all of the child documents for this document
   *
   * @param where Omit<WhereOptions<Document>, "parentDocumentId">
   * @param options FindOptions
   * @returns A promise that resolve to a list of documents
   */
  findChildDocuments = async (
    where?: Omit<WhereOptions<Document>, "parentDocumentId">,
    options?: FindOptions<Document>
  ): Promise<Document[]> =>
    await (this.constructor as typeof Document).findAll({
      where: {
        parentDocumentId: this.id,
        ...where,
      },
      ...options,
    });

  /**
   * Calculate all of the document ids that are children of this document by
   * recursively iterating through parentDocumentId references in the most efficient way.
   *
   * @param where query options to further filter the documents
   * @param options FindOptions
   * @returns A promise that resolves to a list of document ids
   */
  findAllChildDocumentIds = async (
    where?: Omit<WhereOptions<Document>, "parentDocumentId">,
    options?: FindOptions<Document>
  ): Promise<string[]> => {
    const findAllChildDocumentIds = async (
      ...parentDocumentId: string[]
    ): Promise<string[]> => {
      const childDocuments = await (
        this.constructor as typeof Document
      ).findAll({
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
          ...(await findAllChildDocumentIds(...childDocumentIds)),
        ];
      }

      return childDocumentIds;
    };

    return findAllChildDocumentIds(this.id);
  };

  publish = async (
    ctx: APIContext,
    {
      index = 0,
      collectionId,
      silent = false,
      event = true,
      data,
    }: {
      index?: number;
      collectionId: string | null | undefined;
      silent?: boolean;
      event?: boolean;
      data?: Record<string, unknown>;
    }
  ): Promise<this> => {
    const { user } = ctx.state.auth;
    const { transaction } = ctx.state;

    // If the document is already published then calling publish should act like
    // a regular save
    if (this.publishedAt) {
      if (event) {
        return this.saveWithCtx(ctx, { silent }, { name: "publish", data });
      } else {
        return this.save({ silent, transaction });
      }
    }

    if (!this.collectionId) {
      this.collectionId = collectionId;
    }

    if (!this.template && this.collectionId) {
      const collection = await Collection.findByPk(this.collectionId, {
        includeDocumentStructure: true,
        transaction,
        lock: Transaction.LOCK.UPDATE,
      });

      if (collection) {
        await collection.addDocumentToStructure(this, index, { transaction });
        if (this.collection) {
          this.collection.documentStructure = collection.documentStructure;
        }
      }
    }

    // Copy the group and user memberships from the parent document, if any
    if (this.parentDocumentId) {
      await GroupMembership.copy(
        {
          documentId: this.parentDocumentId,
        },
        this,
        { transaction }
      );
      await UserMembership.copy(
        {
          documentId: this.parentDocumentId,
        },
        this,
        { transaction }
      );
    }

    this.lastModifiedById = user.id;
    this.updatedBy = user;
    this.publishedAt = new Date();

    if (event) {
      return this.saveWithCtx(ctx, { silent }, { name: "publish", data });
    } else {
      return this.save({ silent, transaction });
    }
  };

  isCollectionDeleted = async () => {
    if (this.deletedAt || this.archivedAt) {
      if (this.collectionId) {
        const collection =
          this.collection ??
          (await Collection.findByPk(this.collectionId, {
            attributes: ["deletedAt"],
            paranoid: false,
          }));

        return !!collection?.deletedAt;
      }
    }
    return false;
  };

  /**
   *
   * @param user User who is performing the action
   * @param options.detach Whether to detach the document from the containing collection
   * @returns Updated document
   */
  unpublishWithCtx = async (ctx: APIContext, options: { detach: boolean }) => {
    // If the document is already a draft then calling unpublish should act like save
    if (!this.publishedAt) {
      return this.save();
    }

    const { user } = ctx.state.auth;
    const { transaction } = ctx.state;

    const collection = this.collectionId
      ? await Collection.findByPk(this.collectionId, {
          includeDocumentStructure: true,
          transaction,
          lock: transaction.LOCK.UPDATE,
        })
      : undefined;

    if (collection) {
      await collection.removeDocumentInStructure(this, { transaction });
      if (this.collection) {
        this.collection.documentStructure = collection.documentStructure;
      }
    }

    // unpublishing a document converts the ownership to yourself, so that it
    // will appear in your drafts rather than the original creators
    this.createdById = user.id;
    this.lastModifiedById = user.id;
    this.createdBy = user;
    this.updatedBy = user;
    this.publishedAt = null;

    if (options.detach) {
      this.collectionId = null;
    }

    return this.saveWithCtx(ctx, undefined, { name: "unpublish" });
  };

  // Moves a document from being visible to the team within a collection
  // to the archived area, where it can be subsequently restored.
  archiveWithCtx = async (ctx: APIContext) => {
    const { transaction } = ctx.state;
    const collection = this.collectionId
      ? await Collection.findByPk(this.collectionId, {
          includeDocumentStructure: true,
          transaction,
          lock: transaction?.LOCK.UPDATE,
        })
      : undefined;

    if (collection) {
      await collection.removeDocumentInStructure(this, { transaction });
      if (this.collection) {
        this.collection.documentStructure = collection.documentStructure;
      }
    }

    await this.archiveWithChildren(ctx);
    return this;
  };

  // Restore an archived document back to being visible to the team
  restoreTo = async (
    ctx: APIContext,
    { collectionId }: { collectionId: string }
  ) => {
    const { transaction } = ctx.state;
    const collection = collectionId
      ? await Collection.findByPk(collectionId, {
          includeDocumentStructure: true,
          transaction,
          lock: transaction?.LOCK.UPDATE,
        })
      : undefined;

    // check to see if the documents parent hasn't been archived also
    // If it has then restore the document to the collection root.
    if (this.parentDocumentId) {
      const parent = await (this.constructor as typeof Document).findOne({
        where: {
          id: this.parentDocumentId,
        },
        transaction,
      });
      if (parent?.isDraft || !parent?.isActive) {
        this.parentDocumentId = null;
      }
    }

    if (!this.template && this.publishedAt && collection?.isActive) {
      await collection.addDocumentToStructure(this, undefined, {
        includeArchived: true,
        transaction,
      });
    }

    if (this.deletedAt) {
      await this.restore({ transaction });
      this.collectionId = collectionId;
      await this.saveWithCtx(ctx, undefined, { name: "restore" });
    }

    if (this.archivedAt) {
      await this.restoreArchivedWithChildren(ctx, { collectionId });
    }

    if (this.collection && collection) {
      // updating the document structure in memory just in case it's later accessed somewhere
      this.collection.documentStructure = collection.documentStructure;
    }
    return this;
  };

  // Delete a document, archived or otherwise.
  delete = (user: User) =>
    this.sequelize.transaction(async (transaction: Transaction) => {
      let deleted = false;

      if (!this.template && this.collectionId) {
        const collection = await Collection.findByPk(this.collectionId!, {
          includeDocumentStructure: true,
          transaction,
          lock: transaction.LOCK.UPDATE,
          paranoid: false,
        });

        if (!this.archivedAt || (this.archivedAt && collection?.archivedAt)) {
          await collection?.deleteDocument(this, { transaction });
          deleted = true;
        }
      }

      if (!deleted) {
        await this.destroy({
          transaction,
        });
        deleted = true;
      }

      this.lastModifiedById = user.id;
      this.updatedBy = user;
      return this.saveWithCtx(createContext({ user, transaction }), undefined, {
        name: "delete",
      });
    });

  getTimestamp = () => Math.round(new Date(this.updatedAt).getTime() / 1000);

  getSummary = () => {
    if (this.summary) {
      return this.summary;
    }

    const plainText = DocumentHelper.toPlainText(this);
    const lines = compact(plainText.split("\n"));
    const notEmpty = lines.length >= 1;

    if (this.version) {
      return notEmpty ? lines[0] : "";
    }

    return notEmpty ? lines[1] : "";
  };

  /**
   * Returns a JSON representation of the document suitable for use in the
   * collection documentStructure.
   *
   * @param options Optional transaction to use for the query
   * @returns Promise resolving to a NavigationNode
   */
  toNavigationNode = async (
    options?: FindOptions<Document> & { includeArchived?: boolean }
  ): Promise<NavigationNode> => {
    // Checking if the record is new is a performance optimization – new docs cannot have children
    const childDocuments = this.isNewRecord
      ? []
      : await (this.constructor as typeof Document).unscoped().findAll({
          where: options?.includeArchived
            ? {
                teamId: this.teamId,
                parentDocumentId: this.id,
                publishedAt: {
                  [Op.ne]: null,
                },
              }
            : {
                teamId: this.teamId,
                parentDocumentId: this.id,
                publishedAt: {
                  [Op.ne]: null,
                },
                archivedAt: {
                  [Op.is]: null,
                },
              },
          transaction: options?.transaction,
        });

    const children = await Promise.all(
      childDocuments.map((child) => child.toNavigationNode(options))
    );

    return {
      id: this.id,
      title: this.title,
      url: this.url,
      icon: isNil(this.icon) ? undefined : this.icon,
      color: isNil(this.color) ? undefined : this.color,
      children,
    };
  };

  private restoreArchivedWithChildren = async (
    ctx: APIContext,
    { collectionId }: { collectionId: string }
  ) => {
    const { user } = ctx.state.auth;
    const { transaction } = ctx.state;

    const restoreChildren = async (parentDocumentId: string) => {
      const childDocuments = await (
        this.constructor as typeof Document
      ).findAll({
        where: {
          parentDocumentId,
        },
        transaction,
      });
      for (const child of childDocuments) {
        await restoreChildren(child.id);
        child.archivedAt = null;
        child.lastModifiedById = user.id;
        child.updatedBy = user;
        child.collectionId = collectionId;
        await child.save({ transaction });
      }
    };

    await restoreChildren(this.id);
    this.archivedAt = null;
    this.lastModifiedById = user.id;
    this.updatedBy = user;
    this.collectionId = collectionId;
    return this.saveWithCtx(ctx, undefined, { name: "unarchive" });
  };

  private archiveWithChildren = async (ctx: APIContext) => {
    const { user } = ctx.state.auth;
    const { transaction } = ctx.state;
    const archivedAt = new Date();

    // Helper to archive all child documents for a document
    const archiveChildren = async (parentDocumentId: string) => {
      const childDocuments = await (
        this.constructor as typeof Document
      ).findAll({
        where: {
          parentDocumentId,
        },
        transaction,
      });
      for (const child of childDocuments) {
        await archiveChildren(child.id);
        child.archivedAt = archivedAt;
        child.lastModifiedById = user.id;
        child.updatedBy = user;
        await child.save({ transaction });
      }
    };

    await archiveChildren(this.id);
    this.archivedAt = archivedAt;
    this.lastModifiedById = user.id;
    this.updatedBy = user;
    return this.saveWithCtx(ctx, undefined, { name: "archive" });
  };
}

export default Document;
