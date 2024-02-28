import { observer } from "mobx-react";
import * as React from "react";
import { useTranslation } from "react-i18next";
import FilterOptions from "~/components/FilterOptions";
import useStores from "~/hooks/useStores";

type Props = {
  collectionId: string | undefined;
  onSelect: (key: string | undefined) => void;
};

function CollectionFilter(props: Props) {
  const { t } = useTranslation();
  const { collections } = useStores();
  const { onSelect, collectionId } = props;
  const options = React.useMemo(() => {
    const collectionOptions = collections.orderedData.map((user) => ({
      key: user.id,
      label: user.name,
    }));
    return [
      {
        key: "",
        label: t("Any collection"),
      },
      ...collectionOptions,
    ];
  }, [collections.orderedData, t]);
  return (
    <FilterOptions
      options={options}
      selectedKeys={[collectionId]}
      onSelect={onSelect}
      defaultLabel={t("Any collection")}
      selectedPrefix={`${t("Collection")}:`}
    />
  );
}

export default observer(CollectionFilter);
