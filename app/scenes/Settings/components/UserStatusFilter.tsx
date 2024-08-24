import compact from "lodash/compact";
import { observer } from "mobx-react";
import * as React from "react";
import { useTranslation } from "react-i18next";
import FilterOptions from "~/components/FilterOptions";
import useCurrentUser from "~/hooks/useCurrentUser";

type Props = {
  activeKey: string;
  onSelect: (key: string | null | undefined) => void;
};

const UserStatusFilter = ({ activeKey, onSelect, ...rest }: Props) => {
  const { t } = useTranslation();
  const user = useCurrentUser();

  const options = React.useMemo(
    () =>
      compact([
        {
          key: "all",
          label: t("All status"),
        },
        {
          key: "",
          label: t("Active"),
        },
        ...(user.isAdmin
          ? [
              {
                key: "suspended",
                label: t("Suspended"),
              },
            ]
          : []),
        {
          key: "invited",
          label: t("Invited"),
        },
      ]),
    [t, user.isAdmin]
  );

  return (
    <FilterOptions
      options={options}
      selectedKeys={[activeKey]}
      onSelect={onSelect}
      defaultLabel={t("Active")}
      {...rest}
    />
  );
};

export default observer(UserStatusFilter);
