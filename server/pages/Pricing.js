// @flow
import React from 'react';
import Grid from 'styled-components-grid';
import { Helmet } from 'react-helmet';
import Hero from './components/Hero';

export default function Pricing() {
  return (
    <Grid>
      <Helmet>
        <title>Pricing</title>
      </Helmet>
      <Hero>
        <h1>Pricing</h1>
        <p>
          Explore Atlas with a 14 day trial, free forever for teams smaller than 5.
        </p>
      </Hero>
    </Grid>
  );
}
