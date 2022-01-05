import { find, findIndex, concat, remove, uniq } from "lodash";
import randomstring from "randomstring";
import isUUID from "validator/lib/isUUID";
import { SLUG_URL_REGEX } from "@shared/utils/routeHelpers";
import slugify from "@server/utils/slugify";
import { Op, DataTypes, sequelize } from "../sequelize";
import CollectionUser from "./CollectionUser";
import Document from "./Document";
import User from "./User";

const Collection = sequelize.define(
  "collection",
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    urlId: {
      type: DataTypes.STRING,
      unique: true,
    },
    name: DataTypes.STRING,
    description: DataTypes.STRING,
    icon: DataTypes.STRING,
    color: DataTypes.STRING,
    index: {
      type: DataTypes.STRING,
      defaultValue: null,
    },
    permission: {
      type: DataTypes.STRING,
      defaultValue: null,
      allowNull: true,
      validate: {
        isIn: [["read", "read_write"]],
      },
    },
    maintainerApprovalRequired: DataTypes.BOOLEAN,
    documentStructure: DataTypes.JSONB,
    sharing: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
    },
    sort: {
      type: DataTypes.JSONB,
      validate: {
        // @ts-expect-error ts-migrate(7006) FIXME: Parameter 'value' implicitly has an 'any' type.
        isSort(value) {
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
    },
  },
  {
    tableName: "collections",
    paranoid: true,
    hooks: {
      // @ts-expect-error ts-migrate(2749) FIXME: 'Collection' refers to a value, but is being used ... Remove this comment to see the full error message
      beforeValidate: (collection: Collection) => {
        collection.urlId = collection.urlId || randomstring.generate(10);
      },
    },
    getterMethods: {
      url() {
        if (!this.name) return `/collection/untitled-${this.urlId}`;
        return `/collection/${slugify(this.name)}-${this.urlId}`;
      },
    },
  }
);
Collection.DEFAULT_SORT = {
  field: "index",
  direction: "asc",
};
// @ts-expect-error ts-migrate(7006) FIXME: Parameter 'model' implicitly has an 'any' type.
Collection.addHook("beforeSave", async (model) => {
  if (model.icon === "collection") {
    model.icon = null;
  }
});

// Class methods
// @ts-expect-error ts-migrate(7006) FIXME: Parameter 'models' implicitly has an 'any' type.
Collection.associate = (models) => {
  Collection.hasMany(models.Document, {
    as: "documents",
    foreignKey: "collectionId",
    onDelete: "cascade",
  });
  Collection.hasMany(models.CollectionUser, {
    as: "memberships",
    foreignKey: "collectionId",
    onDelete: "cascade",
  });
  Collection.hasMany(models.CollectionGroup, {
    as: "collectionGroupMemberships",
    foreignKey: "collectionId",
    onDelete: "cascade",
  });
  Collection.belongsToMany(models.User, {
    as: "users",
    through: models.CollectionUser,
    foreignKey: "collectionId",
  });
  Collection.belongsToMany(models.Group, {
    as: "groups",
    through: models.CollectionGroup,
    foreignKey: "collectionId",
  });
  Collection.belongsTo(models.User, {
    as: "user",
    foreignKey: "createdById",
  });
  Collection.belongsTo(models.Team, {
    as: "team",
  });
  // @ts-expect-error ts-migrate(7006) FIXME: Parameter 'userId' implicitly has an 'any' type.
  Collection.addScope("withMembership", (userId) => ({
    include: [
      {
        model: models.CollectionUser,
        as: "memberships",
        where: {
          userId,
        },
        required: false,
      },
      {
        model: models.CollectionGroup,
        as: "collectionGroupMemberships",
        required: false,
        // use of "separate" property: sequelize breaks when there are
        // nested "includes" with alternating values for "required"
        // see https://github.com/sequelize/sequelize/issues/9869
        separate: true,
        // include for groups that are members of this collection,
        // of which userId is a member of, resulting in:
        // CollectionGroup [inner join] Group [inner join] GroupUser [where] userId
        include: {
          model: models.Group,
          as: "group",
          required: true,
          include: {
            model: models.GroupUser,
            as: "groupMemberships",
            required: true,
            where: {
              userId,
            },
          },
        },
      },
    ],
  }));
  Collection.addScope("withAllMemberships", {
    include: [
      {
        model: models.CollectionUser,
        as: "memberships",
        required: false,
      },
      {
        model: models.CollectionGroup,
        as: "collectionGroupMemberships",
        required: false,
        // use of "separate" property: sequelize breaks when there are
        // nested "includes" with alternating values for "required"
        // see https://github.com/sequelize/sequelize/issues/9869
        separate: true,
        // include for groups that are members of this collection,
        // of which userId is a member of, resulting in:
        // CollectionGroup [inner join] Group [inner join] GroupUser [where] userId
        include: {
          model: models.Group,
          as: "group",
          required: true,
          include: {
            model: models.GroupUser,
            as: "groupMemberships",
            required: true,
          },
        },
      },
    ],
  });
};

// @ts-expect-error ts-migrate(2749) FIXME: 'Collection' refers to a value, but is being used ... Remove this comment to see the full error message
Collection.addHook("afterDestroy", async (model: Collection) => {
  await Document.destroy({
    where: {
      collectionId: model.id,
      archivedAt: {
        [Op.eq]: null,
      },
    },
  });
});
// @ts-expect-error ts-migrate(2749) FIXME: 'Collection' refers to a value, but is being used ... Remove this comment to see the full error message
Collection.addHook("afterCreate", (model: Collection, options) => {
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
});

// Class methods
// @ts-expect-error ts-migrate(7006) FIXME: Parameter 'id' implicitly has an 'any' type.
Collection.findByPk = async function (id, options = {}) {
  if (isUUID(id)) {
    return this.findOne({
      where: {
        id,
      },
      ...options,
    });
  } else if (id.match(SLUG_URL_REGEX)) {
    return this.findOne({
      where: {
        urlId: id.match(SLUG_URL_REGEX)[1],
      },
      ...options,
    });
  }
};

/**
 * Find the first collection that the specified user has access to.
 *
 * @param user User object
 * @returns collection First collection in the sidebar order
 */
// @ts-expect-error ts-migrate(2749) FIXME: 'User' refers to a value, but is being used as a t... Remove this comment to see the full error message
Collection.findFirstCollectionForUser = async (user: User) => {
  const id = await user.collectionIds();
  return Collection.findOne({
    where: {
      id,
    },
    order: [
      // using LC_COLLATE:"C" because we need byte order to drive the sorting
      sequelize.literal('"collection"."index" collate "C"'),
      ["updatedAt", "DESC"],
    ],
  });
};

// get all the membership relationshps a user could have with the collection
Collection.membershipUserIds = async (collectionId: string) => {
  const collection = await Collection.scope("withAllMemberships").findByPk(
    collectionId
  );

  if (!collection) {
    return [];
  }

  const groupMemberships = collection.collectionGroupMemberships
    // @ts-expect-error ts-migrate(7006) FIXME: Parameter 'cgm' implicitly has an 'any' type.
    .map((cgm) => cgm.group.groupMemberships)
    .flat();
  const membershipUserIds = concat(
    groupMemberships,
    collection.memberships
  ).map((membership) => membership.userId);
  return uniq(membershipUserIds);
};

// Instance methods
Collection.prototype.addDocumentToStructure = async function (
  document: Document,
  index: number,
  options = {}
) {
  if (!this.documentStructure) {
    this.documentStructure = [];
  }

  let transaction;

  try {
    // documentStructure can only be updated by one request at a time
    // @ts-expect-error ts-migrate(2339) FIXME: Property 'save' does not exist on type '{}'.
    if (options.save !== false) {
      transaction = await sequelize.transaction();
    }

    // If moving existing document with children, use existing structure
    // @ts-expect-error ts-migrate(2339) FIXME: Property 'toJSON' does not exist on type 'Document... Remove this comment to see the full error message
    const documentJson = { ...document.toJSON(), ...options.documentJson };

    // @ts-expect-error ts-migrate(2339) FIXME: Property 'parentDocumentId' does not exist on type... Remove this comment to see the full error message
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
      // @ts-expect-error ts-migrate(7006) FIXME: Parameter 'documentList' implicitly has an 'any' t... Remove this comment to see the full error message
      const placeDocument = (documentList) => {
        // @ts-expect-error ts-migrate(7006) FIXME: Parameter 'childDocument' implicitly has an 'any' ... Remove this comment to see the full error message
        return documentList.map((childDocument) => {
          // @ts-expect-error ts-migrate(2339) FIXME: Property 'parentDocumentId' does not exist on type... Remove this comment to see the full error message
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

    // @ts-expect-error ts-migrate(2339) FIXME: Property 'save' does not exist on type '{}'.
    if (options.save !== false) {
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

/**
 * Update document's title and url in the documentStructure
 */
Collection.prototype.updateDocument = async function (
  updatedDocument: Document
) {
  if (!this.documentStructure) return;
  let transaction;

  try {
    // documentStructure can only be updated by one request at the time
    transaction = await sequelize.transaction();
    // @ts-expect-error ts-migrate(2339) FIXME: Property 'id' does not exist on type 'Document'.
    const { id } = updatedDocument;

    // @ts-expect-error ts-migrate(7006) FIXME: Parameter 'documents' implicitly has an 'any' type... Remove this comment to see the full error message
    const updateChildren = (documents) => {
      // @ts-expect-error ts-migrate(7006) FIXME: Parameter 'document' implicitly has an 'any' type.
      return documents.map((document) => {
        if (document.id === id) {
          document = {
            // @ts-expect-error ts-migrate(2339) FIXME: Property 'toJSON' does not exist on type 'Document... Remove this comment to see the full error message
            ...updatedDocument.toJSON(),
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

// @ts-expect-error ts-migrate(7006) FIXME: Parameter 'document' implicitly has an 'any' type.
Collection.prototype.deleteDocument = async function (document) {
  await this.removeDocumentInStructure(document);
  await document.deleteWithChildren();
};

Collection.prototype.isChildDocument = function (
  // @ts-expect-error ts-migrate(7006) FIXME: Parameter 'parentDocumentId' implicitly has an 'an... Remove this comment to see the full error message
  parentDocumentId,
  // @ts-expect-error ts-migrate(7006) FIXME: Parameter 'documentId' implicitly has an 'any' typ... Remove this comment to see the full error message
  documentId
): boolean {
  let result = false;

  // @ts-expect-error ts-migrate(7006) FIXME: Parameter 'documents' implicitly has an 'any' type... Remove this comment to see the full error message
  const loopChildren = (documents, input) => {
    if (result) {
      return;
    }

    // @ts-expect-error ts-migrate(7006) FIXME: Parameter 'document' implicitly has an 'any' type.
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

Collection.prototype.getDocumentTree = function (documentId: string) {
  // @ts-expect-error ts-migrate(7034) FIXME: Variable 'result' implicitly has type 'any' in som... Remove this comment to see the full error message
  let result;

  // @ts-expect-error ts-migrate(7006) FIXME: Parameter 'documents' implicitly has an 'any' type... Remove this comment to see the full error message
  const loopChildren = (documents) => {
    // @ts-expect-error ts-migrate(7005) FIXME: Variable 'result' implicitly has an 'any' type.
    if (result) {
      return;
    }

    // @ts-expect-error ts-migrate(7006) FIXME: Parameter 'document' implicitly has an 'any' type.
    documents.forEach((document) => {
      // @ts-expect-error ts-migrate(7005) FIXME: Variable 'result' implicitly has an 'any' type.
      if (result) {
        return;
      }

      if (document.id === documentId) {
        console.log({ document });
        result = document;
      } else {
        loopChildren(document.children);
      }
    });
  };

  loopChildren(this.documentStructure);
  return result;
};

Collection.prototype.getDocumentParents = function (
  documentId: string
): string[] | void {
  // @ts-expect-error ts-migrate(7034) FIXME: Variable 'result' implicitly has type 'any' in som... Remove this comment to see the full error message
  let result;

  // @ts-expect-error ts-migrate(7006) FIXME: Parameter 'documents' implicitly has an 'any' type... Remove this comment to see the full error message
  const loopChildren = (documents, path = []) => {
    // @ts-expect-error ts-migrate(7005) FIXME: Variable 'result' implicitly has an 'any' type.
    if (result) {
      return;
    }

    // @ts-expect-error ts-migrate(7006) FIXME: Parameter 'document' implicitly has an 'any' type.
    documents.forEach((document) => {
      if (document.id === documentId) {
        result = path;
      } else {
        // @ts-expect-error ts-migrate(2322) FIXME: Type 'any' is not assignable to type 'never'.
        loopChildren(document.children, [...path, document.id]);
      }
    });
  };

  if (this.documentStructure) {
    loopChildren(this.documentStructure);
  }

  return result;
};

Collection.prototype.removeDocumentInStructure = async function (
  // @ts-expect-error ts-migrate(7006) FIXME: Parameter 'document' implicitly has an 'any' type.
  document,
  // @ts-expect-error ts-migrate(7006) FIXME: Parameter 'options' implicitly has an 'any' type.
  options
) {
  if (!this.documentStructure) return;
  // @ts-expect-error ts-migrate(7034) FIXME: Variable 'returnValue' implicitly has type 'any' i... Remove this comment to see the full error message
  let returnValue;
  let transaction;

  try {
    // documentStructure can only be updated by one request at the time
    transaction = await sequelize.transaction();

    // @ts-expect-error ts-migrate(7006) FIXME: Parameter 'children' implicitly has an 'any' type.
    const removeFromChildren = async (children, id) => {
      children = await Promise.all(
        // @ts-expect-error ts-migrate(7006) FIXME: Parameter 'childDocument' implicitly has an 'any' ... Remove this comment to see the full error message
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
        if (!returnValue)
          returnValue = [
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
    await this.save({ ...options, fields: ["documentStructure"], transaction });
    await transaction.commit();
  } catch (err) {
    if (transaction) {
      await transaction.rollback();
    }

    throw err;
  }

  return returnValue;
};

export default Collection;
