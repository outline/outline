// @flow
import { debounce } from "lodash";
import { observer } from "mobx-react";
import { PadlockIcon } from "outline-icons";
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

function Security() {
  const { auth } = useStores();
  const team = useCurrentTeam();
  const { t } = useTranslation();
  const { showToast } = useToasts();
  const [sharing, setSharing] = useState(team.sharing);
  const [documentEmbeds, setDocumentEmbeds] = useState(team.documentEmbeds);
  const [guestSignin, setGuestSignin] = useState(team.guestSignin);

  const showSuccessMessage = React.useCallback(
    debounce(() => {
      showToast(t("Settings saved"), { type: "success" });
    }, 250),
    []
  );

  const handleChange = React.useCallback(async (ev: SyntheticInputEvent<*>) => {
    switch (ev.target.name) {
      case "sharing":
        setSharing(ev.target.checked);
        break;
      case "documentEmbeds":
        setDocumentEmbeds(ev.target.checked);
        break;
      case "guestSignin":
        setGuestSignin(ev.target.checked);
        break;
      default:
    }
  }, []);

  React.useEffect(() => {
    async function save() {
      await auth.updateTeam({
        sharing,
        documentEmbeds,
        guestSignin,
      });

      showSuccessMessage();
    }

    if (
      team.sharing !== sharing ||
      team.documentEmbeds !== documentEmbeds ||
      team.guestSignin !== guestSignin
    ) {
      save();
    }
  }, [auth, team, sharing, documentEmbeds, guestSignin, showSuccessMessage]);

  return (
    <Scene title={t("Security")} icon={<PadlockIcon color="currentColor" />}>
      <Heading>
        <Trans>Security</Trans>
      </Heading>
      <HelpText>
        <Trans>
          Settings that impact the access, security, and content of your
          knowledge base.
        </Trans>
      </HelpText>

      <Checkbox
        label={t("Allow email authentication")}
        name="guestSignin"
        checked={guestSignin}
        onChange={handleChange}
        note={t("When enabled, users can sign-in using their email address")}
      />
      <Checkbox
        label={t("Public document sharing")}
        name="sharing"
        checked={sharing}
        onChange={handleChange}
        note={t(
          "When enabled, documents can be shared publicly on the internet by any team member"
        )}
      />
      <Checkbox
        label={t("Rich service embeds")}
        name="documentEmbeds"
        checked={documentEmbeds}
        onChange={handleChange}
        note={t(
          "Links to supported services are shown as rich embeds within your documents"
        )}
      />
    </Scene>
  );
}

export default observer(Security);
