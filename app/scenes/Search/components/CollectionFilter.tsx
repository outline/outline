import { observer } from "mobx-react";
import { CollectionIcon as SVGCollectionIcon } from "outline-icons";
import * as React from "react";
import { useTranslation } from "react-i18next";
import FilterOptions from "~/components/FilterOptions";
import CollectionIcon from "~/components/Icons/CollectionIcon";
import useStores from "~/hooks/useStores";

type Props = {
  /** The currently selected collection ID */
  collectionId: string | undefined;
  /** Callback to call when a collection is selected */
  onSelect: (key: string | undefined) => void;
};

function CollectionFilter(props: Props) {
  const { t } = useTranslation();
  const { collections } = useStores();
  const { onSelect, collectionId } = props;
  const options = React.useMemo(() => {
    const collectionOptions = collections.orderedData.map((collection) => ({
      key: collection.id,
      label: collection.name,
      icon: <CollectionIcon collection={collection} size={24} />,
    }));
    return [
      {
        key: "",
        label: t("Any collection"),
        icon: <SVGCollectionIcon size={24} />,
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
      showFilter
    />
  );
}

export default observer(CollectionFilter);
