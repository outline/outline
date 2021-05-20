// @flow
import * as React from "react";
import { useTranslation } from "react-i18next";
import FilterOptions from "components/FilterOptions";

type Props = {|
  activeKey: string,
  onSelect: (key: ?string) => void,
|};

const UserStatusFilter = ({ activeKey, onSelect }: Props) => {
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
    />
  );
};

export default UserStatusFilter;
