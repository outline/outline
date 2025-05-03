import compact from "lodash/compact";
import orderBy from "lodash/orderBy";
import { Op, WhereOptions } from "sequelize";
import { CollectionPermission, DocumentPermission } from "@shared/types";
import {
  Document,
  Group,
  GroupMembership,
  User,
  UserMembership,
} from "@server/models";
import { authorize } from "@server/policies";

// Higher value takes precedence
export const CollectionPermissionPriority = {
  [CollectionPermission.Admin]: 2,
  [CollectionPermission.ReadWrite]: 1,
  [CollectionPermission.Read]: 0,
} satisfies Record<CollectionPermission, number>;

// Higher value takes precedence
export const DocumentPermissionPriority = {
  [DocumentPermission.Admin]: 2,
  [DocumentPermission.ReadWrite]: 1,
  [DocumentPermission.Read]: 0,
} satisfies Record<DocumentPermission, number>;

/**
 * Check if the given user can access a document
 *
 * @param user - The user to check
 * @param documentId - The document to check
 * @returns Boolean whether the user can access the document
 */
export const canUserAccessDocument = async (user: User, documentId: string) => {
  try {
    const document = await Document.findByPk(documentId, {
      userId: user.id,
    });
    authorize(user, "read", document);
    return true;
  } catch (err) {
    return false;
  }
};

/**
 * Determines whether the user's access to a document is being elevated with the new permission.
 *
 * @param {Object} params Input parameters.
 * @param {string} params.userId The user to check.
 * @param {string} params.documentId The document to check.
 * @param {DocumentPermission} params.permission The new permission given to the user.
 * @param {string} params.skipMembershipId The membership to skip when comparing the existing permissions.
 * @returns {boolean} Whether the user has a higher access level
 */
export const isElevatedPermission = async ({
  userId,
  documentId,
  permission,
  skipMembershipId,
}: {
  userId: string;
  documentId: string;
  permission: DocumentPermission;
  skipMembershipId?: string;
}) => {
  const existingPermission = await getDocumentPermission({
    userId,
    documentId,
    skipMembershipId,
  });

  if (!existingPermission) {
    return true;
  }

  return (
    DocumentPermissionPriority[existingPermission] <
    DocumentPermissionPriority[permission]
  );
};

/**
 * Returns the user's permission to a document.
 *
 * @param {Object} params Input parameters.
 * @param {string} params.userId The user to check.
 * @param {string} params.documentId The document to check.
 * @param {string} params.skipMembershipId The membership to skip when comparing the existing permissions.
 * @returns {DocumentPermission | undefined} Highest permission, if it exists.
 */
export const getDocumentPermission = async ({
  userId,
  documentId,
  skipMembershipId,
}: {
  userId: string;
  documentId: string;
  skipMembershipId?: string;
}): Promise<DocumentPermission | undefined> => {
  const document = await Document.findByPk(documentId, { userId });
  const permissions: DocumentPermission[] = [];

  const collection = document?.collection;
  if (collection) {
    const collectionPermissions = orderBy(
      compact([
        collection.permission,
        ...compact(
          collection.memberships?.map(
            (m) => m.permission as CollectionPermission
          )
        ),
        ...compact(
          collection.groupMemberships?.map(
            (m) => m.permission as CollectionPermission
          )
        ),
      ]),
      (permission) => CollectionPermissionPriority[permission],
      "desc"
    );

    if (collectionPermissions[0]) {
      permissions.push(
        collectionPermissions[0] === CollectionPermission.Read
          ? DocumentPermission.Read
          : DocumentPermission.ReadWrite
      );
    }
  }

  const userMembershipWhere: WhereOptions<UserMembership> = {
    userId,
    documentId,
  };
  const groupMembershipWhere: WhereOptions<GroupMembership> = {
    documentId,
  };

  if (skipMembershipId) {
    userMembershipWhere.id = { [Op.ne]: skipMembershipId };
    groupMembershipWhere.id = { [Op.ne]: skipMembershipId };
  }

  const [userMemberships, groupMemberships] = await Promise.all([
    UserMembership.findAll({
      where: userMembershipWhere,
    }),
    GroupMembership.findAll({
      where: groupMembershipWhere,
      include: [
        {
          model: Group.filterByMember(userId),
          as: "group",
          required: true,
        },
      ],
    }),
  ]);

  permissions.push(
    ...userMemberships.map((m) => m.permission as DocumentPermission),
    ...groupMemberships.map((m) => m.permission as DocumentPermission)
  );

  const orderedPermissions = orderBy(
    permissions,
    (permission) => DocumentPermissionPriority[permission],
    "desc"
  );

  return orderedPermissions[0];
};
