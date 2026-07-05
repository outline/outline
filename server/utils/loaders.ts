import DataLoader from "dataloader";
import { User } from "@server/models";
import type { APIContext } from "@server/types";

/**
 * Batches and de-duplicates user lookups by primary key. Deleted users are
 * included (paranoid: false) to match presentation requirements — documents
 * created or updated by since-deleted users must still present them.
 *
 * @param userIds the user IDs to load.
 * @return an array of users (or null for missing IDs) in the same order as the input.
 */
async function batchUsers(
  userIds: readonly string[]
): Promise<Array<User | null>> {
  const users = await User.findAll({
    where: {
      id: [...userIds],
    },
    paranoid: false,
  });
  const usersById = new Map(users.map((user) => [user.id, user]));
  return userIds.map((id) => usersById.get(id) ?? null);
}

/**
 * A set of DataLoader instances scoped to a single request. Loads made within
 * the same event loop frame are coalesced into one database query, and results
 * are memoized for the lifetime of the request.
 */
export class RequestLoaders {
  /** Loads users by ID, including deleted users. */
  users: DataLoader<string, User | null>;

  constructor(options?: { cache?: boolean }) {
    this.users = new DataLoader(batchUsers, { cache: options?.cache ?? true });
  }
}

const requestLoaders = new WeakMap<APIContext, RequestLoaders>();

// Used when no request context is available (background workers, websockets).
// Caching is disabled so nothing is memoized across unrelated operations —
// this instance only coalesces loads made in the same event loop frame.
const sharedLoaders = new RequestLoaders({ cache: false });

/**
 * Returns the set of DataLoaders for the given request context, creating it
 * on first access. Loaders are garbage-collected with the request. When no
 * context is available a shared, batch-only (non-caching) instance is
 * returned instead.
 *
 * @param ctx the API context of the current request, if any.
 * @return the loaders for this request.
 */
export function loaders(ctx?: APIContext): RequestLoaders {
  if (!ctx) {
    return sharedLoaders;
  }

  let existing = requestLoaders.get(ctx);
  if (!existing) {
    existing = new RequestLoaders();
    requestLoaders.set(ctx, existing);
  }
  return existing;
}
