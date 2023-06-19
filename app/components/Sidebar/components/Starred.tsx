import fractionalIndex from "fractional-index";
import { observer } from "mobx-react";
import * as React from "react";
import { useDrop } from "react-dnd";
import { useTranslation } from "react-i18next";
import Star from "~/models/Star";
import DelayedMount from "~/components/DelayedMount";
import Flex from "~/components/Flex";
import useStores from "~/hooks/useStores";
import DropCursor from "./DropCursor";
import Header from "./Header";
import PlaceholderCollections from "./PlaceholderCollections";
import Relative from "./Relative";
import SidebarLink from "./SidebarLink";
import StarredContext from "./StarredContext";
import StarredLink from "./StarredLink";

const STARRED_PAGINATION_LIMIT = 10;

function Starred() {
  const [fetchError, setFetchError] = React.useState();
  const [displayedStarsCount, setDisplayedStarsCount] = React.useState(
    STARRED_PAGINATION_LIMIT
  );
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
        setFetchError(error);
      }
    },
    [stars]
  );

  React.useEffect(() => {
    fetchResults();
  }, []);

  const handleShowMore = async () => {
    await fetchResults(displayedStarsCount);
    setDisplayedStarsCount((prev) => prev + STARRED_PAGINATION_LIMIT);
  };

  // Drop to reorder document
  const [{ isOverReorder, isDraggingAnyStar }, dropToReorder] = useDrop({
    accept: "star",
    drop: async (item: { star: Star }) => {
      item.star.save({
        index: fractionalIndex(null, stars.orderedData[0].index),
      });
    },
    collect: (monitor) => ({
      isOverReorder: !!monitor.isOver(),
      isDraggingAnyStar: monitor.getItemType() === "star",
    }),
  });

  if (!stars.orderedData.length) {
    return null;
  }

  return (
    <StarredContext.Provider value={true}>
      <Flex column>
        <Header id="starred" title={t("Starred")}>
          <Relative>
            {isDraggingAnyStar && (
              <DropCursor
                isActiveDrop={isOverReorder}
                innerRef={dropToReorder}
                position="top"
              />
            )}
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
