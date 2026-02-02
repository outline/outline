import { Op } from "sequelize";
import Logger from "@server/logging/Logger";
import {
  AuthenticationProvider,
  User,
  UserAuthentication,
  Group,
  GroupUser,
  Collection,
  UserMembership,
} from "@server/models";
import type { APIContext } from "@server/types";
import { CollectionPermission } from "@shared/types";

type DeactivationResult = {
  deactivatedCount: number;
  collectionId: string | null;
  errors: string[];
};

/**
 * Deactivates inactive Keycloak users by:
 * 1. Finding all inactive users with OIDC authentication
 * 2. Saving their current group memberships
 * 3. Removing them from all groups
 * 4. Adding them to a "Deactivated Users" collection
 * 5. Storing previous group IDs in user preferences for restoration
 *
 * @param ctx API context
 * @param inactiveDays Number of days of inactivity to consider (default: 180)
 * @returns Result with count of deactivated users and collection ID
 */
export default async function deactivateInactiveKeycloakUsers(
  ctx: APIContext,
  inactiveDays = 180
): Promise<DeactivationResult> {
  const actor = ctx.state.auth.user;
  const transaction = ctx.state.transaction;
  
  if (!actor) {
    throw new Error("User not found in context");
  }
  
  const teamId = actor.teamId;
  const errors: string[] = [];
  let deactivatedCount = 0;

  // Find OIDC authentication providers
  const oidcProviders = await AuthenticationProvider.findAll({
    where: {
      name: "oidc",
      enabled: true,
      teamId,
    },
    transaction,
  });

  if (oidcProviders.length === 0) {
    Logger.info(
      "deactivateInactiveKeycloakUsers",
      "No OIDC providers found for team",
      { teamId }
    );
    return {
      deactivatedCount: 0,
      collectionId: null,
      errors: ["No OIDC providers found"],
    };
  }

  const providerIds = oidcProviders.map((p) => p.id);
  const inactiveDate = new Date();
  inactiveDate.setDate(inactiveDate.getDate() - inactiveDays);

  // Find inactive users with OIDC authentication
  const inactiveUsers = await User.findAll({
    where: {
      teamId,
      [Op.or]: [
        { lastActiveAt: { [Op.lt]: inactiveDate } },
        { lastActiveAt: { [Op.is]: null } },
      ],
      suspendedAt: { [Op.is]: null },
    },
    include: [
      {
        model: UserAuthentication,
        as: "authentications",
        required: true,
        where: {
          authenticationProviderId: {
            [Op.in]: providerIds,
          },
        },
      },
    ],
    transaction,
  });

  Logger.info(
    "deactivateInactiveKeycloakUsers",
    `Found ${inactiveUsers.length} inactive Keycloak users to deactivate`,
    { teamId, inactiveDays }
  );

  if (inactiveUsers.length === 0) {
    return {
      deactivatedCount: 0,
      collectionId: null,
      errors: [],
    };
  }

  // Find or create "Deactivated Users" collection
  let deactivatedCollection = await Collection.findOne({
    where: {
      teamId,
      name: "Деактивированные пользователи",
    },
    transaction,
  });

  if (!deactivatedCollection) {
    try {
      deactivatedCollection = await Collection.createWithCtx(
        ctx,
        {
          name: "Деактивированные пользователи",
          description:
            "Коллекция для деактивированных пользователей Keycloak",
          teamId,
          createdById: actor.id,
          permission: CollectionPermission.Read,
        },
        undefined,
        { transaction }
      );
      Logger.info(
        "deactivateInactiveKeycloakUsers",
        "Created Deactivated Users collection",
        { collectionId: deactivatedCollection.id }
      );
    } catch (err) {
      const errorMsg = `Failed to create Deactivated Users collection: ${err instanceof Error ? err.message : String(err)}`;
      Logger.error("deactivateInactiveKeycloakUsers", errorMsg, err);
      errors.push(errorMsg);
      return {
        deactivatedCount: 0,
        collectionId: null,
        errors,
      };
    }
  }

  // Process each inactive user
  for (const user of inactiveUsers) {
    try {
      // Get user's current groups
      const userGroups = await GroupUser.findAll({
        where: {
          userId: user.id,
        },
        include: [
          {
            model: Group,
            as: "group",
            required: true,
            where: {
              teamId,
            },
          },
        ],
        transaction,
      });

      const previousGroupIds = userGroups.map((gu) => gu.groupId);

      // Save previous group IDs in user preferences
      if (previousGroupIds.length > 0) {
        const currentPreferences = (user.getDataValue("preferences") as any) || {};
        user.setDataValue("preferences", {
          ...currentPreferences,
          previousGroupIds,
          deactivatedAt: new Date().toISOString(),
        });
        await user.save({ transaction });
      }

      // Remove user from all groups
      for (const groupUser of userGroups) {
        await groupUser.destroy({ transaction });
        Logger.debug(
          "deactivateInactiveKeycloakUsers",
          "Removed user from group",
          {
            userId: user.id,
            groupId: groupUser.groupId,
          }
        );
      }

      // Add user to deactivated collection if not already a member
      const existingMembership = await UserMembership.findOne({
        where: {
          collectionId: deactivatedCollection.id,
          userId: user.id,
        },
        transaction,
      });

      if (!existingMembership) {
        await UserMembership.create(
          {
            collectionId: deactivatedCollection.id,
            userId: user.id,
            permission: CollectionPermission.Read,
            createdById: actor.id,
          },
          { transaction }
        );
        Logger.debug(
          "deactivateInactiveKeycloakUsers",
          "Added user to deactivated collection",
          {
            userId: user.id,
            collectionId: deactivatedCollection.id,
          }
        );
      }

      deactivatedCount++;
    } catch (err) {
      const errorMsg = `Failed to deactivate user ${user.id}: ${err instanceof Error ? err.message : String(err)}`;
      Logger.error("deactivateInactiveKeycloakUsers", errorMsg, err);
      errors.push(errorMsg);
    }
  }

  Logger.info(
    "deactivateInactiveKeycloakUsers",
    `Deactivated ${deactivatedCount} inactive Keycloak users`,
    {
      teamId,
      deactivatedCount,
      collectionId: deactivatedCollection.id,
      errors: errors.length,
    }
  );

  return {
    deactivatedCount,
    collectionId: deactivatedCollection.id,
    errors,
  };
}
