import * as React from "react";
import { useTranslation } from "react-i18next";
import FilterOptions from "~/components/FilterOptions";

type Props = {
  activeKey: string;
  onSelect: (key: string | null | undefined) => void;
};

const UserStatusFilter = ({ activeKey, onSelect, ...rest }: Props) => {
  const { t } = useTranslation();
  const options = React.useMemo(
    () => [
      {
        key: "",
        label: t("Active"),
      },
      {
        key: "all",
        label: t("Everyone"),
      },
      {
        key: "admins",
        label: t("Admins"),
      },
      {
        key: "suspended",
        label: t("Suspended"),
      },
      {
        key: "invited",
        label: t("Invited"),
      },
      {
        key: "viewers",
        label: t("Viewers"),
      },
    ],
    [t]
  );

  return (
    <FilterOptions
      options={options}
      activeKey={activeKey}
      onSelect={onSelect}
      defaultLabel={t("Active")}
      {...rest}
    />
  );
};

export default UserStatusFilter;
