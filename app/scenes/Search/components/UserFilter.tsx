import { observer } from "mobx-react";
import * as React from "react";
import { useTranslation } from "react-i18next";
import PaginatedDropdown from "~/components/PaginatedDropdown";
import useStores from "~/hooks/useStores";

type Props = {
  userId: string | undefined;
  onSelect: (key: string | undefined) => void;
};

function UserFilter(props: Props) {
  const { onSelect, userId } = props;
  const { t } = useTranslation();
  const { users } = useStores();

  return (
    <PaginatedDropdown
      activeKey={userId}
      onSelect={onSelect}
      users={users}
      defaultLabel={t("Any author")}
      defaultOption={{ id: "", label: t("Any author") }}
      selectedPrefix={`${t("Author")}:`}
    />
  );
}

export default observer(UserFilter);
