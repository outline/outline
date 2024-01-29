import type { User } from "@server/models";

export type withContext<T> = Omit<T, "context"> & {
  context: {
    user?: User;
  };
};
