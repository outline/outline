// @flow
import { observer } from "mobx-react";
import * as React from "react";
import { useEffect } from "react";
import { useTranslation } from "react-i18next";
import styled from "styled-components";
import Empty from "components/Empty";
import Flex from "components/Flex";
import Disclosure from "./Disclosure";
import Header from "./Header";
import PlaceholderCollections from "./PlaceholderCollections";
import SidebarLink from "./SidebarLink";
import StarredLink from "./StarredLink";
import useStores from "hooks/useStores";
import useToasts from "hooks/useToasts";

const STARRED_PAGINATION_LIMIT = 10;

function Starred() {
  const [isFetching, setIsFetching] = React.useState(false);
  const [fetchError, setFetchError] = React.useState();
  const [expanded, setExpanded] = React.useState(false);
  const [show, setShow] = React.useState("Nothing");
  const [offset, setOffset] = React.useState(0);
  const [showDisclosure, setShowDisclosure] = React.useState(false);
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
      showToast(t("Bookmarked documents could not be loaded"), {
        type: "error",
      });
      setFetchError(error);
    } finally {
      setIsFetching(false);
    }
  }, [fetchStarred, offset, showToast, t]);

  useEffect(() => {
    setOffset(starred.length);
    if (starred.length < STARRED_PAGINATION_LIMIT) {
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

  const handleDisclosureClick = React.useCallback(
    (ev: SyntheticEvent<>) => {
      ev.preventDefault();
      ev.stopPropagation();
      setExpanded(!expanded);
    },
    [expanded]
  );

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

  const content = starred.slice(0, upperBound).map((document, index) => {
    return (
      <StarredLink
        key={document.id}
        documentId={document.id}
        collectionId={document.collectionId}
        to={document.url}
        title={document.title}
        url={document.url}
        depth={1.5}
      />
    );
  });

  if (!starred.length && !isFetching) {
    return (
      <>
        <Header>{t("Starred")}</Header>
        <EmptyWrapper column>
          <Empty>{t("You’ve not bookmarked any documents yet.")}</Empty>
        </EmptyWrapper>
      </>
    );
  }

  return (
    <Flex column>
      <>
        <div
          onMouseOver={() => setShowDisclosure(true)}
          onMouseLeave={() => setShowDisclosure(false)}
        >
          {(showDisclosure || expanded) && (
            <StarredDisclosure
              expanded={expanded}
              onClick={handleDisclosureClick}
            />
          )}
          <Header>{t("Bookmarked")}</Header>
        </div>

        {expanded && (
          <>
            {content}
            {show === "More" && !isFetching && (
              <SidebarLink
                onClick={handleShowMore}
                label={`${t("Show more")}…`}
              />
            )}
            {show === "Less" && !isFetching && (
              <SidebarLink
                onClick={handleShowLess}
                label={`${t("Show less")}…`}
              />
            )}
            {(isFetching || fetchError) && (
              <Flex column>
                <PlaceholderCollections />
              </Flex>
            )}
          </>
        )}
      </>
    </Flex>
  );
}

const StarredDisclosure = styled(Disclosure)`
  left: 10px;
`;

const EmptyWrapper = styled(Flex)`
  margin: 0 16px;
  font-size: 15px;
`;

export default observer(Starred);
