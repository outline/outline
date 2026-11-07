import { useEffect } from "react";
import type User from "~/models/User";
import useStores from "./useStores";

/**
 * Returns the users with the given ids, fetching any that are not yet loaded.
 *
 * @param ownerIds the ids of the owners to return.
 * @returns the loaded owners, in the given order.
 */
export default function useOwners(ownerIds: string[]): User[] {
  const { users } = useStores();

  useEffect(() => {
    ownerIds
      .filter((id) => !users.get(id))
      .forEach((id) => void users.fetch(id).catch(() => undefined));
  }, [ownerIds, users]);

  return ownerIds
    .map((id) => users.get(id))
    .filter((user): user is User => !!user);
}
