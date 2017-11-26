// @flow
import React, { Component } from 'react';
import { observer } from 'mobx-react';

import CenteredContent from 'components/CenteredContent';
import PageTitle from 'components/PageTitle';
import HelpText from 'components/HelpText';

@observer
class Settings extends Component {
  render() {
    return (
      <CenteredContent>
        <PageTitle title="Profile" />
        <h1>Profile</h1>
        <HelpText>Todo.</HelpText>
      </CenteredContent>
    );
  }
}

export default Settings;
