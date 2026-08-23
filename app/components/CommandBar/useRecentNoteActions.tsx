import { DocumentIcon } from "outline-icons";
import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import Icon from "@shared/components/Icon";
import { createInternalLinkAction } from "~/actions";
import { RecentSection } from "~/actions/sections";
import { noteBreadcrumbText } from "~/components/NoteBreadcrumb";
import useStores from "~/hooks/useStores";
import type Note from "~/models/Note";
import { notePath } from "~/utils/routeHelpers";
/** The number of notes listed under "Recently viewed" in the command bar. */
export const recentNoteCount = 6;
/**
 * Narrows recently viewed notes to those listed under "Recently viewed" in
 * the command bar, so that other actions can avoid offering them a second time.
 *
 * @param recentlyViewed the recently viewed notes, most recent first.
 * @param activeNoteId the currently open note, which is excluded.
 * @param count the maximum number of notes to return.
 * @returns the notes shown in the command bar.
 */
export function recentNotes(
  recentlyViewed: Note[],
  activeNoteId: string | undefined,
  count = recentNoteCount
): Note[] {
  return recentlyViewed
    .filter((note) => note.id !== activeNoteId)
    .slice(0, count);
}
const useRecentNoteActions = (count = recentNoteCount) => {
  const { notes, ui } = useStores();
  const { t } = useTranslation();
  return useMemo(
    () =>
      recentNotes(
        notes.recentlyViewed,
        ui.activeNoteId ?? undefined,
        count
      ).map((item) =>
        createInternalLinkAction({
          name: item.titleWithDefault,
          analyticsName: "Recently viewed document",
          section: RecentSection,
          description: noteBreadcrumbText(item, t),
          icon: item.icon ? (
            <Icon
              value={item.icon}
              initial={item.initial}
              color={item.color ?? undefined}
            />
          ) : (
            <DocumentIcon outline={item.isDraft} />
          ),
          to: notePath(item),
        })
      ),
    [count, ui.activeNoteId, notes.recentlyViewed, t]
  );
};
export default useRecentNoteActions;
