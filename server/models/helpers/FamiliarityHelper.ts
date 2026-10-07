import { type OrderItem, Sequelize } from "sequelize";
import { GroupUser } from "@server/models";
import type { User } from "@server/models";

/**
 * A multiplier per model id, applied by the client to the relevance score of a
 * suggestion. Models without a score are equally familiar to everyone.
 */
export type FamiliarityScores = Record<string, number>;

/**
 * Scores how familiar a suggested model is to the user that is asking for it,
 * so that the people and content they work with are suggested first.
 */
export class FamiliarityHelper {
  /** The score of a model with no familiarity signal. */
  public static defaultScore = 1;

  /**
   * Builds an order clause that ranks users familiar to the actor first. The
   * query must pass the actor's group ids as a `groupIds` replacement.
   *
   * @param groupIds the identifiers of the groups the actor is a member of.
   * @returns the order items, empty when the actor is in no group.
   */
  public static userOrder(groupIds: string[]): OrderItem[] {
    if (!groupIds.length) {
      return [];
    }

    return [
      [
        Sequelize.literal(
          `(SELECT COUNT(*) FROM group_users WHERE group_users."userId" = "user"."id" AND group_users."groupId" IN (:groupIds))`
        ),
        "DESC",
      ],
    ];
  }

  /**
   * Scores the given users by the number of groups they share with the actor.
   *
   * @param users the suggested users to score.
   * @param groupIds the identifiers of the groups the actor is a member of.
   * @returns the scores, keyed by user id.
   */
  public static async forUsers(
    users: User[],
    groupIds: string[]
  ): Promise<FamiliarityScores> {
    const scores: FamiliarityScores = {};

    if (!users.length || !groupIds.length) {
      return scores;
    }

    const groupUsers = await GroupUser.findAll({
      attributes: ["userId"],
      where: {
        userId: users.map((user) => user.id),
        groupId: groupIds,
      },
    });

    for (const groupUser of groupUsers) {
      scores[groupUser.userId] = Math.min(
        (scores[groupUser.userId] ?? this.defaultScore) +
          this.sharedGroupWeight,
        this.maxScore
      );
    }

    return scores;
  }

  /** The score added for each group shared with the actor. */
  private static sharedGroupWeight = 0.5;

  /** The highest score a model can reach, whatever the signals. */
  private static maxScore = 3;
}
