// @flow
import { observer } from "mobx-react";
import { CollapsedIcon } from "outline-icons";
import * as React from "react";
import { useEffect } from "react";
import { useTranslation } from "react-i18next";
import styled from "styled-components";
import Flex from "components/Flex";
import PlaceholderCollections from "./PlaceholderCollections";
import Section from "./Section";
import SidebarLink from "./SidebarLink";
import StarredLink from "./StarredLink";
import useStores from "hooks/useStores";
import useToasts from "hooks/useToasts";

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
  const { documents } = useStores();
  const { t } = useTranslation();
  const { fetchStarred, starred } = documents;

  const fetchResults = React.useCallback(async () => {
    try {
      setIsFetching(true);
      await fetchStarred({
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
  }, [fetchStarred, offset, showToast, t]);

  useEffect(() => {
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

  useEffect(() => {
    setOffset(starred.length);
    if (starred.length <= STARRED_PAGINATION_LIMIT) {
      setShow("Nothing");
    } else if (starred.length >= upperBound) {
      setShow("More");
    } else if (starred.length < upperBound) {
      setShow("Less");
    }
  }, [starred, upperBound]);

  useEffect(() => {
    if (offset === 0) {
      fetchResults();
    }
  }, [fetchResults, offset]);

  const handleShowMore = React.useCallback(
    async (ev) => {
      setUpperBound(
        (previousUpperBound) => previousUpperBound + STARRED_PAGINATION_LIMIT
      );
      await fetchResults();
    },
    [fetchResults]
  );

  const handleShowLess = React.useCallback((ev) => {
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

  const content = starred.slice(0, upperBound).map((document, index) => {
    return (
      <StarredLink
        key={document.id}
        documentId={document.id}
        collectionId={document.collectionId}
        to={document.url}
        title={document.title}
        url={document.url}
        depth={2}
      />
    );
  });

  if (!starred.length) {
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
            {(isFetching || fetchError) && (
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

const Disclosure = styled(CollapsedIcon)`
  transition: transform 100ms ease, fill 50ms !important;
  ${({ expanded }) => !expanded && "transform: rotate(-90deg);"};
`;

export default observer(Starred);
