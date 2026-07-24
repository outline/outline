import { compact } from "es-toolkit/compat";
import { observer } from "mobx-react";
import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { ShareTypes } from "@shared/types";
import FilterOptions from "~/components/FilterOptions";

type Props = {
  onSelect: (option: { typeFilter: ShareTypes[] }) => void;
  typeFilter: ShareTypes[];
};

const ShareTypeFilter = ({ onSelect, typeFilter, ...rest }: Props) => {
  const { t } = useTranslation();

  const options = useMemo(
    () =>
      compact([
        {
          key: ShareTypes.Web,
          label: t("Web"),
        },
        {
          key: ShareTypes.Private,
          label: t("Private"),
        },
      ]),
    [t]
  );

  const handleSelect = (key: ShareTypes) => {
    let modifiedTypeFilter;
    if (typeFilter.includes(key)) {
      modifiedTypeFilter = typeFilter.filter((type) => type !== key);
    } else {
      modifiedTypeFilter = [...typeFilter, key];
    }

    onSelect({ typeFilter: modifiedTypeFilter });
  };

  return (
    <FilterOptions
      options={options}
      selectedKeys={typeFilter}
      onSelect={handleSelect}
      defaultLabel={"Any type"}
      {...rest}
    />
  );
};

export default observer(ShareTypeFilter);
