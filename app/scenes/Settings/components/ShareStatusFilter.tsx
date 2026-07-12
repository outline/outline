import { compact } from "es-toolkit/compat";
import { observer } from "mobx-react";
import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { ShareStatus } from "@shared/types";
import FilterOptions from "~/components/FilterOptions";

type Props = {
  onSelect: (option: { statusFilter: ShareStatus[] }) => void;
  statusFilter: ShareStatus[];
};

const ShareStatusFilter = ({ onSelect, statusFilter, ...rest }: Props) => {
  const { t } = useTranslation();

  const options = useMemo(
    () =>
      compact([
        {
          key: ShareStatus.Active,
          label: t("Active"),
        },
        {
          key: ShareStatus.Inactive,
          label: t("Inactive"),
        },
      ]),
    [t]
  );

  const handleSelect = (key: ShareStatus) => {
    let modifiedStatusFilter;
    if (statusFilter.includes(key)) {
      modifiedStatusFilter = statusFilter.filter((status) => status !== key);
    } else {
      modifiedStatusFilter = [...statusFilter, key];
    }

    onSelect({ statusFilter: modifiedStatusFilter });
  };

  return (
    <FilterOptions
      options={options}
      selectedKeys={statusFilter}
      onSelect={handleSelect}
      defaultLabel={"Any status"}
      {...rest}
    />
  );
};

export default observer(ShareStatusFilter);
