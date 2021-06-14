// @flow
import { debounce } from "lodash";
import { observable } from "mobx";
import { observer, inject } from "mobx-react";
import * as React from "react";

import AuthStore from "stores/AuthStore";
import UiStore from "stores/UiStore";
import CenteredContent from "components/CenteredContent";
import Checkbox from "components/Checkbox";
import HelpText from "components/HelpText";
import PageTitle from "components/PageTitle";

type Props = {
  auth: AuthStore,
  ui: UiStore,
};

@observer
class Features extends React.Component<Props> {
  form: ?HTMLFormElement;
  @observable multiplayerEditor: boolean;

  componentDidMount() {
    const { auth } = this.props;
    if (auth.team) {
      this.multiplayerEditor = auth.team.multiplayerEditor;
    }
  }

  handleChange = async (ev: SyntheticInputEvent<*>) => {
    switch (ev.target.name) {
      case "multiplayerEditor":
        this.multiplayerEditor = ev.target.checked;
        break;
      default:
    }

    await this.props.auth.updateTeam({
      multiplayerEditor: this.multiplayerEditor,
    });
    this.showSuccessMessage();
  };

  showSuccessMessage = debounce(() => {
    this.props.ui.showToast("Settings saved");
  }, 500);

  render() {
    return (
      <CenteredContent>
        <PageTitle title="Labs" />
        <h1>Labs</h1>
        <HelpText>
          Enable experimental features that are still under development.
        </HelpText>

        <Checkbox
          label="Multiplayer editor"
          name="multiplayerEditor"
          checked={this.multiplayerEditor}
          onChange={this.handleChange}
          note="Allow multiple team members to edit documents at the same time"
        />
      </CenteredContent>
    );
  }
}

export default inject("auth", "ui")(Features);
