import { compact, uniq } from "lodash";
import randomstring from "randomstring";
import type { SaveOptions } from "sequelize";
import {
  Sequelize,
  Transaction,
  Op,
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
import isUUID from "validator/lib/isUUID";
import type { NavigationNode } from "@shared/types";
import getTasks from "@shared/utils/getTasks";
import parseTitle from "@shared/utils/parseTitle";
import { SLUG_URL_REGEX } from "@shared/utils/urlHelpers";
import { DocumentValidation } from "@shared/validations";
import slugify from "@server/utils/slugify";
import Backlink from "./Backlink";
import Collection from "./Collection";
import FileOperation from "./FileOperation";
import Revision from "./Revision";
import Star from "./Star";
import Team from "./Team";
import User from "./User";
import View from "./View";
import ParanoidModel from "./base/ParanoidModel";
import Fix from "./decorators/Fix";
import DocumentHelper from "./helpers/DocumentHelper";
import Length from "./validators/Length";

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
    max: DocumentValidation.maxTitleLength,
    msg: `Document title must be ${DocumentValidation.maxTitleLength} characters or less`,
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

  @Length({
    max: 1,
    msg: `Emoji must be a single character`,
  })
  @Column
  emoji: string | null;

  @Column(DataType.TEXT)
  text: string;

  @SimpleLength({
    max: DocumentValidation.maxStateLength,
    msg: `Document collaborative state is too large, you must create a new document`,
  })
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
      !model.changed("title") ||
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
    const { emoji } = parseTitle(model.title);
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

  @BelongsTo(() => FileOperation, "importId")
  import: FileOperation | null;

  @ForeignKey(() => FileOperation)
  @Column(DataType.UUID)
  importId: string | null;

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

  @ForeignKey(() => Collection)
  @Column(DataType.UUID)
  collectionId?: string | null;

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

  get titleWithDefault(): string {
    return this.title || "Untitled";
  }

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
   * Calculate all of the document ids that are children of this document by
   * iterating through parentDocumentId references in the most efficient way.
   *
   * @param where query options to further filter the documents
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
      const childDocuments = await (
        this.constructor as typeof Document
      ).findAll({
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

  publish = async (
    userId: string,
    collectionId: string,
    { transaction }: SaveOptions<Document>
  ) => {
    // If the document is already published then calling publish should act like
    // a regular save
    if (this.publishedAt) {
      return this.save({ transaction });
    }

    if (!this.collectionId) {
      this.collectionId = collectionId;
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
      const collection = this.collectionId
        ? await Collection.findByPk(this.collectionId, {
            transaction,
            lock: transaction.LOCK.UPDATE,
          })
        : undefined;

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
      const collection = this.collectionId
        ? await Collection.findByPk(this.collectionId, {
            transaction,
            lock: transaction.LOCK.UPDATE,
          })
        : undefined;

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
  delete = (userId: string) =>
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

  getTimestamp = () => Math.round(new Date(this.updatedAt).getTime() / 1000);

  getSummary = () => {
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
  toNavigationNode = async (options?: {
    transaction?: Transaction | null | undefined;
  }): Promise<NavigationNode> => {
    const childDocuments = await (this.constructor as typeof Document)
      .unscoped()
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
      children,
    };
  };
}

export default Document;
