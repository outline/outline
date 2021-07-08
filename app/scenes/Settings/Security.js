// @flow
import { debounce } from "lodash";
import { observer } from "mobx-react";
import { PadlockIcon } from "outline-icons";
import * as React from "react";
import { useState } from "react";
import Checkbox from "components/Checkbox";
import Heading from "components/Heading";
import HelpText from "components/HelpText";
import Scene from "components/Scene";
import useStores from "hooks/useStores";

function Security() {
  const { auth, ui } = useStores();
  const team = auth.team;

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
    ui.showToast("Settings saved", { type: "success" });
  }, 500);

  return (
    <Scene title="Security" icon={<PadlockIcon color="currentColor" />}>
      <Heading>Security</Heading>
      <HelpText>
        Settings that impact the access, security, and content of your knowledge
        base.
      </HelpText>

      <Checkbox
        label="Allow email authentication"
        name="guestSignin"
        checked={guestSignin}
        onChange={handleChange}
        note="When enabled, users can sign-in using their email address"
      />
      <Checkbox
        label="Public document sharing"
        name="sharing"
        checked={sharing}
        onChange={handleChange}
        note="When enabled, documents can be shared publicly on the internet by any team member"
      />
      <Checkbox
        label="Rich service embeds"
        name="documentEmbeds"
        checked={documentEmbeds}
        onChange={handleChange}
        note="Links to supported services are shown as rich embeds within your documents"
      />
    </Scene>
  );
}

export default observer(Security);
