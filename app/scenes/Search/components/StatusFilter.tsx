import * as React from "react";
import { useTranslation } from "react-i18next";
import FilterOptions from "~/components/FilterOptions";

type Props = {
  includeArchived?: boolean;
  onSelect: (key: boolean) => void;
};

const StatusFilter = ({ includeArchived, onSelect }: Props) => {
  const { t } = useTranslation();
  const options = React.useMemo(
    () => [
      {
        key: "",
        label: t("Active documents"),
        note: t("Documents in collections you are able to access"),
      },
      {
        key: "true",
        label: t("All documents"),
        note: t("Include documents that are in the archive"),
      },
    ],
    [t]
  );

  return (
    <FilterOptions
      options={options}
      activeKey={includeArchived ? "true" : undefined}
      onSelect={(key) => onSelect(key === "true")}
      defaultLabel={t("Active documents")}
    />
  );
};

export default StatusFilter;
