import { DocumentIcon } from "outline-icons";
import * as React from "react";
import Icon from "@shared/components/Icon";
import { createAction } from "~/actions";
import { RecentSection } from "~/actions/sections";
import useStores from "~/hooks/useStores";
import history from "~/utils/history";
import { documentPath } from "~/utils/routeHelpers";

const useRecentDocumentActions = (count = 6) => {
  const { documents, ui } = useStores();

  return React.useMemo(
    () =>
      documents.recentlyViewed
        .filter((document) => document.id !== ui.activeDocumentId)
        .slice(0, count)
        .map((item) =>
          createAction({
            name: item.titleWithDefault,
            analyticsName: "Recently viewed document",
            section: RecentSection,
            icon: item.icon ? (
              <Icon value={item.icon} color={item.color ?? undefined} />
            ) : (
              <DocumentIcon />
            ),
            perform: () => history.push(documentPath(item)),
          })
        ),
    [count, ui.activeDocumentId, documents.recentlyViewed]
  );
};

export default useRecentDocumentActions;
