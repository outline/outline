// @flow
import * as React from 'react';
import Grid from 'styled-components-grid';
import { Helmet } from 'react-helmet';
import Markdown from '../components/Markdown';
import Header from '../components/Header';
import Content from '../components/Content';
import Menu from './Menu';
import integrations from './content';

type TIntegration = {
  slug: string,
  name: string,
  url: string,
  description: string,
};

type Props = {
  integration: TIntegration,
  content: string,
};

export default function Integration({ integration, content }: Props) {
  return (
    <Grid>
      <Helmet>
        <title>{integration.name} Integration</title>
      </Helmet>
      <Header background="#F4F7FA">
        <h1>{integration.name} Integration</h1>
        <p>{integration.description}</p>
      </Header>
      <Content>
        <Grid>
          <Grid.Unit
            size={{ tablet: 1 / 4 }}
            visible={{ mobile: false, tablet: true }}
          >
            <Menu integrations={integrations} active={integration.slug} />
          </Grid.Unit>
          <Grid.Unit size={{ tablet: 3 / 4 }}>
            <Markdown source={content} />
          </Grid.Unit>
        </Grid>
      </Content>
    </Grid>
  );
}
