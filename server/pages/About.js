// @flow
import React from 'react';
import styled from 'styled-components';
import Grid from 'styled-components-grid';
import { Helmet } from 'react-helmet';

const Header = styled.div`
  width: 100%;
  padding: 3em;
  text-align: center;
`;

export default function About() {
  return (
    <Grid>
      <Helmet>
        <title>About</title>
      </Helmet>
      <Header>
        <h1>About Atlas</h1>
        <p>
          Just a proof of concept for multiple pages.
        </p>
      </Header>
    </Grid>
  );
}
