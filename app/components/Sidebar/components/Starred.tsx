import { observer } from "mobx-react";
import * as React from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import Star from "~/models/Star";
import DelayedMount from "~/components/DelayedMount";
import Flex from "~/components/Flex";
import usePaginatedRequest from "~/hooks/usePaginatedRequest";
import useStores from "~/hooks/useStores";
import {
  useDropToCreateStar,
  useDropToReorderStar,
} from "../hooks/useDragAndDrop";
import DropCursor from "./DropCursor";
import Header from "./Header";
import PlaceholderCollections from "./PlaceholderCollections";
import Relative from "./Relative";
import SidebarContext from "./SidebarContext";
import SidebarLink from "./SidebarLink";
import StarredLink from "./StarredLink";

const STARRED_PAGINATION_LIMIT = 10;

function Starred() {
  const { stars } = useStores();
  const { t } = useTranslation();

  const { loading, next, end, error, page } = usePaginatedRequest<Star>(
    stars.fetchPage
  );
  const [reorderStarProps, dropToReorder] = useDropToReorderStar();
  const [createStarProps, dropToStarRef] = useDropToCreateStar();

  React.useEffect(() => {
    if (error) {
      toast.error(t("Could not load starred documents"));
    }
  }, [t, error]);

  if (!stars.orderedData.length) {
    return null;
  }

  return (
    <SidebarContext.Provider value="starred">
      <Flex column>
        <Header id="starred" title={t("Starred")}>
          <Relative>
            {reorderStarProps.isDragging && (
              <DropCursor
                isActiveDrop={reorderStarProps.isOverCursor}
                innerRef={dropToReorder}
                position="top"
              />
            )}
            {createStarProps.isDragging && (
              <DropCursor
                isActiveDrop={createStarProps.isOverCursor}
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
    </SidebarContext.Provider>
  );
}

export default observer(Starred);
