/* eslint-disable lines-between-class-members */
import compact from "lodash/compact";
import isNil from "lodash/isNil";
import uniq from "lodash/uniq";
import type {
  Identifier,
  InferAttributes,
  InferCreationAttributes,
  NonNullFindOptions,
  SaveOptions,
} from "sequelize";
import {
  Sequelize,
  Transaction,
  Op,
  FindOptions,
  ScopeOptions,
  WhereOptions,
  EmptyResultError,
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
  AllowNull,
  BelongsToMany,
} from "sequelize-typescript";
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
import Backlink from "./Backlink";
import Collection from "./Collection";
import FileOperation from "./FileOperation";
import Revision from "./Revision";
import Star from "./Star";
import Team from "./Team";
import User from "./User";
import UserMembership from "./UserMembership";
import View from "./View";
import ParanoidModel from "./base/ParanoidModel";
import Fix from "./decorators/Fix";
import { DocumentHelper } from "./helpers/DocumentHelper";
import IsHexColor from "./validators/IsHexColor";
import Length from "./validators/Length";

export const DOCUMENT_VERSION = 2;

type AdditionalFindOptions = {
  userId?: string;
  includeState?: boolean;
  rejectOnEmpty?: boolean | Error;
};

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
}))
@Scopes(() => ({
  withCollectionPermissions: (userId: string, paranoid = true) => ({
    include: [
      {
        attributes: ["id", "permission", "sharing", "teamId", "deletedAt"],
        model: userId
          ? Collection.scope({
              method: ["withMembership", userId],
            })
          : Collection,
        as: "collection",
        paranoid,
      },
    ],
  }),
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
  withStateIsEmpty: {
    attributes: {
      exclude: ["state"],
      include: [
        [
          Sequelize.literal(`CASE WHEN state IS NULL THEN true ELSE false END`),
          "stateIsEmpty",
        ],
      ],
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
  withMembership: (userId: string) => {
    if (!userId) {
      return {};
    }
    return {
      include: [
        {
          association: "memberships",
          where: {
            userId,
          },
          required: false,
        },
      ],
    };
  },
  withAllMemberships: {
    include: [
      {
        association: "memberships",
      },
    ],
  },
}))
@Table({ tableName: "documents", modelName: "document" })
@Fix
class Document extends ParanoidModel<
  InferAttributes<Document>,
  Partial<InferCreationAttributes<Document>>
> {
  @SimpleLength({
    min: 10,
    max: 10,
    msg: `urlId must be 10 characters`,
  })
  @PrimaryKey
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
  editorVersion: string;

  /** An icon to use as the document icon. */
  @Length({
    max: 50,
    msg: `icon must be 50 characters or less`,
  })
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
  text: string;

  /**
   * The content of the document as JSON, this is a snapshot at the last time the state was saved.
   */
  @Column(DataType.JSONB)
  content: ProsemirrorData;

  /**
   * The content of the document as YJS collaborative state, this column can be quite large and
   * should only be selected from the DB when the `content` snapshot cannot be used.
   */
  @SimpleLength({
    max: DocumentValidation.maxStateLength,
    msg: `Document collaborative state is too large, you must create a new document`,
  })
  @Column(DataType.BLOB)
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

  /** Whether the document is archvied, and if so when. */
  @IsDate
  @Column
  archivedAt: Date | null;

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
    if (!this.title) {
      return `/doc/untitled-${this.urlId}`;
    }
    const slugifiedTitle = slugify(this.title);
    return `/doc/${slugifiedTitle}-${this.urlId}`;
  }

  get tasks() {
    return ProsemirrorHelper.getTasksSummary(
      DocumentHelper.toProsemirror(this)
    );
  }

  static getPath({ title, urlId }: { title: string; urlId: string }) {
    if (!title.length) {
      return `/doc/untitled-${urlId}`;
    }
    return `/doc/${slugify(title)}-${urlId}`;
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

  // associations

  @BelongsTo(() => FileOperation, "importId")
  import: FileOperation | null;

  @ForeignKey(() => FileOperation)
  @Column(DataType.UUID)
  importId: string | null;

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
  collection: Collection | null | undefined;

  @BelongsToMany(() => User, () => UserMembership)
  users: User[];

  @ForeignKey(() => Collection)
  @Column(DataType.UUID)
  collectionId?: string | null;

  @HasMany(() => UserMembership)
  memberships: UserMembership[];

  @HasMany(() => Revision)
  revisions: Revision[];

  @HasMany(() => Backlink)
  backlinks: Backlink[];

  @HasMany(() => Star)
  starred: Star[];

  @HasMany(() => View)
  views: View[];

  /**
   * Returns an array of unique userIds that are members of a document via direct membership
   *
   * @param documentId
   * @returns userIds
   */
  static async membershipUserIds(documentId: string) {
    const document = await this.scope("withAllMemberships").findOne({
      where: {
        id: documentId,
      },
    });
    if (!document) {
      return [];
    }

    return document.memberships.map((membership) => membership.userId);
  }

  static defaultScopeWithUser(userId: string) {
    const collectionScope: Readonly<ScopeOptions> = {
      method: ["withCollectionPermissions", userId],
    };
    const viewScope: Readonly<ScopeOptions> = {
      method: ["withViews", userId],
    };
    const membershipScope: Readonly<ScopeOptions> = {
      method: ["withMembership", userId],
    };
    return this.scope([
      "defaultScope",
      collectionScope,
      viewScope,
      membershipScope,
    ]);
  }

  /**
   * Overrides the standard findByPk behavior to allow also querying by urlId
   *
   * @param id uuid or urlId
   * @param options FindOptions
   * @returns A promise resolving to a collection instance or null
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

    const { includeState, userId, ...rest } = options;

    // allow default preloading of collection membership if `userId` is passed in find options
    // almost every endpoint needs the collection membership to determine policy permissions.
    const scope = this.scope([
      "withDrafts",
      {
        method: ["withCollectionPermissions", userId, rest.paranoid],
      },
      {
        method: ["withViews", userId],
      },
      {
        method: ["withMembership", userId],
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
  restoreFromRevision = (revision: Revision) => {
    if (revision.documentId !== this.id) {
      throw new Error("Revision does not belong to this document");
    }

    this.content = revision.content;
    this.text = revision.text;
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
  collaborators = async (options?: FindOptions<User>): Promise<User[]> => {
    const users = await Promise.all(
      this.collaboratorIds.map((collaboratorId) =>
        User.findByPk(collaboratorId, options)
      )
    );

    return compact(users);
  };

  /**
   * Find all of the child documents for this document
   *
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
    user: User,
    collectionId: string | null | undefined,
    options: SaveOptions
  ): Promise<this> => {
    const { transaction } = options;

    // If the document is already published then calling publish should act like
    // a regular save
    if (this.publishedAt) {
      return this.save(options);
    }

    if (!this.collectionId) {
      this.collectionId = collectionId;
    }

    if (!this.template && this.collectionId) {
      const collection = await Collection.findByPk(this.collectionId, {
        transaction,
        lock: Transaction.LOCK.UPDATE,
      });

      if (collection) {
        await collection.addDocumentToStructure(this, 0, { transaction });
        if (this.collection) {
          this.collection.documentStructure = collection.documentStructure;
        }
      }
    }

    const parentDocumentPermissions = this.parentDocumentId
      ? await UserMembership.findAll({
          where: {
            documentId: this.parentDocumentId,
          },
          transaction,
        })
      : [];

    await Promise.all(
      parentDocumentPermissions.map((permission) =>
        UserMembership.create(
          {
            documentId: this.id,
            userId: permission.userId,
            sourceId: permission.sourceId ?? permission.id,
            permission: permission.permission,
            createdById: permission.createdById,
          },
          {
            transaction,
          }
        )
      )
    );

    this.lastModifiedById = user.id;
    this.updatedBy = user;
    this.publishedAt = new Date();
    return this.save(options);
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

  unpublish = async (user: User) => {
    // If the document is already a draft then calling unpublish should act like save
    if (!this.publishedAt) {
      return this.save();
    }

    await this.sequelize.transaction(async (transaction: Transaction) => {
      const collection = this.collectionId
        ? await Collection.findByPk(this.collectionId, {
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
    });

    // unpublishing a document converts the ownership to yourself, so that it
    // will appear in your drafts rather than the original creators
    this.createdById = user.id;
    this.lastModifiedById = user.id;
    this.createdBy = user;
    this.updatedBy = user;
    this.publishedAt = null;
    return this.save();
  };

  // Moves a document from being visible to the team within a collection
  // to the archived area, where it can be subsequently restored.
  archive = async (user: User) => {
    await this.sequelize.transaction(async (transaction: Transaction) => {
      const collection = this.collectionId
        ? await Collection.findByPk(this.collectionId, {
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
    });

    await this.archiveWithChildren(user);
    return this;
  };

  // Restore an archived document back to being visible to the team
  unarchive = async (user: User) => {
    await this.sequelize.transaction(async (transaction: Transaction) => {
      const collection = this.collectionId
        ? await Collection.findByPk(this.collectionId, {
            transaction,
            lock: transaction.LOCK.UPDATE,
          })
        : undefined;

      // check to see if the documents parent hasn't been archived also
      // If it has then restore the document to the collection root.
      if (this.parentDocumentId) {
        const parent = await (this.constructor as typeof Document).findOne({
          where: {
            id: this.parentDocumentId,
          },
        });
        if (parent?.isDraft || !parent?.isActive) {
          this.parentDocumentId = null;
        }
      }

      if (!this.template && this.publishedAt && collection) {
        await collection.addDocumentToStructure(this, undefined, {
          transaction,
        });
        if (this.collection) {
          this.collection.documentStructure = collection.documentStructure;
        }
      }
    });

    if (this.deletedAt) {
      await this.restore();
    }

    this.archivedAt = null;
    this.lastModifiedById = user.id;
    this.updatedBy = user;
    await this.save();
    return this;
  };

  // Delete a document, archived or otherwise.
  delete = (user: User) =>
    this.sequelize.transaction(async (transaction: Transaction) => {
      if (!this.archivedAt && !this.template && this.collectionId) {
        // delete any children and remove from the document structure
        const collection = await Collection.findByPk(this.collectionId, {
          transaction,
          lock: transaction.LOCK.UPDATE,
          paranoid: false,
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

      this.lastModifiedById = user.id;
      this.updatedBy = user;
      return this.save({ transaction });
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
    options?: FindOptions<Document>
  ): Promise<NavigationNode> => {
    // Checking if the record is new is a performance optimization – new docs cannot have children
    const childDocuments = this.isNewRecord
      ? []
      : await (this.constructor as typeof Document)
          .unscoped()
          .scope("withoutState")
          .findAll({
            where: {
              teamId: this.teamId,
              parentDocumentId: this.id,
              archivedAt: {
                [Op.is]: null,
              },
              publishedAt: {
                [Op.ne]: null,
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

  private archiveWithChildren = async (
    user: User,
    options?: FindOptions<Document>
  ) => {
    const archivedAt = new Date();

    // Helper to archive all child documents for a document
    const archiveChildren = async (parentDocumentId: string) => {
      const childDocuments = await (
        this.constructor as typeof Document
      ).findAll({
        where: {
          parentDocumentId,
        },
      });
      for (const child of childDocuments) {
        await archiveChildren(child.id);
        child.archivedAt = archivedAt;
        child.lastModifiedById = user.id;
        child.updatedBy = user;
        await child.save(options);
      }
    };

    await archiveChildren(this.id);
    this.archivedAt = archivedAt;
    this.lastModifiedById = user.id;
    this.updatedBy = user;
    return this.save(options);
  };
}

export default Document;
