import queryString from "query-string";
import React from "react";
import { useTranslation } from "react-i18next";
import { useHistory, useLocation } from "react-router-dom";
import styled from "styled-components";
import { s } from "@shared/styles";
import { UserPreference } from "@shared/types";
import { InputSelectNew, Option } from "~/components/InputSelectNew";
import useCurrentUser from "~/hooks/useCurrentUser";
import { useLocationSidebarContext } from "~/hooks/useLocationSidebarContext";
import useQuery from "~/hooks/useQuery";
import { CommentSortType } from "~/types";

const CommentSortMenu = () => {
  const { t } = useTranslation();
  const location = useLocation();
  const sidebarContext = useLocationSidebarContext();
  const history = useHistory();
  const user = useCurrentUser();
  const params = useQuery();

  const preferredSortType = user.getPreference(
    UserPreference.SortCommentsByOrderInDocument
  )
    ? CommentSortType.OrderInDocument
    : CommentSortType.MostRecent;

  const viewingResolved = params.get("resolved") === "";
  const value = viewingResolved ? "resolved" : preferredSortType;

  const handleChange = React.useCallback(
    (val: string) => {
      if (val === "resolved") {
        history.push({
          search: queryString.stringify({
            ...queryString.parse(location.search),
            resolved: "",
          }),
          pathname: location.pathname,
          state: { sidebarContext },
        });
        return;
      }

      const sortType = val as CommentSortType;
      if (sortType !== preferredSortType) {
        user.setPreference(
          UserPreference.SortCommentsByOrderInDocument,
          sortType === CommentSortType.OrderInDocument
        );
        void user.save();
      }

      history.push({
        search: queryString.stringify({
          ...queryString.parse(location.search),
          resolved: undefined,
        }),
        pathname: location.pathname,
        state: { sidebarContext },
      });
    },
    [history, location, sidebarContext, user, preferredSortType]
  );

  const options: Option[] = React.useMemo(
    () =>
      [
        {
          type: "item",
          label: t("Most recent"),
          value: CommentSortType.MostRecent,
        },
        {
          type: "item",
          label: t("Order in doc"),
          value: CommentSortType.OrderInDocument,
        },
        {
          type: "separator",
        },
        {
          type: "item",
          label: t("Resolved"),
          value: "resolved",
        },
      ] satisfies Option[],
    [t]
  );

  return (
    <Select
      options={options}
      value={value}
      onChange={handleChange}
      ariaLabel={t("Sort comments")}
      label={t("Sort comments")}
      hideLabel
      borderOnHover
    />
  );
};

const Select = styled(InputSelectNew)`
  color: ${s("textSecondary")};
`;

export default CommentSortMenu;
