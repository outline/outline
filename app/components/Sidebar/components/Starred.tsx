import fractionalIndex from "fractional-index";
import { observer } from "mobx-react";
import { CollapsedIcon } from "outline-icons";
import * as React from "react";
import { useDrop } from "react-dnd";
import { useTranslation } from "react-i18next";
import styled from "styled-components";
import Star from "~/models/Star";
import Flex from "~/components/Flex";
import useStores from "~/hooks/useStores";
import useToasts from "~/hooks/useToasts";
import DropCursor from "./DropCursor";
import PlaceholderCollections from "./PlaceholderCollections";
import Section from "./Section";
import SidebarLink from "./SidebarLink";
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
  const { stars, documents } = useStores();
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

  const content = stars.orderedData.slice(0, upperBound).map((star) => {
    const document = documents.get(star.documentId);

    return document ? (
      <StarredLink
        key={star.id}
        star={star}
        documentId={document.id}
        collectionId={document.collectionId}
        to={document.url}
        title={document.title}
        depth={2}
      />
    ) : null;
  });

  if (!stars.orderedData.length) {
    return null;
  }

  return (
    <Section>
      <Flex column>
        <SidebarLink
          onClick={handleExpandClick}
          label={t("Starred")}
          icon={<Disclosure expanded={expanded} color="currentColor" />}
        />
        {expanded && (
          <>
            <DropCursor
              isActiveDrop={isOverReorder}
              innerRef={dropToReorder}
              position="top"
            />
            {content}
            {show === "More" && !isFetching && (
              <SidebarLink
                onClick={handleShowMore}
                label={`${t("Show more")}…`}
                depth={2}
              />
            )}
            {show === "Less" && !isFetching && (
              <SidebarLink
                onClick={handleShowLess}
                label={`${t("Show less")}…`}
                depth={2}
              />
            )}
            {(isFetching || fetchError) && !stars.orderedData.length && (
              <Flex column>
                <PlaceholderCollections />
              </Flex>
            )}
          </>
        )}
      </Flex>
    </Section>
  );
}

const Disclosure = styled(CollapsedIcon)<{ expanded?: boolean }>`
  transition: transform 100ms ease, fill 50ms !important;
  ${({ expanded }) => !expanded && "transform: rotate(-90deg);"};
`;

export default observer(Starred);
