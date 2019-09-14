// @flow
import * as React from 'react';
import { observable } from 'mobx';
import { observer, inject } from 'mobx-react';
import { debounce } from 'lodash';

import AuthStore from 'stores/AuthStore';
import UiStore from 'stores/UiStore';
import Checkbox from 'components/Checkbox';
import CenteredContent from 'components/CenteredContent';
import PageTitle from 'components/PageTitle';
import HelpText from 'components/HelpText';

type Props = {
  auth: AuthStore,
  ui: UiStore,
};

@observer
class Security extends React.Component<Props> {
  form: ?HTMLFormElement;

  @observable sharing: boolean;
  @observable documentEmbeds: boolean;

  componentDidMount() {
    const { auth } = this.props;
    if (auth.team) {
      this.documentEmbeds = auth.team.documentEmbeds;
      this.sharing = auth.team.sharing;
    }
  }

  handleChange = async (ev: SyntheticInputEvent<*>) => {
    switch (ev.target.name) {
      case 'sharing':
        this.sharing = ev.target.checked;
        break;
      case 'documentEmbeds':
        this.documentEmbeds = ev.target.checked;
        break;
      default:
    }

    await this.props.auth.updateTeam({
      sharing: this.sharing,
      documentEmbeds: this.documentEmbeds,
    });
    this.showSuccessMessage();
  };

  showSuccessMessage = debounce(() => {
    this.props.ui.showToast('Settings saved');
  }, 500);

  render() {
    return (
      <CenteredContent>
        <PageTitle title="Security" />
        <h1>Security</h1>
        <HelpText>
          Settings that impact the access, security, and content of your
          knowledgebase.
        </HelpText>

        <Checkbox
          label="Public document sharing"
          name="sharing"
          checked={this.sharing}
          onChange={this.handleChange}
          note="When enabled documents can be shared publicly by any team member"
        />
        <Checkbox
          label="Rich service embeds"
          name="documentEmbeds"
          checked={this.documentEmbeds}
          onChange={this.handleChange}
          note="Convert links to supported services into rich embeds within your documents"
        />
      </CenteredContent>
    );
  }
}

export default inject('auth', 'ui')(Security);
