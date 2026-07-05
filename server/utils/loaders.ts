import DataLoader from "dataloader";
import Collection from "@server/models/Collection";
import User from "@server/models/User";
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
 * Batches collection lookups by primary key, optionally loading the given
 * user's memberships alongside so the result can be used for policy checks.
 *
 * @param collectionIds the collection IDs to load.
 * @param userId the user ID to load memberships for, if any.
 * @param paranoid whether to exclude soft-deleted collections.
 * @return an array of collections (or null for missing IDs) in the same order as the input.
 */
async function batchCollections(
  collectionIds: readonly string[],
  userId: string | undefined,
  paranoid: boolean
): Promise<Array<Collection | null>> {
  const scoped = userId
    ? Collection.scope([
        "defaultScope",
        {
          method: ["withMembership", userId],
        },
      ])
    : Collection;
  const collections = await scoped.findAll({
    where: {
      id: [...collectionIds],
    },
    paranoid,
  });
  const collectionsById = new Map(
    collections.map((collection) => [collection.id, collection])
  );
  return collectionIds.map((id) => collectionsById.get(id) ?? null);
}

/**
 * A set of DataLoader instances scoped to a single request. Loads made within
 * the same event loop frame are coalesced into one database query, and results
 * are memoized for the lifetime of the request.
 */
export class RequestLoaders {
  /** Loads users by ID, including deleted users. */
  users: DataLoader<string, User | null>;

  private cache: boolean;

  private collectionLoaders = new Map<
    string,
    DataLoader<string, Collection | null>
  >();

  constructor(options?: { cache?: boolean }) {
    this.cache = options?.cache ?? true;
    this.users = new DataLoader(batchUsers, { cache: this.cache });
  }

  /**
   * Returns a loader for collections by ID, with the given user's memberships
   * attached for policy checks. A separate loader is kept per (userId,
   * paranoid) combination as both parameters change the shape of the result.
   *
   * @param userId the user ID to load memberships for, if any.
   * @param paranoid whether to exclude soft-deleted collections (default: true).
   * @return the collection loader for this combination.
   */
  collections(
    userId?: string,
    paranoid = true
  ): DataLoader<string, Collection | null> {
    const createLoader = () =>
      new DataLoader(
        (ids: readonly string[]) => batchCollections(ids, userId, paranoid),
        { cache: this.cache }
      );

    // Without caching there is nothing to reuse between calls, and memoizing
    // per user would grow unbounded on the shared instance — return a fresh
    // loader that batches only the loads made against it.
    if (!this.cache) {
      return createLoader();
    }

    const key = `${userId ?? ""}:${paranoid}`;
    let loader = this.collectionLoaders.get(key);
    if (!loader) {
      loader = createLoader();
      this.collectionLoaders.set(key, loader);
    }
    return loader;
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
