import fractionalIndex from "fractional-index";
import { observer } from "mobx-react";
import * as React from "react";
import { useDrop } from "react-dnd";
import { useTranslation } from "react-i18next";
import Star from "~/models/Star";
import Flex from "~/components/Flex";
import useStores from "~/hooks/useStores";
import useToasts from "~/hooks/useToasts";
import Storage from "~/utils/Storage";
import DropCursor from "./DropCursor";
import Header from "./Header";
import PlaceholderCollections from "./PlaceholderCollections";
import Relative from "./Relative";
import SidebarLink from "./SidebarLink";
import StarredContext from "./StarredContext";
import StarredLink from "./StarredLink";

const STARRED_PAGINATION_LIMIT = 10;
const STARRED = "STARRED";

function Starred() {
  const [fetchError, setFetchError] = React.useState();
  const [expanded, setExpanded] = React.useState(Storage.get(STARRED) ?? true);
  const [displayedStarsCount, setDisplayedStarsCount] = React.useState(
    STARRED_PAGINATION_LIMIT
  );
  const { showToast } = useToasts();
  const { stars } = useStores();
  const { t } = useTranslation();

  const fetchResults = React.useCallback(
    async (offset = 0) => {
      try {
        await stars.fetchPage({
          limit: STARRED_PAGINATION_LIMIT + 1,
          offset,
        });
      } catch (error) {
        showToast(t("Starred documents could not be loaded"), {
          type: "error",
        });
        setFetchError(error);
      }
    },
    [stars, showToast, t]
  );

  React.useEffect(() => {
    fetchResults();
  }, [fetchResults]);

  const handleShowMore = async () => {
    await fetchResults(displayedStarsCount);
    setDisplayedStarsCount((prev) => prev + STARRED_PAGINATION_LIMIT);
  };

  const handleExpandClick = React.useCallback((ev) => {
    ev.preventDefault();
    ev.stopPropagation();

    setExpanded((prev: boolean) => {
      Storage.set(STARRED, !prev);
      return !prev;
    });
  }, []);

  // Drop to reorder document
  const [{ isOverReorder }, dropToReorder] = useDrop({
    accept: "star",
    drop: async (item: Star) => {
      item?.save({ index: fractionalIndex(null, stars.orderedData[0].index) });
    },
    collect: (monitor) => ({
      isOverReorder: !!monitor.isOver(),
    }),
  });

  if (!stars.orderedData.length) {
    return null;
  }

  return (
    <StarredContext.Provider value={true}>
      <Flex column>
        <Header onClick={handleExpandClick} expanded={expanded}>
          {t("Starred")}
        </Header>
        {expanded && (
          <Relative>
            <DropCursor
              isActiveDrop={isOverReorder}
              innerRef={dropToReorder}
              position="top"
            />
            {stars.orderedData.slice(0, displayedStarsCount).map((star) => (
              <StarredLink key={star.id} star={star} />
            ))}
            {stars.orderedData.length > displayedStarsCount && (
              <SidebarLink
                onClick={handleShowMore}
                label={`${t("Show more")}…`}
                disabled={stars.isFetching}
                depth={0}
              />
            )}
            {(stars.isFetching || fetchError) && !stars.orderedData.length && (
              <Flex column>
                <PlaceholderCollections />
              </Flex>
            )}
          </Relative>
        )}
      </Flex>
    </StarredContext.Provider>
  );
}

export default observer(Starred);
