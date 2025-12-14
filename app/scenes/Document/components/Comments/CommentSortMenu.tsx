import React from "react";
import { useTranslation } from "react-i18next";
import styled from "styled-components";
import { s } from "@shared/styles";
import { UserPreference } from "@shared/types";
import { InputSelect, Option } from "~/components/InputSelect";
import useCurrentUser from "~/hooks/useCurrentUser";
import { CommentSortType } from "~/types";

type Props = {
  /** Callback when the sort type changes */
  onChange?: (sortType: CommentSortType | "resolved") => void;
  /** Whether resolved comments are being viewed */
  viewingResolved?: boolean;
};

const CommentSortMenu = ({ viewingResolved, onChange }: Props) => {
  const { t } = useTranslation();
  const user = useCurrentUser();

  const preferredSortType = user.getPreference(
    UserPreference.SortCommentsByOrderInDocument
  )
    ? CommentSortType.OrderInDocument
    : CommentSortType.MostRecent;

  const value = viewingResolved ? "resolved" : preferredSortType;

  const handleChange = React.useCallback(
    (val: CommentSortType | "resolved") => {
      if (val !== "resolved") {
        if (val !== preferredSortType) {
          user.setPreference(
            UserPreference.SortCommentsByOrderInDocument,
            val === CommentSortType.OrderInDocument
          );
          void user.save();
        }
      }

      onChange?.(val);
    },
    [user, onChange, preferredSortType]
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
      label={t("Sort comments")}
      hideLabel
      borderOnHover
    />
  );
};

const Select = styled(InputSelect)`
  color: ${s("textSecondary")};
`;

export default CommentSortMenu;
