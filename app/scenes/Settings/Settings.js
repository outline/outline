// @flow
import React, { Component } from 'react';
import { observer, inject } from 'mobx-react';

import AuthStore from 'stores/AuthStore';
import Input from 'components/Input';
import CenteredContent from 'components/CenteredContent';
import PageTitle from 'components/PageTitle';
import HelpText from 'components/HelpText';

@observer
class Settings extends Component {
  props: {
    auth: AuthStore,
  };

  render() {
    const { user } = this.props.auth;
    if (!user) return null;

    return (
      <CenteredContent>
        <PageTitle title="Profile" />
        <h1>Profile</h1>
        <HelpText>
          You’re signed in to Outline with Slack. To update your profile
          information here please{' '}
          <a href="https://slack.com/account/profile" target="_blank">
            update your profile on Slack
          </a>{' '}
          and re-login to refresh.
        </HelpText>

        <form>
          <Input label="Name" value={user.name} disabled />
          <Input label="Email" value={user.email} disabled />
        </form>
      </CenteredContent>
    );
  }
}

export default inject('auth')(Settings);
