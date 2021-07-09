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
import useStores from "hooks/useStores";

function Security() {
  const { auth, ui } = useStores();
  const team = auth.team;
  const { t } = useTranslation();
  const [sharing, setSharing] = useState(team?.documentEmbeds);
  const [documentEmbeds, setDocumentEmbeds] = useState(team?.guestSignin);
  const [guestSignin, setGuestSignin] = useState(team?.sharing);

  const handleChange = async (ev: SyntheticInputEvent<*>) => {
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

    await auth.updateTeam({
      sharing,
      documentEmbeds,
      guestSignin,
    });

    showSuccessMessage();
  };

  const showSuccessMessage = debounce(() => {
    ui.showToast(t("Settings saved"), { type: "success" });
  }, 500);

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
