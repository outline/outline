import { observer } from "mobx-react";
import { BeakerIcon } from "outline-icons";
import { useState } from "react";
import * as React from "react";
import { Trans, useTranslation } from "react-i18next";
import ConfirmationDialog from "~/components/ConfirmationDialog";
import Heading from "~/components/Heading";
import Scene from "~/components/Scene";
import Switch from "~/components/Switch";
import Text from "~/components/Text";
import useCurrentTeam from "~/hooks/useCurrentTeam";
import useStores from "~/hooks/useStores";
import useToasts from "~/hooks/useToasts";
import isCloudHosted from "~/utils/isCloudHosted";
import SettingRow from "./components/SettingRow";

function Features() {
  const { auth, dialogs } = useStores();
  const team = useCurrentTeam();
  const { t } = useTranslation();
  const { showToast } = useToasts();
  const [data, setData] = useState({
    collaborativeEditing: team.collaborativeEditing,
  });

  const handleChange = async (ev: React.ChangeEvent<HTMLInputElement>) => {
    const newData = { ...data, [ev.target.name]: ev.target.checked };
    setData(newData);

    await auth.updateTeam(newData);
    showToast(t("Settings saved"), {
      type: "success",
    });
  };

  const handleCollabDisable = async () => {
    const newData = { ...data, collaborativeEditing: false };
    setData(newData);

    await auth.updateTeam(newData);
    showToast(t("Settings saved"), {
      type: "success",
    });
  };

  const handleCollabDisableConfirm = () => {
    dialogs.openModal({
      isCentered: true,
      title: t("Are you sure you want to disable collaborative editing?"),
      content: (
        <DisableCollaborativeEditingDialog onSubmit={handleCollabDisable} />
      ),
    });
  };

  return (
    <Scene title={t("Features")} icon={<BeakerIcon color="currentColor" />}>
      <Heading>{t("Features")}</Heading>
      <Text type="secondary">
        <Trans>
          Manage optional and beta features. Changing these settings will affect
          the experience for all team members.
        </Trans>
      </Text>
      <SettingRow
        name="collaborativeEditing"
        label={t("Collaborative editing")}
        description={t(
          "When enabled multiple people can edit documents at the same time with shared presence and live cursors."
        )}
      >
        <Switch
          id="collaborativeEditing"
          name="collaborativeEditing"
          checked={data.collaborativeEditing}
          disabled={data.collaborativeEditing && isCloudHosted}
          onChange={
            data.collaborativeEditing
              ? handleCollabDisableConfirm
              : handleChange
          }
        />
      </SettingRow>
    </Scene>
  );
}

function DisableCollaborativeEditingDialog({
  onSubmit,
}: {
  onSubmit: () => void;
}) {
  const { t } = useTranslation();

  return (
    <ConfirmationDialog
      onSubmit={onSubmit}
      submitText={t("I’m sure – Disable")}
      danger
    >
      <>
        <Text type="secondary">
          <Trans>
            Enabling collaborative editing again in the future may cause some
            documents to revert to this point in time. It is not advised to
            disable this feature.
          </Trans>
        </Text>
      </>
    </ConfirmationDialog>
  );
}

export default observer(Features);
