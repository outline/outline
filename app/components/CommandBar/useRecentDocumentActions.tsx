import { DocumentIcon } from "outline-icons";
import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import Icon from "@shared/components/Icon";
import { createInternalLinkAction } from "~/actions";
import { RecentSection } from "~/actions/sections";
import { documentBreadcrumbText } from "~/components/DocumentBreadcrumb";
import useStores from "~/hooks/useStores";
import type Document from "~/models/Document";
import { documentPath } from "~/utils/routeHelpers";

/** The number of documents listed under "Recently viewed" in the command bar. */
export const recentDocumentCount = 6;

/**
 * Narrows recently viewed documents to those listed under "Recently viewed" in
 * the command bar, so that other actions can avoid offering them a second time.
 *
 * @param recentlyViewed the recently viewed documents, most recent first.
 * @param activeDocumentId the currently open document, which is excluded.
 * @param count the maximum number of documents to return.
 * @returns the documents shown in the command bar.
 */
export function recentDocuments(
  recentlyViewed: Document[],
  activeDocumentId: string | undefined,
  count = recentDocumentCount
): Document[] {
  return recentlyViewed
    .filter((document) => document.id !== activeDocumentId)
    .slice(0, count);
}

const useRecentDocumentActions = (count = recentDocumentCount) => {
  const { documents, ui } = useStores();
  const { t } = useTranslation();

  return useMemo(
    () =>
      recentDocuments(
        documents.recentlyViewed,
        ui.activeDocumentId ?? undefined,
        count
      ).map((item) =>
        createInternalLinkAction({
          name: item.titleWithDefault,
          analyticsName: "Recently viewed document",
          section: RecentSection,
          description: documentBreadcrumbText(item, t),
          icon: item.icon ? (
            <Icon
              value={item.icon}
              initial={item.initial}
              color={item.color ?? undefined}
            />
          ) : (
            <DocumentIcon outline={item.isDraft} />
          ),
          to: documentPath(item),
        })
      ),
    [count, ui.activeDocumentId, documents.recentlyViewed, t]
  );
};

export default useRecentDocumentActions;
