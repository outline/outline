// @flow
import { debounce } from "lodash";
import { observable } from "mobx";
import { observer, inject } from "mobx-react";
import { PadlockIcon } from "outline-icons";
import * as React from "react";
import AuthStore from "stores/AuthStore";
import UiStore from "stores/UiStore";
import Checkbox from "components/Checkbox";
import Heading from "components/Heading";
import HelpText from "components/HelpText";
import Scene from "components/Scene";

type Props = {
  auth: AuthStore,
  ui: UiStore,
};

@observer
class Security extends React.Component<Props> {
  form: ?HTMLFormElement;

  @observable sharing: boolean;
  @observable documentEmbeds: boolean;
  @observable guestSignin: boolean;

  componentDidMount() {
    const { auth } = this.props;
    if (auth.team) {
      this.documentEmbeds = auth.team.documentEmbeds;
      this.guestSignin = auth.team.guestSignin;
      this.sharing = auth.team.sharing;
    }
  }

  handleChange = async (ev: SyntheticInputEvent<*>) => {
    switch (ev.target.name) {
      case "sharing":
        this.sharing = ev.target.checked;
        break;
      case "documentEmbeds":
        this.documentEmbeds = ev.target.checked;
        break;
      case "guestSignin":
        this.guestSignin = ev.target.checked;
        break;
      default:
    }

    await this.props.auth.updateTeam({
      sharing: this.sharing,
      documentEmbeds: this.documentEmbeds,
      guestSignin: this.guestSignin,
    });
    this.showSuccessMessage();
  };

  showSuccessMessage = debounce(() => {
    this.props.ui.showToast("Settings saved", { type: "success" });
  }, 500);

  render() {
    return (
      <Scene title="Security" icon={<PadlockIcon color="currentColor" />}>
        <Heading>Security</Heading>
        <HelpText>
          Settings that impact the access, security, and content of your
          knowledge base.
        </HelpText>

        <Checkbox
          label="Allow email authentication"
          name="guestSignin"
          checked={this.guestSignin}
          onChange={this.handleChange}
          note="When enabled, users can sign-in using their email address"
        />
        <Checkbox
          label="Public document sharing"
          name="sharing"
          checked={this.sharing}
          onChange={this.handleChange}
          note="When enabled, documents can be shared publicly on the internet by any team member"
        />
        <Checkbox
          label="Rich service embeds"
          name="documentEmbeds"
          checked={this.documentEmbeds}
          onChange={this.handleChange}
          note="Links to supported services are shown as rich embeds within your documents"
        />
      </Scene>
    );
  }
}

export default inject("auth", "ui")(Security);
