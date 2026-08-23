import { useCallback, useEffect, useRef, useState } from "react";
import { Pagination } from "@shared/constants";
import type Notebook from "~/models/Notebook";
import type Note from "~/models/Note";
import useStores from "./useStores";
type Params =
  | {
      note: Note;
      notebook?: undefined;
    }
  | {
      notebook: Notebook;
      note?: undefined;
    };
/**
 * Hook to preload all data needed by the share popover. Returns a `preload`
 * function that can be called on hover so the popover renders instantly.
 *
 * @param params - the note or notebook to load share data for.
 * @returns preload function, loading state, and reset function.
 */
export default function useShareDataLoader(params: Params) {
  const { shares, userMemberships, groupMemberships, memberships } =
    useStores();
  const [loading, setLoading] = useState(false);
  const requestedRef = useRef(false);
  const requestCountRef = useRef(0);
  const entityId = params.note?.id ?? params.notebook?.id;
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
    if (params.note) {
      const doc = params.note;
      promises.push(
        shares.fetchOne({ noteId: doc.id }),
        userMemberships.fetchNoteMemberships({
          id: doc.id,
          limit: Pagination.defaultLimit,
        }),
        groupMemberships.fetchAll({ noteId: doc.id })
      );
    } else {
      const col = params.notebook;
      promises.push(
        shares.fetchOne({ notebookId: col.id }),
        memberships.fetchAll({ id: col.id }),
        groupMemberships.fetchAll({ notebookId: col.id })
      );
    }
    void Promise.all(promises).finally(() => {
      if (requestCountRef.current === thisRequest) {
        setLoading(false);
      }
    });
  }, [
    params.note,
    params.notebook,
    shares,
    userMemberships,
    groupMemberships,
    memberships,
  ]);
  const reset = useCallback(() => {
    requestedRef.current = false;
  }, []);
  return { preload, loading, reset };
}
