import { DocumentIcon } from "outline-icons";
import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import Icon from "@shared/components/Icon";
import { createInternalLinkAction } from "~/actions";
import { RecentSection } from "~/actions/sections";
import { documentBreadcrumbText } from "~/components/DocumentBreadcrumb";
import useStores from "~/hooks/useStores";
import { documentPath } from "~/utils/routeHelpers";

const useRecentDocumentActions = (count = 6) => {
  const { documents, ui } = useStores();
  const { t } = useTranslation();

  return useMemo(
    () =>
      documents.recentlyViewed
        .filter((document) => document.id !== ui.activeDocumentId)
        .slice(0, count)
        .map((item) =>
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
