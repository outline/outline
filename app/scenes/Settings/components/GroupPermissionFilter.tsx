import { observer } from "mobx-react";
import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { GroupPermission } from "@shared/types";
import FilterOptions from "~/components/FilterOptions";

type Props = {
  activeKey: string;
  onSelect: (key: string | null | undefined) => void;
};

/**
 * Filter component for group member permissions.
 */
const GroupPermissionFilter = ({ activeKey, onSelect, ...rest }: Props) => {
  const { t } = useTranslation();

  const options = useMemo(
    () => [
      {
        key: "",
        label: t("All permissions"),
      },
      {
        key: GroupPermission.Admin,
        label: t("Group admin"),
      },
      {
        key: GroupPermission.Member,
        label: t("Member"),
      },
    ],
    [t]
  );

  return (
    <FilterOptions
      options={options}
      selectedKeys={[activeKey]}
      onSelect={onSelect}
      defaultLabel={t("All permissions")}
      {...rest}
    />
  );
};

export default observer(GroupPermissionFilter);
