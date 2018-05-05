// @flow
import * as React from 'react';
import styled from 'styled-components';
import Grid from 'styled-components-grid';
import ReactMarkdown from 'react-markdown';
import { Helmet } from 'react-helmet';
import Header from './components/Header';
import { color } from '../../shared/styles/constants';

function Changelog({ body }: { body: string }) {
  return (
    <Grid>
      <Helmet>
        <title>Changelog</title>
      </Helmet>
      <Header>
        <h1>Changelog</h1>
        <p>
          We’re building in public. Here’s what we’ve been changing recently.
        </p>
      </Header>
      <Container source={body} />
    </Grid>
  );
}

const Container = styled(ReactMarkdown)`
  width: 100%;
  max-width: 720px;
  margin: 0 auto;
  padding: 0 2em;

  hr {
    border: 0;
    border-bottom: 1px solid ${color.slateLight};
    margin: 4em 0;
  }
`;

export default Changelog;
