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
      limit: 20,
    });
  }, [users]);

  const options = React.useMemo(() => {
    const userOptions = users.unorderedData.map((user) => ({
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
  }, [users.unorderedData, t]);

  const search = React.useCallback(
    async (query: string) => {
      const res = await users.find(query);
      return res.map((user) => ({
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
      search={search}
      paginateFetch={users.fetchPage}
    />
  );
}

export default observer(UserFilter);
