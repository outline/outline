import { observer } from "mobx-react";
import * as React from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import styled from "styled-components";
import useStores from "~/hooks/useStores";
import { searchUrl } from "~/utils/routeHelpers";

function RecentSearches() {
  const { searches } = useStores();
  const { t } = useTranslation();

  React.useEffect(() => {
    searches.fetchPage({});
  }, [searches]);

  return searches.recent.length ? (
    <>
      <Heading>{t("Recent searches")}</Heading>
      <List>
        {searches.recent.map((searchQuery) => (
          <ListItem>
            <RecentSearch
              key={searchQuery.id}
              to={searchUrl(searchQuery.query)}
            >
              {searchQuery.query}
            </RecentSearch>
          </ListItem>
        ))}
      </List>
    </>
  ) : null;
}

const Heading = styled.h2`
  font-weight: 500;
  font-size: 14px;
  line-height: 1.5;
  color: ${(props) => props.theme.textSecondary};
  margin-bottom: 0;
`;

const List = styled.ol`
  padding: 0;
  margin-top: 8px;
`;

const ListItem = styled.li`
  font-size: 14px;
  padding: 0;
  list-style: none;
  position: relative;

  &:before {
    content: "·";
    color: ${(props) => props.theme.textTertiary};
    position: absolute;
    left: -8px;
  }
`;

const RecentSearch = styled(Link)`
  display: block;
  color: ${(props) => props.theme.textSecondary};
  padding: 1px 4px;
  border-radius: 4px;

  &:hover {
    color: ${(props) => props.theme.text};
    background: ${(props) => props.theme.secondaryBackground};
  }
`;

export default observer(RecentSearches);
