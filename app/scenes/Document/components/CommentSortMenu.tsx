import queryString from "query-string";
import React from "react";
import { useTranslation } from "react-i18next";
import { useHistory, useLocation } from "react-router-dom";
import styled from "styled-components";
import { s } from "@shared/styles";
import { UserPreference } from "@shared/types";
import InputSelect from "~/components/InputSelect";
import useCurrentUser from "~/hooks/useCurrentUser";
import useQuery from "~/hooks/useQuery";
import { CommentSortType } from "~/types";

const CommentSortMenu = () => {
  const { t } = useTranslation();
  const location = useLocation();
  const history = useHistory();
  const user = useCurrentUser();
  const params = useQuery();

  const viewingResolved = params.get("resolved") === "";
  const value = viewingResolved
    ? "resolved"
    : user.getPreference(UserPreference.SortCommentsByOrderInDocument)
    ? CommentSortType.OrderInDocument
    : CommentSortType.MostRecent;

  const handleSortTypeChange = (type: CommentSortType) => {
    user.setPreference(
      UserPreference.SortCommentsByOrderInDocument,
      type === CommentSortType.OrderInDocument
    );
    void user.save();
  };

  const showResolved = () => {
    history.push({
      search: queryString.stringify({
        ...queryString.parse(location.search),
        resolved: "",
      }),
      pathname: location.pathname,
    });
  };

  const showUnresolved = () => {
    history.push({
      search: queryString.stringify({
        ...queryString.parse(location.search),
        resolved: undefined,
      }),
      pathname: location.pathname,
    });
  };

  return (
    <Select
      style={{ margin: 0 }}
      ariaLabel={t("Sort comments")}
      value={value}
      onChange={(ev) => {
        if (ev === "resolved") {
          showResolved();
        } else {
          handleSortTypeChange(ev as CommentSortType);
          showUnresolved();
        }
      }}
      borderOnHover
      options={[
        { value: CommentSortType.MostRecent, label: t("Most recent") },
        { value: CommentSortType.OrderInDocument, label: t("Order in doc") },
        {
          divider: true,
          value: "resolved",
          label: t("Resolved"),
        },
      ]}
    />
  );
};

const Select = styled(InputSelect)`
  color: ${s("textSecondary")};
`;

export default CommentSortMenu;
