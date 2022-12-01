import { observer } from "mobx-react";
import * as React from "react";
import { useTranslation } from "react-i18next";
import Avatar from "~/components/Avatar";
import FilterOptions from "~/components/FilterOptions";
import useStores from "~/hooks/useStores";

type Props = {
  userId: string | undefined;
  onSelect: (key: string | undefined) => void;
};

function UserFilter(props: Props) {
  const { onSelect, userId } = props;
  const { t } = useTranslation();
  const { users } = useStores();

  React.useEffect(() => {
    users.fetchPage({
      limit: 100,
    });
  }, [users]);

  const options = React.useMemo(() => {
    const userOptions = users.all.map((user) => ({
      user,
      key: user.id,
      label: user.name,
      icon: <Avatar model={user} />,
    }));
    return [
      {
        user: undefined,
        key: "",
        label: t("Any author"),
        icon: <Avatar />,
      },
      ...userOptions,
    ];
  }, [users.all, t]);

  return (
    <FilterOptions
      options={options}
      activeKey={userId}
      onSelect={onSelect}
      defaultLabel={t("Any author")}
      selectedPrefix={`${t("Author")}:`}
    />
  );
}

export default observer(UserFilter);
