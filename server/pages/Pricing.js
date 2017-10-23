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

export default function Pricing() {
  return (
    <Grid>
      <Helmet>
        <title>Pricing</title>
      </Helmet>
      <Header>
        <h1>Pricing</h1>
        <p>
          Just a proof of concept for multiple pages.
        </p>
      </Header>
    </Grid>
  );
}
