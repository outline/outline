import { observer } from "mobx-react";
import * as React from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import Star from "~/models/Star";
import DelayedMount from "~/components/DelayedMount";
import Flex from "~/components/Flex";
import usePaginatedRequest from "~/hooks/usePaginatedRequest";
import useStores from "~/hooks/useStores";
import DropCursor from "./DropCursor";
import Header from "./Header";
import PlaceholderCollections from "./PlaceholderCollections";
import Relative from "./Relative";
import SidebarLink from "./SidebarLink";
import StarredContext from "./StarredContext";
import StarredLink from "./StarredLink";
import { useDropToCreateStar, useDropToReorderStar } from "./useDragAndDrop";

const STARRED_PAGINATION_LIMIT = 10;

function Starred() {
  const { stars } = useStores();
  const { t } = useTranslation();

  const { loading, next, end, error, page } = usePaginatedRequest<Star>(
    stars.fetchPage
  );
  const [reorderStarMonitor, dropToReorder] = useDropToReorderStar();
  const [createStarMonitor, dropToStarRef] = useDropToCreateStar();

  React.useEffect(() => {
    if (error) {
      toast.error(t("Could not load starred documents"));
    }
  }, [t, error]);

  if (!stars.orderedData.length) {
    return null;
  }

  return (
    <StarredContext.Provider value={true}>
      <Flex column>
        <Header id="starred" title={t("Starred")}>
          <Relative>
            {reorderStarMonitor.isDragging && (
              <DropCursor
                isActiveDrop={reorderStarMonitor.isOverCursor}
                innerRef={dropToReorder}
                position="top"
              />
            )}
            {createStarMonitor.isDragging && (
              <DropCursor
                isActiveDrop={createStarMonitor.isOverCursor}
                innerRef={dropToStarRef}
                position="top"
              />
            )}
            {stars.orderedData
              .slice(0, page * STARRED_PAGINATION_LIMIT)
              .map((star) => (
                <StarredLink key={star.id} star={star} />
              ))}
            {!end && (
              <SidebarLink
                onClick={next}
                label={`${t("Show more")}…`}
                disabled={stars.isFetching}
                depth={0}
              />
            )}
            {loading && (
              <Flex column>
                <DelayedMount>
                  <PlaceholderCollections />
                </DelayedMount>
              </Flex>
            )}
          </Relative>
        </Header>
      </Flex>
    </StarredContext.Provider>
  );
}

export default observer(Starred);
