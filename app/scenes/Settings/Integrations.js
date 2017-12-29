// @flow
import React, { Component } from 'react';
import { observable } from 'mobx';
import { observer, inject } from 'mobx-react';
import { Link } from 'react-router-dom';
import SettingsStore from 'stores/SettingsStore';

import CenteredContent from 'components/CenteredContent';
import PageTitle from 'components/PageTitle';
import HelpText from 'components/HelpText';

@observer
class Integrations extends Component {
  @observable name: string = '';
  props: {
    settings: SettingsStore,
  };

  render() {
    const { settings } = this.props;

    return (
      <CenteredContent>
        <PageTitle title="Integrations" />
        <h1>Integrations</h1>

        <p>A list of integrations</p>
      </CenteredContent>
    );
  }
}

export default inject('settings')(Integrations);
