import {
  useFocusEffect,
  useRovingTabIndex,
} from "@getoutline/react-roving-tabindex";
import { CloseIcon } from "outline-icons";
import * as React from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import styled from "styled-components";
import { s, hover } from "@shared/styles";
import type SearchQuery from "~/models/SearchQuery";
import NudeButton from "~/components/NudeButton";
import Tooltip from "~/components/Tooltip";
import { searchPath } from "~/utils/routeHelpers";

type Props = {
  searchQuery: SearchQuery;
};

function RecentSearchListItem({ searchQuery }: Props) {
  const { t } = useTranslation();

  const ref = React.useRef<HTMLAnchorElement>(null);

  const { focused, ...rovingTabIndex } = useRovingTabIndex(ref, false);
  useFocusEffect(focused, ref);

  return (
    <RecentSearch
      to={searchPath(searchQuery.query)}
      ref={ref}
      {...rovingTabIndex}
    >
      {searchQuery.query}
      <Tooltip content={t("Remove search")}>
        <RemoveButton
          aria-label={t("Remove search")}
          onClick={async (ev) => {
            ev.preventDefault();
            await searchQuery.delete();
          }}
        >
          <CloseIcon />
        </RemoveButton>
      </Tooltip>
    </RecentSearch>
  );
}

const RemoveButton = styled(NudeButton)`
  opacity: 0;
  color: ${s("textTertiary")};

  &:focus,
  &:${hover} {
    opacity: 1;
    color: ${s("text")};
  }
`;

const RecentSearch = styled(Link)`
  display: flex;
  justify-content: space-between;
  color: ${s("textSecondary")};
  cursor: var(--pointer);
  padding: 1px 8px;
  border-radius: 4px;
  line-height: 24px;
  font-size: 14px;
  margin: 0 -8px;

  &:focus-visible {
    outline: none;
  }

  &:focus,
  &:${hover} {
    color: ${s("text")};
    background: ${s("backgroundSecondary")};

    ${RemoveButton} {
      opacity: 1;
    }
  }
`;

export default RecentSearchListItem;
