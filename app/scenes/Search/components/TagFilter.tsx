import { observer } from "mobx-react";
import { HashtagIcon } from "outline-icons";
import { useEffect, useMemo } from "react";
import { useTranslation } from "react-i18next";
import FilterOptions from "~/components/FilterOptions";
import useStores from "~/hooks/useStores";

type Props = {
  /** The currently selected tag ID */
  tagId: string | undefined;
  /** Callback to call when a tag is selected */
  onSelect: (key: string | undefined) => void;
};

function TagFilter({ tagId, onSelect }: Props) {
  const { t } = useTranslation();
  const { tags } = useStores();

  useEffect(() => {
    if (!tags.isLoaded) {
      void tags.fetchPage();
    }
  }, [tags]);

  const options = useMemo(() => {
    const tagOptions = tags.orderedData.map((tag) => ({
      key: tag.id,
      label: tag.name,
      icon: <HashtagIcon size={24} />,
    }));
    return [
      {
        key: "",
        label: t("Any tag"),
        icon: <HashtagIcon size={24} />,
      },
      ...tagOptions,
    ];
  }, [tags.orderedData, t]);

  return (
    <FilterOptions
      options={options}
      selectedKeys={[tagId]}
      onSelect={onSelect}
      defaultLabel={t("Any tag")}
      showFilter
    />
  );
}

export default observer(TagFilter);
