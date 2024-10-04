import { observer } from "mobx-react";
import React from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { AvatarSize } from "~/components/Avatar";
import CollectionIcon from "~/components/Icons/CollectionIcon";
import InputSelect, { Option } from "~/components/InputSelect";
import TeamLogo from "~/components/TeamLogo";
import useCurrentTeam from "~/hooks/useCurrentTeam";
import usePolicy from "~/hooks/usePolicy";
import useRequest from "~/hooks/useRequest";
import useStores from "~/hooks/useStores";
import Label from "./Label";

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
    React.useCallback(async () => {
      if (!collections.isLoaded) {
        await collections.fetchAll({
          limit: 100,
        });
      }
    }, [collections])
  );

  const workspaceOption: Option | null = can.createTemplate
    ? {
        label: (
          <Label
            icon={<TeamLogo model={team} size={AvatarSize.Toast} />}
            value={t("Workspace")}
          />
        ),
        value: "workspace",
      }
    : null;

  const collectionOptions: Option[] = React.useMemo(
    () =>
      collections.orderedData.reduce<Option[]>((memo, collection) => {
        const canCollection = policies.abilities(collection.id);

        if (canCollection.createDocument) {
          memo.push({
            label: (
              <Label
                icon={<CollectionIcon collection={collection} />}
                value={collection.name}
              />
            ),
            value: collection.id,
          });
        }

        return memo;
      }, []),
    [collections.orderedData, policies]
  );

  const options: Option[] = workspaceOption
    ? collectionOptions.length
      ? [
          workspaceOption,
          ...collectionOptions.map((opt, idx) => {
            if (idx !== 0) {
              return opt;
            }
            opt.divider = true;
            return opt;
          }),
        ]
      : [workspaceOption]
    : collectionOptions;

  const handleSelection = React.useCallback(
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
      value={defaultCollectionId ?? "workspace"}
      options={options}
      onChange={handleSelection}
      ariaLabel={t("Location")}
      label={t("Location")}
    />
  );
};

export default observer(SelectLocation);
