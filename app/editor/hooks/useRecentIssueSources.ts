import { IssueSource } from "@shared/schema";
import Storage from "@shared/utils/Storage";
import React from "react";
import usePersistedState, {
  setPersistedState,
} from "~/hooks/usePersistedState";

const StorageKey = "recent-issue-sources";
const MaxCount = 5;

export function useRecentIssueSources() {
  const [issueSources, setIssueSources] = usePersistedState<IssueSource[]>(
    StorageKey,
    [] as IssueSource[]
  );

  const addIssueSource = React.useCallback(
    (source: IssueSource) => {
      const newIssueSources = insertAndTrim(issueSources, source);
      setIssueSources(newIssueSources);
    },
    [issueSources, setIssueSources]
  );

  return { issueSources, addIssueSource };
}

export function addRecentIssueSource(source: IssueSource) {
  const issueSources: IssueSource[] = Storage.get(StorageKey) ?? [];
  const newIssueSources = insertAndTrim(issueSources, source);
  setPersistedState(StorageKey, newIssueSources);
}

function insertAndTrim(issueSources: IssueSource[], source: IssueSource) {
  const newIssueSources = issueSources.filter((s) => s.id !== source.id);
  newIssueSources.unshift(source);

  if (newIssueSources.length > MaxCount) {
    newIssueSources.pop();
  }

  return newIssueSources;
}

export type RecentIssueSourcesResponse = ReturnType<
  typeof useRecentIssueSources
>;
