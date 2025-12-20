import { observer } from "mobx-react";
import { useCallback, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { AvatarSize } from "~/components/Avatar";
import CollectionIcon from "~/components/Icons/CollectionIcon";
import type { Option } from "~/components/InputSelect";
import { InputSelect } from "~/components/InputSelect";
import TeamLogo from "~/components/TeamLogo";
import useCurrentTeam from "~/hooks/useCurrentTeam";
import usePolicy from "~/hooks/usePolicy";
import useRequest from "~/hooks/useRequest";
import useStores from "~/hooks/useStores";

type Props = {
  /** Collection ID to select by default. */
  defaultCollectionId?: string | null;
  /** Callback to be called when a collection is selected. */
  onSelect: (collectionId: string | null) => void;
};

const SelectLocation = ({ defaultCollectionId, onSelect }: Props) => {
  const { t } = useTranslation();
  const team = useCurrentTeam();
  const { collections, policies } = useStores();
  const can = usePolicy(team);

  const { loading, error } = useRequest(
    useCallback(async () => {
      if (!collections.isLoaded) {
        await collections.fetchAll({
          limit: 100,
        });
      }
    }, [collections])
  );

  const workspaceOption: Option | null = can.createTemplate
    ? {
        type: "item",
        label: t("Workspace"),
        value: "workspace",
        icon: <TeamLogo model={team} size={AvatarSize.Toast} />,
      }
    : null;

  const collectionOptions: Option[] = useMemo(
    () =>
      collections.orderedData.reduce<Option[]>((memo, collection) => {
        const canCollection = policies.abilities(collection.id);

        if (canCollection.createDocument) {
          memo.push({
            type: "item",
            label: collection.name,
            value: collection.id,
            icon: <CollectionIcon collection={collection} />,
          });
        }

        return memo;
      }, []),
    [collections.orderedData, policies]
  );

  const options: Option[] = workspaceOption
    ? collectionOptions.length
      ? [workspaceOption, { type: "separator" }, ...collectionOptions]
      : [workspaceOption]
    : collectionOptions;

  const handleSelection = useCallback(
    (value: string | null) => {
      onSelect(value === "workspace" ? null : value);
    },
    [onSelect]
  );

  if (error) {
    toast.error(t("Collections could not be loaded, please reload the app"));
  }

  if (loading || !options.length) {
    return null;
  }

  return (
    <InputSelect
      options={options}
      value={defaultCollectionId ?? "workspace"}
      onChange={handleSelection}
      label={t("Location")}
    />
  );
};

export default observer(SelectLocation);
