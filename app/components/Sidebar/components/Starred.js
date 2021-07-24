// @flow
import { observer } from "mobx-react";
import * as React from "react";
import { useEffect } from "react";
import { useTranslation } from "react-i18next";
import Flex from "components/Flex";
import PlaceholderDocument from "components/PlaceholderDocument";
import useStores from "../../../hooks/useStores";
import Header from "./Header";
import SidebarLink from "./SidebarLink";
import StarredLink from "./StarredLink";
import useToasts from "hooks/useToasts";

const STARRED_PAGINATION_LIMIT = 10;

function Starred() {
  const [isFetching, setIsFetching] = React.useState(false);
  const [fetchError, setFetchError] = React.useState();
  const [showMore, setShowMore] = React.useState(true);
  const [offset, setOffset] = React.useState(0);
  const { showToast } = useToasts();
  const { documents } = useStores();
  const { t } = useTranslation();
  const { fetchStarred, starred } = documents;

  const fetchResults = React.useCallback(async () => {
    try {
      setIsFetching(true);
      const results = await fetchStarred({
        limit: STARRED_PAGINATION_LIMIT,
        offset,
      });

      if (results && results.length < STARRED_PAGINATION_LIMIT) {
        setShowMore(false);
        setOffset((prevOffset) => prevOffset + results.length);
      } else {
        setOffset((prevOffset) => prevOffset + STARRED_PAGINATION_LIMIT);
      }
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
    if (offset === 0) {
      fetchResults();
    }
  }, [fetchResults, offset]);

  const handleShowMore = React.useCallback(
    async (ev) => {
      await fetchResults();
    },
    [fetchResults]
  );

  const handleShowLess = React.useCallback((ev) => {
    setOffset(STARRED_PAGINATION_LIMIT);
    setShowMore(true);
  }, []);

  const content = React.useMemo(() => {
    return starred.slice(0, offset).map((document) => {
      return (
        <StarredLink
          key={document.id}
          documentId={document.id}
          collectionId={document.collectionId}
          to={document.url}
          title={document.title}
          url={document.url}
          depth={1}
        />
      );
    });
  }, [starred, offset]);

  return (
    <Flex column>
      <>
        <Header>{t("Starred")}</Header>
        {content}
        {showMore && !isFetching && (
          <SidebarLink onClick={handleShowMore} label={`${t("Show more")}…`} />
        )}
        {!showMore && !isFetching && (
          <SidebarLink onClick={handleShowLess} label={`${t("Show less")}…`} />
        )}
        {(isFetching || fetchError) && (
          <Flex column>
            <PlaceholderDocument />
          </Flex>
        )}
      </>
    </Flex>
  );
}

export default observer(Starred);
