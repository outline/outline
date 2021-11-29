import { observer } from "mobx-react";
import * as React from "react";
import { useTranslation } from "react-i18next";
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
      key: user.id,
      label: user.name,
    }));
    return [
      {
        key: "",
        label: t("Any author"),
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
