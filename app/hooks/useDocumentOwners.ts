import { useEffect } from "react";
import type Document from "~/models/Document";
import type User from "~/models/User";
import useStores from "./useStores";

/**
 * Returns the owners of a document, fetching any that are not yet loaded.
 *
 * @param document the document to return owners for.
 * @returns the loaded owners of the document.
 */
export default function useDocumentOwners(document: Document): User[] {
  const { users } = useStores();
  const { ownerIds } = document;

  useEffect(() => {
    ownerIds
      .filter((id) => !users.get(id))
      .forEach((id) => void users.fetch(id).catch(() => undefined));
  }, [ownerIds, users]);

  return document.owners;
}
