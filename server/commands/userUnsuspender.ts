import { User } from "@server/models";
import { ValidationError } from "../errors";
import { APIContext } from "@server/types";

type Props = {
  user: User;
};

/**
 * This command unsuspends a previously suspended user, allowing access to the
 * team again.
 */
export default async function userUnsuspender(
  ctx: APIContext,
  { user }: Props
): Promise<void> {
  if (user.id === ctx.context.auth.user.id) {
    throw ValidationError("Unable to unsuspend the current user");
  }

  await user.updateWithCtx(
    ctx,
    {
      suspendedById: null,
      suspendedAt: null,
    },
    {
      name: "activate",
    }
  );
}
