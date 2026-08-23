import { observer } from "mobx-react";
import { useCallback, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { AvatarSize } from "~/components/Avatar";
import CollectionIcon from "~/components/Icons/NotebookIcon";
import type { Option } from "~/components/InputSelect";
import { InputSelect } from "~/components/InputSelect";
import TeamLogo from "~/components/TeamLogo";
import useCurrentTeam from "~/hooks/useCurrentTeam";
import usePolicy from "~/hooks/usePolicy";
import useRequest from "~/hooks/useRequest";
import useStores from "~/hooks/useStores";
type Props = {
  /** Notebook ID to select by default. */
  defaultNotebookId?: string | null;
  /** Callback to be called when a notebook is selected. */
  onSelect: (notebookId: string | null) => void;
};
const SelectLocation = ({ defaultNotebookId, onSelect }: Props) => {
  const { t } = useTranslation();
  const team = useCurrentTeam();
  const { notebooks, policies } = useStores();
  const can = usePolicy(team);
  const { loading, error } = useRequest(
    useCallback(async () => {
      if (!notebooks.isLoaded) {
        await notebooks.fetchAll({
          limit: 100,
        });
      }
    }, [notebooks])
  );
  const workspaceOption: Option | null = can.createTemplate
    ? {
        type: "item",
        label: t("Workspace"),
        value: "workspace",
        icon: <TeamLogo model={team} size={AvatarSize.Toast} />,
      }
    : null;
  const notebookOptions: Option[] = useMemo(
    () =>
      notebooks.orderedData.reduce<Option[]>((memo, notebook) => {
        const canNotebook = policies.abilities(notebook.id);
        if (canNotebook.createTemplate) {
          memo.push({
            type: "item",
            label: notebook.name,
            value: notebook.id,
            icon: <CollectionIcon notebook={notebook} />,
          });
        }
        return memo;
      }, []),
    [notebooks.orderedData, policies]
  );
  const options: Option[] = workspaceOption
    ? notebookOptions.length
      ? [workspaceOption, { type: "separator" }, ...notebookOptions]
      : [workspaceOption]
    : notebookOptions;
  const handleSelection = useCallback(
    (value: string | null) => {
      onSelect(value === "workspace" ? null : value);
    },
    [onSelect]
  );
  if (error) {
    toast.error(t("Notebooks could not be loaded, please reload the app"));
  }
  if (loading || !options.length) {
    return null;
  }
  return (
    <InputSelect
      options={options}
      value={defaultNotebookId ?? "workspace"}
      onChange={handleSelection}
      label={t("Location")}
    />
  );
};
export default observer(SelectLocation);
