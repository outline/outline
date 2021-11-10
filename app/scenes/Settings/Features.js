// @flow
import { debounce } from "lodash";
import { observer } from "mobx-react";
import { BeakerIcon } from "outline-icons";
import * as React from "react";
import { useState } from "react";
import { useTranslation, Trans } from "react-i18next";
import Checkbox from "components/Checkbox";
import Heading from "components/Heading";
import HelpText from "components/HelpText";
import Scene from "components/Scene";
import useCurrentTeam from "hooks/useCurrentTeam";
import useStores from "hooks/useStores";
import useToasts from "hooks/useToasts";

function Features() {
  const { auth } = useStores();
  const team = useCurrentTeam();
  const { t } = useTranslation();
  const { showToast } = useToasts();
  const [data, setData] = useState({
    collaborativeEditing: team.collaborativeEditing,
  });

  const showSuccessMessage = React.useCallback(
    debounce(() => {
      showToast(t("Settings saved"), { type: "success" });
    }, 250),
    [t, showToast]
  );

  const handleChange = React.useCallback(
    async (ev: SyntheticInputEvent<*>) => {
      const newData = { ...data, [ev.target.name]: ev.target.checked };
      setData(newData);

      await auth.updateTeam(newData);

      showSuccessMessage();
    },
    [auth, data, showSuccessMessage]
  );

  return (
    <Scene title={t("Features")} icon={<BeakerIcon color="currentColor" />}>
      <Heading>
        <Trans>Features</Trans>
      </Heading>
      <HelpText>
        <Trans>
          Manage optional and beta features. Changing these settings will affect
          the experience for all team members.
        </Trans>
      </HelpText>
      <Checkbox
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
