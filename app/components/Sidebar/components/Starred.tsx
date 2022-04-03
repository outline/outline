import fractionalIndex from "fractional-index";
import { observer } from "mobx-react";
import * as React from "react";
import { useDrop } from "react-dnd";
import { useTranslation } from "react-i18next";
import Star from "~/models/Star";
import Flex from "~/components/Flex";
import useStores from "~/hooks/useStores";
import useToasts from "~/hooks/useToasts";
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
  const [isFetching, setIsFetching] = React.useState(false);
  const [fetchError, setFetchError] = React.useState();
  const [expanded, setExpanded] = React.useState(true);
  const [show, setShow] = React.useState("Nothing");
  const [offset, setOffset] = React.useState(0);
  const [upperBound, setUpperBound] = React.useState(STARRED_PAGINATION_LIMIT);
  const { showToast } = useToasts();
  const { stars } = useStores();
  const { t } = useTranslation();

  const fetchResults = React.useCallback(async () => {
    try {
      setIsFetching(true);
      await stars.fetchPage({
        limit: STARRED_PAGINATION_LIMIT,
        offset,
      });
    } catch (error) {
      showToast(t("Starred documents could not be loaded"), {
        type: "error",
      });
      setFetchError(error);
    } finally {
      setIsFetching(false);
    }
  }, [stars, offset, showToast, t]);

  React.useEffect(() => {
    let stateInLocal;

    try {
      stateInLocal = localStorage.getItem(STARRED);
    } catch (_) {
      // no-op Safari private mode
    }

    if (!stateInLocal) {
      localStorage.setItem(STARRED, expanded ? "true" : "false");
    } else {
      setExpanded(stateInLocal === "true");
    }
  }, [expanded]);

  React.useEffect(() => {
    setOffset(stars.orderedData.length);

    if (stars.orderedData.length <= STARRED_PAGINATION_LIMIT) {
      setShow("Nothing");
    } else if (stars.orderedData.length >= upperBound) {
      setShow("More");
    } else if (stars.orderedData.length < upperBound) {
      setShow("Less");
    }
  }, [stars.orderedData, upperBound]);

  React.useEffect(() => {
    if (offset === 0) {
      fetchResults();
    }
  }, [fetchResults, offset]);

  const handleShowMore = React.useCallback(async () => {
    setUpperBound(
      (previousUpperBound) => previousUpperBound + STARRED_PAGINATION_LIMIT
    );
    await fetchResults();
  }, [fetchResults]);

  const handleShowLess = React.useCallback(() => {
    setUpperBound(STARRED_PAGINATION_LIMIT);
    setShow("More");
  }, []);

  const handleExpandClick = React.useCallback(
    (ev) => {
      ev.preventDefault();
      ev.stopPropagation();

      try {
        localStorage.setItem(STARRED, !expanded ? "true" : "false");
      } catch (_) {
        // no-op Safari private mode
      }

      setExpanded((prev) => !prev);
    },
    [expanded]
  );

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
            {stars.orderedData.slice(0, upperBound).map((star) => (
              <StarredLink key={star.id} star={star} />
            ))}
            {show === "More" && !isFetching && (
              <SidebarLink
                onClick={handleShowMore}
                label={`${t("Show more")}…`}
                depth={0}
              />
            )}
            {show === "Less" && !isFetching && (
              <SidebarLink
                onClick={handleShowLess}
                label={`${t("Show less")}…`}
                depth={0}
              />
            )}
            {(isFetching || fetchError) && !stars.orderedData.length && (
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
