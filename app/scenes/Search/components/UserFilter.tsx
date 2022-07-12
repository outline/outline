import { observer } from "mobx-react";
import * as React from "react";
import { useTranslation } from "react-i18next";
import User from "~/models/User";
import FilterOptions from "~/components/FilterOptions";
import { PaginatedItem } from "~/components/PaginatedList";
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
      limit: 20,
    });
  }, [users]);

  const options = React.useMemo(() => {
    const userOptions = users.all.map((user) => ({
      key: user.id,
      id: user.id,
      label: user.name,
    }));
    return [
      {
        key: "",
        id: "",
        label: t("Any author"),
      },
      ...userOptions,
    ];
  }, [users.all, t]);

  const paginateFetch = React.useCallback(
    async (options: PaginatedItem) => {
      const list = await users.fetchPage(options);
      return list.map((user: User) => ({
        key: user.id,
        id: user.id,
        label: user.name,
      }));
    },
    [users]
  );

  return (
    <FilterOptions
      options={options}
      activeKey={userId}
      onSelect={onSelect}
      defaultLabel={t("Any author")}
      selectedPrefix={`${t("Author")}:`}
      searchable
      paginateFetch={paginateFetch}
    />
  );
}

export default observer(UserFilter);
