import { observer } from "mobx-react";
import * as React from "react";
import { useTranslation, Trans } from "react-i18next";
import styled from "styled-components";

import { CollectionPermission } from "@shared/types";
import Collection from "~/models/Collection";
import InputSelectPermission from "~/components/InputSelectPermission";
import Switch from "~/components/Switch";
import Text from "~/components/Text";
import useStores from "~/hooks/useStores";
import useToasts from "~/hooks/useToasts";

type Props = {
  collection: Collection;
};

function CollectionPermissions({ collection }: Props) {
  const { t } = useTranslation();
  const { auth } = useStores();
  const { showToast } = useToasts();

  const handleChangePermission = React.useCallback(
    async (permission: CollectionPermission) => {
      try {
        await collection.save({
          permission,
        });
        showToast(t("Default access permissions were updated"), {
          type: "success",
        });
      } catch (err) {
        showToast(t("Could not update permissions"), {
          type: "error",
        });
      }
    },
    [collection, showToast, t]
  );

  const handleSharingChange = React.useCallback(
    async (ev: React.ChangeEvent<HTMLInputElement>) => {
      try {
        await collection.save({
          sharing: ev.target.checked,
        });
        showToast(t("Public document sharing permissions were updated"), {
          type: "success",
        });
      } catch (err) {
        showToast(t("Could not update public document sharing"), {
          type: "error",
        });
      }
    },
    [collection, showToast, t]
  );

  const collectionName = collection.name;
  const sharing = collection.sharing;
  const teamSharingEnabled = !!auth.team && auth.team.sharing;

  return (
    <>
      <InputSelectPermission
        onChange={handleChangePermission}
        value={collection.permission || ""}
      />
      <PermissionExplainer size="small">
        {!collection.permission && (
          <Trans
            defaults="The <em>{{ collectionName }}</em> collection is private. Team members have no access to it by default."
            values={{
              collectionName,
            }}
            components={{
              em: <strong />,
            }}
          />
        )}
        {collection.permission === CollectionPermission.ReadWrite && (
          <Trans
            defaults="Team members can view and edit documents in the <em>{{ collectionName }}</em> collection by
          default."
            values={{
              collectionName,
            }}
            components={{
              em: <strong />,
            }}
          />
        )}
        {collection.permission === CollectionPermission.Read && (
          <Trans
            defaults="Team members can view documents in the <em>{{ collectionName }}</em> collection by default."
            values={{
              collectionName,
            }}
            components={{
              em: <strong />,
            }}
          />
        )}
      </PermissionExplainer>
      <Switch
        id="sharing"
        label={t("Public document sharing")}
        onChange={handleSharingChange}
        checked={sharing && teamSharingEnabled}
        disabled={!teamSharingEnabled}
        note={
          teamSharingEnabled ? (
            <Trans>
              When enabled, documents can be shared publicly on the internet.
            </Trans>
          ) : (
            <Trans>
              Public sharing is currently disabled in the team security
              settings.
            </Trans>
          )
        }
      />
    </>
  );
}

const PermissionExplainer = styled(Text)`
  margin-top: -8px;
  margin-bottom: 24px;
`;

export default observer(CollectionPermissions);
