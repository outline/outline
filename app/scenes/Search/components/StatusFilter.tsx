import * as React from "react";
import { useTranslation } from "react-i18next";
import FilterOptions from "~/components/FilterOptions";

type Props = {
  includeArchived?: boolean;
  includeDrafts?: boolean;
  onSelect: (option: {
    includeArchived?: boolean;
    includeDrafts?: boolean;
  }) => void;
};

enum StatusFilterOptions {
  Published = "published",
  Active = "active",
  All = "all",
}

const StatusFilter = ({ includeArchived, includeDrafts, onSelect }: Props) => {
  const { t } = useTranslation();
  const options = React.useMemo(
    () => [
      {
        key: StatusFilterOptions.Published,
        label: t("Published documents"),
        note: t("Documents you have access to, excluding drafts"),
      },
      {
        key: StatusFilterOptions.Active,
        label: t("Active documents"),
        note: t("Documents you have access to, including drafts"),
      },
      {
        key: StatusFilterOptions.All,
        label: t("All documents"),
        note: t("Documents you have access to, including drafts and archived"),
      },
    ],
    [t]
  );

  const getActiveKey = () => {
    if (includeArchived && includeDrafts) {
      return StatusFilterOptions.All;
    }

    if (includeDrafts) {
      return StatusFilterOptions.Active;
    }

    return StatusFilterOptions.Published;
  };

  const handleSelect = (key: StatusFilterOptions) => {
    switch (key) {
      case StatusFilterOptions.Published:
        return onSelect({ includeArchived: false, includeDrafts: false });
      case StatusFilterOptions.Active:
        return onSelect({ includeArchived: false, includeDrafts: true });
      case StatusFilterOptions.All:
        return onSelect({ includeArchived: true, includeDrafts: true });
      default:
        onSelect({ includeArchived: false, includeDrafts: false });
    }
  };

  return (
    <FilterOptions
      options={options}
      activeKey={getActiveKey()}
      onSelect={handleSelect}
      defaultLabel={t("Document type")}
    />
  );
};

export default StatusFilter;
