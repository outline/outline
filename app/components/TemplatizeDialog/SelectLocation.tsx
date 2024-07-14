import React from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import styled from "styled-components";
import { AvatarSize } from "~/components/Avatar/Avatar";
import CollectionIcon from "~/components/Icons/CollectionIcon";
import InputSelect, { Option } from "~/components/InputSelect";
import TeamLogo from "~/components/TeamLogo";
import useCurrentTeam from "~/hooks/useCurrentTeam";
import usePolicy from "~/hooks/usePolicy";
import useRequest from "~/hooks/useRequest";
import useStores from "~/hooks/useStores";
import Label from "./Label";

type Props = {
  id: string;
  defaultCollectionId?: string | null;
  onSelect: (collectionId: string | null) => void;
};

const SelectLocation = ({ id, defaultCollectionId, onSelect }: Props) => {
  const { t } = useTranslation();
  const team = useCurrentTeam();
  const { collections, policies } = useStores();
  const can = usePolicy(team);

  const { loading, error } = useRequest(
    React.useCallback(async () => {
      if (!collections.isLoaded) {
        await collections.fetchPage({
          limit: 100,
        });
      }
    }, [collections])
  );

  const workspaceOption: Option | null = can.createDocument
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

  const collectionOptions = React.useMemo(
    () =>
      collections.orderedData.reduce<Option[]>((options, collection) => {
        const can = policies.abilities(collection.id);

        if (can.createDocument) {
          options.push({
            label: (
              <Label
                icon={<CollectionIcon collection={collection} />}
                value={collection.name}
              />
            ),
            value: collection.id,
          });
        }

        return options;
      }, []),
    [collections.orderedData, policies]
  );

  const options = workspaceOption
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
    <StyledSelect
      id={id}
      value={defaultCollectionId ?? "workspace"}
      options={options}
      onChange={handleSelection}
      ariaLabel={t("Location")}
    />
  );
};

const StyledSelect = styled(InputSelect)`
  width: 220px;
`;

export default SelectLocation;
