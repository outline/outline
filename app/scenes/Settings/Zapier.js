// @flow
import * as React from 'react';
import CenteredContent from 'components/CenteredContent';
import PageTitle from 'components/PageTitle';
import HelpText from 'components/HelpText';
import Button from 'components/Button';

class Zapier extends React.Component<*> {
  goToZapier = () => {
    window.open(
      'https://zapier.com/platform/public-invite/5927/a0b2747dbb017723b55fc54f4f0cdcae/'
    );
  };
  render() {
    return (
      <CenteredContent>
        <PageTitle title="Zapier" />
        <h1>Zapier</h1>
        <HelpText>
          There is now an Outline app on{' '}
          <a
            href="https://zapier.com"
            rel="noopener noreferrer"
            target="_blank"
          >
            Zapier
          </a>{' '}
          to allow easy integration with hundreds of other business services. It
          is currently in early access, to use the integration and hook up to
          your wiki simply accept the public invite below. All configuration is
          done within Zapier itself.
        </HelpText>
        <p>
          <Button onClick={this.goToZapier}>Zapier Public Invite</Button>
        </p>
      </CenteredContent>
    );
  }
}

export default Zapier;
