// @flow
import { observer } from "mobx-react";
import { StarredIcon } from "outline-icons";
import * as React from "react";
import { useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useHistory } from "react-router-dom";
import { DEFAULT_PAGINATION_LIMIT } from "stores/BaseStore";
import Flex from "components/Flex";
import useStores from "../../../hooks/useStores";
import Header from "./Header";
import SidebarLink from "./SidebarLink";
import SidebarSectionLoading from "./SidebarSectionLoading";
import { documentUrl } from "utils/routeHelpers";

function Starred() {
  const [isFetching, setIsFetching] = React.useState(false);
  const [, setShowMore] = React.useState(false);
  const { documents } = useStores();
  const { t } = useTranslation();
  const { fetchStarred, starred } = documents;
  const history = useHistory();

  const fetchResults = React.useCallback(async () => {
    setIsFetching(true);
    const results = await fetchStarred({
      limit: DEFAULT_PAGINATION_LIMIT,
      offset: 0,
    });
    setIsFetching(false);
    if (results && results.length > 10) {
      setShowMore(true);
    }
  }, [fetchStarred]);

  useEffect(() => {
    fetchResults();
  }, [fetchResults]);

  const handleStarred = React.useCallback(
    (ev, document) => {
      history.push(documentUrl(document));
    },
    [history]
  );

  const content = React.useMemo(() => {
    return starred.slice(0, 10).map((document) => {
      return (
        <SidebarLink
          onClick={(ev) => handleStarred(ev, document)}
          icon={<StarredIcon color="currentColor" />}
          label={document.title}
        />
      );
    });
  }, [starred, handleStarred]);

  if (isFetching) {
    return (
      <Flex column>
        <Header>{t("Starred")}</Header>
        <SidebarSectionLoading />
      </Flex>
    );
  }

  return (
    <Flex column>
      <Header>{t("Starred")}</Header>
      <>{content}</>
      {true && (
        <SidebarLink to="/starred" label={`${t("Show more")}…`} exact={false} />
      )}
    </Flex>
  );
}

export default observer(Starred);
