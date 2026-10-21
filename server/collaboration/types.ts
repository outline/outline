import type { User } from "@server/models";

export type withContext<T> = Omit<T, "context"> & {
  context: {
    user?: User;
    /** The time at which the token used to authenticate expires. */
    expiresAt?: Date;
  };
};
