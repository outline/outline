import { find, findIndex, concat, remove, uniq } from "lodash";
import randomstring from "randomstring";
import { Identifier, Transaction, Op } from "sequelize";
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
} from "sequelize-typescript";
import isUUID from "validator/lib/isUUID";
import { SLUG_URL_REGEX } from "@shared/utils/routeHelpers";
import { sequelize } from "@server/sequelize";
import slugify from "@server/utils/slugify";
import { NavigationNode } from "~/types";
import CollectionGroup from "./CollectionGroup";
import CollectionUser from "./CollectionUser";
import Document from "./Document";
import Group from "./Group";
import GroupUser from "./GroupUser";
import Team from "./Team";
import User from "./User";
import ParanoidModel from "./base/ParanoidModel";

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
class Collection extends ParanoidModel {
  @Column
  @Unique
  urlId: string;

  @Column
  name: string;

  @Column
  description: string;

  @Column
  icon: string | null;

  @Column
  color: string | null;

  @Column
  index: string | null;

  @Column
  @IsIn([["read", "read_write"]])
  permission: "read" | "read_write" | null;

  @Column
  @Default(false)
  maintainerApprovalRequired: boolean;

  @Column
  documentStructure: NavigationNode[] | null;

  @Column
  @Default(true)
  sharing: boolean;

  @Column({
    validate: {
      isSort(value: any) {
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
  sort: {
    field: string;
    direction: "asc" | "desc";
  };

  // getters

  get url(): string {
    if (!this.name) return `/collection/untitled-${this.urlId}`;
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
          [Op.eq]: null,
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

  @BelongsToMany(() => CollectionUser, "collectionId")
  users: CollectionUser[];

  @BelongsToMany(() => CollectionGroup, "collectionId")
  groups: CollectionGroup[];

  @BelongsTo(() => User, "createdById")
  user: User;

  @ForeignKey(() => User)
  @Column
  createdById: string;

  @BelongsTo(() => Team, "teamId")
  team: Team;

  @ForeignKey(() => Team)
  @Column
  teamId: string;

  static DEFAULT_SORT = {
    field: "index",
    direction: "asc",
  };

  static membershipUserIds = async (collectionId: string) => {
    const collection = await Collection.scope("withAllMemberships").findByPk(
      collectionId
    );

    if (!collection) {
      return [];
    }

    const groupMemberships = collection.collectionGroupMemberships
      .map((cgm) => cgm.group.groupMemberships)
      .flat();
    const membershipUserIds = concat(
      groupMemberships,
      collection.memberships
    ).map((membership) => membership.userId);
    return uniq(membershipUserIds);
  };

  static async findByPk(id: Identifier, options = {}) {
    if (typeof id !== "string") {
      return undefined;
    }

    if (isUUID(id)) {
      return Collection.findOne({
        where: {
          id,
        },
        ...options,
      });
    }

    const match = id.match(SLUG_URL_REGEX);
    if (match) {
      return Collection.findOne({
        where: {
          urlId: match[1],
        },
        ...options,
      });
    }

    return undefined;
  }

  /**
   * Find the first collection that the specified user has access to.
   *
   * @param user User object
   * @returns collection First collection in the sidebar order
   */
  static async findFirstCollectionForUser(user: User) {
    const id = await user.collectionIds();
    return Collection.findOne({
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

  getDocumentTree = function (documentId: string): NavigationNode {
    let result: NavigationNode;

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

    loopChildren(this.documentStructure);

    // @ts-expect-error used before undefined
    return result;
  };

  deleteDocument = async function (document: Document) {
    await this.removeDocumentInStructure(document);
    await document.deleteWithChildren();
  };

  removeDocumentInStructure = async function (
    document: Document,
    options: any
  ) {
    if (!this.documentStructure) return;
    // @ts-expect-error ts-migrate(7034) FIXME: Variable 'returnValue' implicitly has type 'any' i... Remove this comment to see the full error message
    let result;
    let transaction;

    try {
      // documentStructure can only be updated by one request at the time
      transaction = await sequelize.transaction();

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
          // @ts-expect-error ts-migrate(7005) FIXME: Variable 'returnValue' implicitly has an 'any' typ... Remove this comment to see the full error message
          if (!result)
            result = [
              match,
              findIndex(children, {
                id,
              }),
            ];
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
      await this.save({
        ...options,
        fields: ["documentStructure"],
        transaction,
      });
      await transaction.commit();
    } catch (err) {
      if (transaction) {
        await transaction.rollback();
      }

      throw err;
    }

    return result;
  };

  getDocumentParents = function (documentId: string): string[] | void {
    let result: string[];

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

    // @ts-expect-error used before undefined
    return result;
  };

  isChildDocument = function (
    parentDocumentId: string,
    documentId: string
  ): boolean {
    let result = false;

    const loopChildren = (documents: NavigationNode[], input: string[]) => {
      if (result) {
        return;
      }

      documents.forEach((document) => {
        const parents = [...input];

        if (document.id === documentId) {
          result = parents.includes(parentDocumentId);
        } else {
          parents.push(document.id);
          loopChildren(document.children, parents);
        }
      });
    };

    loopChildren(this.documentStructure, []);
    return result;
  };

  /**
   * Update document's title and url in the documentStructure
   */
  updateDocument = async function (updatedDocument: Document) {
    if (!this.documentStructure) return;
    let transaction;

    try {
      // documentStructure can only be updated by one request at the time
      transaction = await sequelize.transaction();
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
        transaction,
      });
      await transaction.commit();
    } catch (err) {
      if (transaction) {
        await transaction.rollback();
      }

      throw err;
    }

    return this;
  };

  addDocumentToStructure = async function (
    document: Document,
    index?: number,
    options?: {
      save?: boolean;
    }
  ) {
    if (!this.documentStructure) {
      this.documentStructure = [];
    }

    let transaction;

    try {
      // documentStructure can only be updated by one request at a time
      if (options?.save !== false) {
        transaction = await sequelize.transaction();
      }

      // If moving existing document with children, use existing structure
      // @ts-expect-error ts-migrate(2339) FIXME: Property 'toJSON' does not exist on type 'Document... Remove this comment to see the full error message
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
          transaction,
        });

        if (transaction) {
          await transaction.commit();
        }
      }
    } catch (err) {
      if (transaction) {
        await transaction.rollback();
      }

      throw err;
    }

    return this;
  };
}

export default Collection;
