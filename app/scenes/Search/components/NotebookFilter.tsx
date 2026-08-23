import { observer } from "mobx-react";
import { CollectionIcon as SVGNotebookIcon } from "outline-icons";
import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import FilterOptions from "~/components/FilterOptions";
import CollectionIcon from "~/components/Icons/NotebookIcon";
import useStores from "~/hooks/useStores";
type Props = {
  /** The currently selected notebook ID */
  notebookId: string | undefined;
  /** Callback to call when a notebook is selected */
  onSelect: (key: string | undefined) => void;
};
function NotebookFilter(props: Props) {
  const { t } = useTranslation();
  const { notebooks } = useStores();
  const { onSelect, notebookId } = props;
  const options = useMemo(() => {
    const notebookOptions = notebooks.orderedData.map((notebook) => ({
      key: notebook.id,
      label: notebook.name,
      icon: <CollectionIcon notebook={notebook} size={24} />,
    }));
    return [
      {
        key: "",
        label: t("Any notebook"),
        icon: <SVGNotebookIcon size={24} />,
      },
      ...notebookOptions,
    ];
  }, [notebooks.orderedData, t]);
  return (
    <FilterOptions
      options={options}
      selectedKeys={[notebookId]}
      onSelect={onSelect}
      defaultLabel={t("Any notebook")}
      showFilter
    />
  );
}
export default observer(NotebookFilter);
