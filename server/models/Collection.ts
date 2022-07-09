import { find, findIndex, remove, uniq } from "lodash";
import randomstring from "randomstring";
import { Identifier, Transaction, Op, FindOptions } from "sequelize";
import {
  Sequelize,
  Table,
  Column,
  Unique,
  IsIn,
  Default,
  BeforeValidate,
  BeforeSave,
  AfterDestroy,
  AfterCreate,
  HasMany,
  BelongsToMany,
  BelongsTo,
  ForeignKey,
  Scopes,
  DataType,
  Length as SimpleLength,
} from "sequelize-typescript";
import isUUID from "validator/lib/isUUID";
import { MAX_TITLE_LENGTH } from "@shared/constants";
import { sortNavigationNodes } from "@shared/utils/collections";
import { SLUG_URL_REGEX } from "@shared/utils/urlHelpers";
import slugify from "@server/utils/slugify";
import { NavigationNode, CollectionSort } from "~/types";
import CollectionGroup from "./CollectionGroup";
import CollectionUser from "./CollectionUser";
import Document from "./Document";
import Group from "./Group";
import GroupUser from "./GroupUser";
import Team from "./Team";
import User from "./User";
import ParanoidModel from "./base/ParanoidModel";
import Fix from "./decorators/Fix";
import IsHexColor from "./validators/IsHexColor";
import Length from "./validators/Length";
import NotContainsUrl from "./validators/NotContainsUrl";

// without this indirection, the app crashes on starup
type Sort = CollectionSort;

@Scopes(() => ({
  withAllMemberships: {
    include: [
      {
        model: CollectionUser,
        as: "memberships",
        required: false,
      },
      {
        model: CollectionGroup,
        as: "collectionGroupMemberships",
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
                as: "groupMemberships",
                required: true,
              },
            ],
          },
        ],
      },
    ],
  },
  withUser: () => ({
    include: [
      {
        model: User,
        required: true,
        as: "user",
      },
    ],
  }),
  withMembership: (userId: string) => ({
    include: [
      {
        model: CollectionUser,
        as: "memberships",
        where: {
          userId,
        },
        required: false,
      },
      {
        model: CollectionGroup,
        as: "collectionGroupMemberships",
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
                as: "groupMemberships",
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
  }),
}))
@Table({ tableName: "collections", modelName: "collection" })
@Fix
class Collection extends ParanoidModel {
  @SimpleLength({
    min: 10,
    max: 10,
    msg: `urlId must be 10 characters`,
  })
  @Unique
  @Column
  urlId: string;

  @NotContainsUrl
  @Length({
    max: MAX_TITLE_LENGTH,
    msg: `name must be ${MAX_TITLE_LENGTH} characters or less`,
  })
  @Column
  name: string;

  @Length({
    max: 1000,
    msg: `description must be 1000 characters or less`,
  })
  @Column
  description: string;

  @Length({
    max: 50,
    msg: `icon must be 50 characters or less`,
  })
  @Column
  icon: string | null;

  @IsHexColor
  @Column
  color: string | null;

  @Length({
    max: 50,
    msg: `index must 50 characters or less`,
  })
  @Column
  index: string | null;

  @IsIn([["read", "read_write"]])
  @Column
  permission: "read" | "read_write" | null;

  @Default(false)
  @Column
  maintainerApprovalRequired: boolean;

  @Column(DataType.JSONB)
  documentStructure: NavigationNode[] | null;

  @Default(true)
  @Column
  sharing: boolean;

  @Default({ field: "title", direction: "asc" })
  @Column({
    type: DataType.JSONB,
    validate: {
      isSort(value: Sort) {
        if (
          typeof value !== "object" ||
          !value.direction ||
          !value.field ||
          Object.keys(value).length !== 2
        ) {
          throw new Error("Sort must be an object with field,direction");
        }

        if (!["asc", "desc"].includes(value.direction)) {
          throw new Error("Sort direction must be one of asc,desc");
        }

        if (!["title", "index"].includes(value.field)) {
          throw new Error("Sort field must be one of title,index");
        }
      },
    },
  })
  sort: Sort;

  // getters

  get url(): string {
    if (!this.name) {
      return `/collection/untitled-${this.urlId}`;
    }
    return `/collection/${slugify(this.name)}-${this.urlId}`;
  }

  // hooks

  @BeforeValidate
  static async onBeforeValidate(model: Collection) {
    model.urlId = model.urlId || randomstring.generate(10);
  }

  @BeforeSave
  static async onBeforeSave(model: Collection) {
    if (model.icon === "collection") {
      model.icon = null;
    }
  }

  @AfterDestroy
  static async onAfterDestroy(model: Collection) {
    await Document.destroy({
      where: {
        collectionId: model.id,
        archivedAt: {
          [Op.is]: null,
        },
      },
    });
  }

  @AfterCreate
  static async onAfterCreate(
    model: Collection,
    options: { transaction: Transaction }
  ) {
    if (model.permission !== "read_write") {
      return CollectionUser.findOrCreate({
        where: {
          collectionId: model.id,
          userId: model.createdById,
        },
        defaults: {
          permission: "read_write",
          createdById: model.createdById,
        },
        transaction: options.transaction,
      });
    }

    return undefined;
  }

  // associations

  @HasMany(() => Document, "collectionId")
  documents: Document[];

  @HasMany(() => CollectionUser, "collectionId")
  memberships: CollectionUser[];

  @HasMany(() => CollectionGroup, "collectionId")
  collectionGroupMemberships: CollectionGroup[];

  @BelongsToMany(() => User, () => CollectionUser)
  users: User[];

  @BelongsToMany(() => Group, () => CollectionGroup)
  groups: Group[];

  @BelongsTo(() => User, "createdById")
  user: User;

  @ForeignKey(() => User)
  @Column(DataType.UUID)
  createdById: string;

  @BelongsTo(() => Team, "teamId")
  team: Team;

  @ForeignKey(() => Team)
  @Column(DataType.UUID)
  teamId: string;

  static DEFAULT_SORT = {
    field: "index",
    direction: "asc",
  };

  /**
   * Returns an array of unique userIds that are members of a collection,
   * either via group or direct membership
   *
   * @param collectionId
   * @returns userIds
   */
  static async membershipUserIds(collectionId: string) {
    const collection = await this.scope("withAllMemberships").findByPk(
      collectionId
    );

    if (!collection) {
      return [];
    }

    const groupMemberships = collection.collectionGroupMemberships
      .map((cgm) => cgm.group.groupMemberships)
      .flat();
    const membershipUserIds = [
      ...groupMemberships,
      ...collection.memberships,
    ].map((membership) => membership.userId);
    return uniq(membershipUserIds);
  }

  /**
   * Overrides the standard findByPk behavior to allow also querying by urlId
   *
   * @param id uuid or urlId
   * @returns collection instance
   */
  static async findByPk(
    id: Identifier,
    options: FindOptions<Collection> = {}
  ): Promise<Collection | null> {
    if (typeof id !== "string") {
      return null;
    }

    if (isUUID(id)) {
      return this.findOne({
        where: {
          id,
        },
        ...options,
      });
    }

    const match = id.match(SLUG_URL_REGEX);
    if (match) {
      return this.findOne({
        where: {
          urlId: match[1],
        },
        ...options,
      });
    }

    return null;
  }

  /**
   * Find the first collection that the specified user has access to.
   *
   * @param user User object
   * @returns collection First collection in the sidebar order
   */
  static async findFirstCollectionForUser(user: User) {
    const id = await user.collectionIds();
    return this.findOne({
      where: {
        id,
      },
      order: [
        // using LC_COLLATE:"C" because we need byte order to drive the sorting
        Sequelize.literal('"collection"."index" collate "C"'),
        ["updatedAt", "DESC"],
      ],
    });
  }

  getDocumentTree = (documentId: string): NavigationNode | null => {
    if (!this.documentStructure) {
      return null;
    }

    let result!: NavigationNode | undefined;

    const loopChildren = (documents: NavigationNode[]) => {
      if (result) {
        return;
      }

      documents.forEach((document) => {
        if (result) {
          return;
        }

        if (document.id === documentId) {
          result = document;
        } else {
          loopChildren(document.children);
        }
      });
    };

    // Technically, sorting the children is presenter-layer work...
    // but the only place it's used passes straight into an API response
    // so the extra indirection is not worthwhile
    loopChildren(this.documentStructure);

    // if the document is a draft loopChildren will not find it in the structure
    if (!result) {
      return null;
    }

    return {
      ...result,
      children: sortNavigationNodes(result.children, this.sort),
    };
  };

  deleteDocument = async function (document: Document, options?: FindOptions) {
    await this.removeDocumentInStructure(document, options);

    // Helper to destroy all child documents for a document
    const loopChildren = async (
      documentId: string,
      opts?: FindOptions<Document>
    ) => {
      const childDocuments = await Document.findAll({
        where: {
          parentDocumentId: documentId,
        },
      });
      childDocuments.forEach(async (child) => {
        await loopChildren(child.id, opts);
        await child.destroy(opts);
      });
    };

    await loopChildren(document.id, options);
    await document.destroy(options);
  };

  removeDocumentInStructure = async function (
    document: Document,
    options?: FindOptions & {
      save?: boolean;
    }
  ) {
    if (!this.documentStructure) {
      return;
    }

    let result: [NavigationNode, number] | undefined;

    const removeFromChildren = async (
      children: NavigationNode[],
      id: string
    ) => {
      children = await Promise.all(
        children.map(async (childDocument) => {
          return {
            ...childDocument,
            children: await removeFromChildren(childDocument.children, id),
          };
        })
      );
      const match = find(children, {
        id,
      });

      if (match) {
        if (!result) {
          result = [
            match,
            findIndex(children, {
              id,
            }),
          ];
        }

        remove(children, {
          id,
        });
      }

      return children;
    };

    this.documentStructure = await removeFromChildren(
      this.documentStructure,
      document.id
    );

    // Sequelize doesn't seem to set the value with splice on JSONB field
    // https://github.com/sequelize/sequelize/blob/e1446837196c07b8ff0c23359b958d68af40fd6d/src/model.js#L3937
    this.changed("documentStructure", true);

    if (options?.save !== false) {
      await this.save({
        ...options,
        fields: ["documentStructure"],
      });
    }

    return result;
  };

  getDocumentParents = function (documentId: string): string[] | void {
    let result!: string[];

    const loopChildren = (documents: NavigationNode[], path: string[] = []) => {
      if (result) {
        return;
      }

      documents.forEach((document) => {
        if (document.id === documentId) {
          result = path;
        } else {
          loopChildren(document.children, [...path, document.id]);
        }
      });
    };

    if (this.documentStructure) {
      loopChildren(this.documentStructure);
    }

    return result;
  };

  /**
   * Update document's title and url in the documentStructure
   */
  updateDocument = async function (
    updatedDocument: Document,
    options?: { transaction?: Transaction | null }
  ) {
    if (!this.documentStructure) {
      return;
    }

    const { id } = updatedDocument;

    const updateChildren = (documents: NavigationNode[]) => {
      return documents.map((document) => {
        if (document.id === id) {
          document = {
            ...(updatedDocument.toJSON() as NavigationNode),
            children: document.children,
          };
        } else {
          document.children = updateChildren(document.children);
        }

        return document;
      });
    };

    this.documentStructure = updateChildren(this.documentStructure);
    // Sequelize doesn't seem to set the value with splice on JSONB field
    // https://github.com/sequelize/sequelize/blob/e1446837196c07b8ff0c23359b958d68af40fd6d/src/model.js#L3937
    this.changed("documentStructure", true);
    await this.save({
      fields: ["documentStructure"],
      ...options,
    });

    return this;
  };

  addDocumentToStructure = async function (
    document: Document,
    index?: number,
    options: FindOptions & {
      save?: boolean;
      documentJson?: NavigationNode;
    } = {}
  ) {
    if (!this.documentStructure) {
      this.documentStructure = [];
    }

    // If moving existing document with children, use existing structure
    const documentJson = { ...document.toJSON(), ...options.documentJson };

    if (!document.parentDocumentId) {
      // Note: Index is supported on DB level but it's being ignored
      // by the API presentation until we build product support for it.
      this.documentStructure.splice(
        index !== undefined ? index : this.documentStructure.length,
        0,
        documentJson
      );
    } else {
      // Recursively place document
      const placeDocument = (documentList: NavigationNode[]) => {
        return documentList.map((childDocument) => {
          if (document.parentDocumentId === childDocument.id) {
            childDocument.children.splice(
              index !== undefined ? index : childDocument.children.length,
              0,
              documentJson
            );
          } else {
            childDocument.children = placeDocument(childDocument.children);
          }

          return childDocument;
        });
      };

      this.documentStructure = placeDocument(this.documentStructure);
    }

    // Sequelize doesn't seem to set the value with splice on JSONB field
    // https://github.com/sequelize/sequelize/blob/e1446837196c07b8ff0c23359b958d68af40fd6d/src/model.js#L3937
    this.changed("documentStructure", true);

    if (options?.save !== false) {
      await this.save({
        ...options,
        fields: ["documentStructure"],
      });
    }

    return this;
  };
}

export default Collection;
