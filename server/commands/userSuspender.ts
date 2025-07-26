import { User, GroupUser } from "@server/models";
import CleanupDemotedUserTask from "@server/queues/tasks/CleanupDemotedUserTask";
import { ValidationError } from "../errors";
import { APIContext } from "@server/types";

type Props = {
  user: User;
};

/**
 * This command suspends an active user, this will cause them to lose access to
 * the team.
 */
export default async function userSuspender(
  ctx: APIContext,
  { user }: Props
): Promise<void> {
  const suspendedById = ctx.context.auth.user.id;
  if (user.id === suspendedById) {
    throw ValidationError("Unable to suspend the current user");
  }

  await user.updateWithCtx(
    ctx,
    {
      suspendedById,
      suspendedAt: new Date(),
    },
    {
      name: "suspend",
    }
  );
  await GroupUser.destroy({
    where: {
      userId: user.id,
    },
    transaction: ctx.context.transaction,
    individualHooks: true,
  });

  await new CleanupDemotedUserTask().schedule({ userId: user.id });
}
