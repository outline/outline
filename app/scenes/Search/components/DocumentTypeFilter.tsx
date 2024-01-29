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

enum DocumentType {
  Published = "published",
  Active = "active",
  All = "all",
}

const DocumentTypeFilter = ({
  includeArchived,
  includeDrafts,
  onSelect,
}: Props) => {
  const { t } = useTranslation();
  const options = React.useMemo(
    () => [
      {
        key: DocumentType.Published,
        label: t("Published documents"),
        note: t("Documents you have access to, excluding drafts"),
      },
      {
        key: DocumentType.Active,
        label: t("Active documents"),
        note: t("Documents you have access to, including drafts"),
      },
      {
        key: DocumentType.All,
        label: t("All documents"),
        note: t("Documents you have access to, including drafts and archived"),
      },
    ],
    [t]
  );

  const getActiveKey = () => {
    if (includeArchived && includeDrafts) {
      return DocumentType.All;
    }

    if (includeDrafts) {
      return DocumentType.Active;
    }

    return DocumentType.Published;
  };

  const handleSelect = (key: DocumentType) => {
    switch (key) {
      case DocumentType.Published:
        return onSelect({ includeArchived: false, includeDrafts: false });
      case DocumentType.Active:
        return onSelect({ includeArchived: false, includeDrafts: true });
      case DocumentType.All:
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

export default DocumentTypeFilter;
