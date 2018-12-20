// @flow
import * as React from 'react';
import { find } from 'lodash';
import Grid from 'styled-components-grid';
import { Helmet } from 'react-helmet';
import Header from './components/Header';
import Content from './components/Content';
import IntegrationMenu from './components/IntegrationMenu';
import integrations from '../config/integrations';

export default function Integration({ slug }: { slug: string }) {
  const integation = find(integrations, i => i.slug === slug);

  return (
    <Grid>
      <Helmet>
        <title>{integation.name} Integration</title>
      </Helmet>
      <Header>
        <h1>{integation.name} Integration</h1>
        <p>{integation.description}</p>
      </Header>
      <Content>
        <IntegrationMenu integrations={integrations} />
        <div />
      </Content>
    </Grid>
  );
}
