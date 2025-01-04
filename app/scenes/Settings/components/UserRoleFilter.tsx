import compact from "lodash/compact";
import { observer } from "mobx-react";
import * as React from "react";
import { useTranslation } from "react-i18next";
import { UserRole } from "@shared/types";
import FilterOptions from "~/components/FilterOptions";

type Props = {
  activeKey: string;
  onSelect: (key: string | null | undefined) => void;
};

const UserRoleFilter = ({ activeKey, onSelect, ...rest }: Props) => {
  const { t } = useTranslation();

  const options = React.useMemo(
    () =>
      compact([
        {
          key: "",
          label: t("All roles"),
        },
        {
          key: UserRole.Admin,
          label: t("Admins"),
        },
        {
          key: UserRole.Member,
          label: t("Editors"),
        },
        {
          key: UserRole.Viewer,
          label: t("Viewers"),
        },
      ]),
    [t]
  );

  return (
    <FilterOptions
      options={options}
      selectedKeys={[activeKey]}
      onSelect={onSelect}
      defaultLabel={t("All roles")}
      {...rest}
    />
  );
};

export default observer(UserRoleFilter);
