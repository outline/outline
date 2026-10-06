import { isUUID } from "validator";

/** The fields tags can be sorted by, matching `tags.list`. */
export type TagSort = "name" | "documentCount";

/** The default number of tags shown in compact lists before "+k". */
export const MaxVisibleTags = 3;

type SortableTag = { name: string; documentCount: number };

/**
 * Sorts tags by name or by document count, ties by name.
 *
 * @param tags the tags to sort.
 * @param sort the field to sort by.
 * @param direction the sort direction.
 * @returns a new, sorted array.
 */
export function sortTags<T extends SortableTag>(
  tags: T[],
  sort: TagSort,
  direction: "ASC" | "DESC"
): T[] {
  const factor = direction === "ASC" ? 1 : -1;
  return [...tags].sort((a, b) => {
    const byName = a.name.localeCompare(b.name);
    if (sort === "documentCount") {
      return (a.documentCount - b.documentCount) * factor || byName;
    }
    return byName * factor;
  });
}

/**
 * Splits tags into the ones to show and the number of remaining ones.
 *
 * @param tags the tags to show.
 * @param max the number of tags to show.
 * @returns the visible tags and the count of hidden ones.
 */
export function truncateTags<T>(
  tags: T[] | undefined,
  max = MaxVisibleTags
): { visible: T[]; hiddenCount: number } {
  const all = tags ?? [];
  return {
    visible: all.slice(0, max),
    hiddenCount: Math.max(all.length - max, 0),
  };
}

/**
 * The tags a tag can be merged into: every other tag, by name.
 *
 * @param tags all known tags.
 * @param sourceId the id of the tag being merged away.
 * @returns the candidate target tags.
 */
export function mergeTargetOptions<T extends { id: string; name: string }>(
  tags: T[],
  sourceId: string
): T[] {
  return tags
    .filter((tag) => tag.id !== sourceId)
    .sort((a, b) => a.name.localeCompare(b.name));
}

/**
 * Combines lists of tag ids, dropping empty values and duplicates.
 *
 * @param lists the lists of ids.
 * @returns the unique ids, in order of first appearance.
 */
export function combineTagIds(...lists: string[][]): string[] {
  return [...new Set(lists.flat().filter(Boolean))];
}

/**
 * Resolves the tag ids of the search URL: malformed ids are ignored, and once
 * the tags are known, ids matching no tag (eg. deleted or merged) are set
 * apart so they are not sent as filters but can still be removed.
 *
 * @param ids the raw ids from the URL.
 * @param isKnown whether an id matches a loaded tag, omit until tags loaded.
 * @returns the ids to filter by and the unknown ones.
 */
export function resolveFilterTagIds(
  ids: string[],
  isKnown?: (id: string) => boolean
): { applied: string[]; unknown: string[] } {
  const valid = combineTagIds(ids).filter((id) => isUUID(id));
  return isKnown
    ? {
        applied: valid.filter(isKnown),
        unknown: valid.filter((id) => !isKnown(id)),
      }
    : { applied: valid, unknown: [] };
}

/**
 * Whether a click asks to open a link in a new tab or window: a middle click,
 * or a click with Cmd, Ctrl or Shift held.
 *
 * @param event the mouse event.
 * @returns true when the link should open separately.
 */
export function isNewTabClick(event: {
  button: number;
  metaKey: boolean;
  ctrlKey: boolean;
  shiftKey: boolean;
}): boolean {
  return event.button === 1 || event.metaKey || event.ctrlKey || event.shiftKey;
}

/**
 * Adds a tag id to a selection, or removes it when already selected.
 *
 * @param selected the selected ids.
 * @param id the id to toggle.
 * @returns the new selection.
 */
export function toggleTagId(selected: string[], id: string): string[] {
  return selected.includes(id)
    ? selected.filter((selectedId) => selectedId !== id)
    : [...selected, id];
}

/**
 * Whether the sidebar should link to the tags page: hidden only once tags
 * have loaded, none are visible and the user cannot create one.
 *
 * @param options.loaded whether the tags have been fetched.
 * @param options.count the number of visible tags.
 * @param options.canCreate whether the user can create tags.
 * @returns true when the link should be shown.
 */
export function shouldShowTagsLink({
  loaded,
  count,
  canCreate,
}: {
  loaded: boolean;
  count: number;
  canCreate: boolean;
}): boolean {
  return canCreate || !loaded || count > 0;
}
