// @flow
import * as React from 'react';
import CenteredContent from 'components/CenteredContent';
import PageTitle from 'components/PageTitle';
import HelpText from 'components/HelpText';

class Zapier extends React.Component<*> {
  render() {
    return (
      <CenteredContent>
        <PageTitle title="Zapier" />
        <h1>Zapier</h1>
        <HelpText>Boop</HelpText>
      </CenteredContent>
    );
  }
}

export default Zapier;
