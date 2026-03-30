import { useCallback, useEffect, useRef, useState } from "react";
import { Pagination } from "@shared/constants";
import type Collection from "~/models/Collection";
import type Document from "~/models/Document";
import useStores from "./useStores";

type Params =
  | { document: Document; collection?: undefined }
  | { collection: Collection; document?: undefined };

/**
 * Hook to preload all data needed by the share popover. Returns a `preload`
 * function that can be called on hover so the popover renders instantly.
 *
 * @param params - the document or collection to load share data for.
 * @returns preload function, loading state, and reset function.
 */
export default function useShareDataLoader(params: Params) {
  const { userMemberships, groupMemberships, memberships } = useStores();
  const [loading, setLoading] = useState(false);
  const requestedRef = useRef(false);
  const requestCountRef = useRef(0);

  const entityId = params.document?.id ?? params.collection?.id;

  // Reset when the entity changes so preload fires for the new target.
  useEffect(() => {
    requestedRef.current = false;
    setLoading(false);
  }, [entityId]);

  const preload = useCallback(() => {
    if (requestedRef.current) {
      return;
    }
    requestedRef.current = true;
    setLoading(true);

    const thisRequest = ++requestCountRef.current;
    const promises: Promise<unknown>[] = [];

    if (params.document) {
      const doc = params.document;
      promises.push(
        doc.share(),
        userMemberships.fetchDocumentMemberships({
          id: doc.id,
          limit: Pagination.defaultLimit,
        }),
        groupMemberships.fetchAll({ documentId: doc.id })
      );
    } else {
      const col = params.collection;
      promises.push(
        col.share(),
        memberships.fetchAll({ id: col.id }),
        groupMemberships.fetchAll({ collectionId: col.id })
      );
    }

    void Promise.all(promises).finally(() => {
      if (requestCountRef.current === thisRequest) {
        setLoading(false);
      }
    });
  }, [
    params.document,
    params.collection,
    userMemberships,
    groupMemberships,
    memberships,
  ]);

  const reset = useCallback(() => {
    requestedRef.current = false;
  }, []);

  return { preload, loading, reset };
}
