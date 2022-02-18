import { observer } from "mobx-react";
import { BeakerIcon } from "outline-icons";
import { useState } from "react";
import * as React from "react";
import { useTranslation, Trans } from "react-i18next";
import Heading from "~/components/Heading";
import Scene from "~/components/Scene";
import Switch from "~/components/Switch";
import Text from "~/components/Text";
import useCurrentTeam from "~/hooks/useCurrentTeam";
import useStores from "~/hooks/useStores";
import useToasts from "~/hooks/useToasts";

function Features() {
  const { auth } = useStores();
  const team = useCurrentTeam();
  const { t } = useTranslation();
  const { showToast } = useToasts();
  const [data, setData] = useState({
    collaborativeEditing: team.collaborativeEditing,
  });

  const handleChange = React.useCallback(
    async (ev: React.ChangeEvent<HTMLInputElement>) => {
      const newData = { ...data, [ev.target.name]: ev.target.checked };
      setData(newData);

      await auth.updateTeam(newData);
      showToast(t("Settings saved"), {
        type: "success",
      });
    },
    [auth, data, showToast, t]
  );

  return (
    <Scene title={t("Features")} icon={<BeakerIcon color="currentColor" />}>
      <Heading>
        <Trans>Features</Trans>
      </Heading>
      <Text type="secondary">
        <Trans>
          Manage optional and beta features. Changing these settings will affect
          the experience for all team members.
        </Trans>
      </Text>
      <Switch
        label={t("Collaborative editing")}
        name="collaborativeEditing"
        checked={data.collaborativeEditing}
        onChange={handleChange}
        note={
          <Trans>
            When enabled multiple people can edit documents at the same time
            with shared presence and live cursors.
          </Trans>
        }
      />
    </Scene>
  );
}

export default observer(Features);
