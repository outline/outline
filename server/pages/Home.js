// @flow
import React from 'react';
import styled from 'styled-components';
import Grid from 'styled-components-grid';
import Hero from './components/Hero';
import SignupButton from './components/SignupButton';

function Home() {
  return (
    <span>
      <Grid>
        <Hero>
          <h1>Your team’s knowledge base</h1>
          <HeroText>
            Documentation, meeting notes, playbooks, onboarding, work logs, brainstorming, decisions, & more…
          </HeroText>
          <p>
            <SignupButton />
          </p>
        </Hero>
      </Grid>
    </span>
  );
}

const HeroText = styled.p`
  font-size: 18px;
  max-width: 600px;
  margin-left: auto;
  margin-right: auto;
  margin-bottom: 2em;
`;

export default Home;
