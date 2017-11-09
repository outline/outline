// @flow
import React from 'react';
import Grid from 'styled-components-grid';
import { Helmet } from 'react-helmet';
import Hero from './components/Hero';

export default function About() {
  return (
    <Grid>
      <Helmet>
        <title>About</title>
      </Helmet>
      <Hero>
        <h1>About Outline</h1>
        <p>
          Just a proof of concept for multiple pages.
        </p>
      </Hero>
    </Grid>
  );
}
