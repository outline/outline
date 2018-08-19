// @flow
import * as React from 'react';
import { observable } from 'mobx';
import { observer, inject } from 'mobx-react';

import AuthStore from 'stores/AuthStore';
import UiStore from 'stores/UiStore';
import Checkbox from 'components/Checkbox';
import Button from 'components/Button';
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

  componentDidMount() {
    const { auth } = this.props;
    if (auth.team) {
      this.sharing = auth.team.sharing;
    }
  }

  handleSubmit = async (ev: SyntheticEvent<*>) => {
    ev.preventDefault();

    await this.props.auth.updateTeam({
      sharing: this.sharing,
    });
    this.props.ui.showToast('Settings saved', 'success');
  };

  handleChange = (ev: SyntheticInputEvent<*>) => {
    if (ev.target.name === 'sharing') {
      this.sharing = ev.target.checked;
    }
  };

  get isValid() {
    return this.form && this.form.checkValidity();
  }

  render() {
    const { isSaving } = this.props.auth;

    return (
      <CenteredContent>
        <PageTitle title="Security" />
        <h1>Security</h1>
        <HelpText>
          Settings that impact the access, security and privacy of your
          knowledgebase.
        </HelpText>

        <form onSubmit={this.handleSubmit} ref={ref => (this.form = ref)}>
          <Checkbox
            label="Allow sharing documents"
            name="sharing"
            checked={this.sharing}
            onChange={this.handleChange}
            note="When enabled documents can be shared publicly by any team member"
          />
          <Button type="submit" disabled={isSaving || !this.isValid}>
            {isSaving ? 'Saving…' : 'Save'}
          </Button>
        </form>
      </CenteredContent>
    );
  }
}

export default inject('auth', 'ui')(Security);
