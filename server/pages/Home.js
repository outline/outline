// @flow
import React from 'react';
import styled from 'styled-components';
import Grid from 'styled-components-grid';
import Hero from './components/Hero';
import SlackSignin from './components/SlackSignin';
import { color } from '../../shared/styles/constants';

const Unit = Grid.Unit;

function Home() {
  return (
    <Grid>
      <Hero>
        <h1>Your team’s knowledge base</h1>
        <HeroText>
          Documentation, meeting notes, playbooks, onboarding, work logs, brainstorming, decisions, & more…
        </HeroText>
        <p>
          <SlackSignin />
        </p>
      </Hero>
      <Unit size={{ desktop: 1 / 2 }} />
      <Feature size={{ desktop: 1 / 2 }}>
        <h2>Blazing Fast</h2>
        <p>
          Atlas is fast, really fast. We’ve trimmed 100ms and 50ms there to make sure that documents load instantly, search is speedy and there are keyboard shortcuts for everything.
        </p>
      </Feature>

      <Feature size={{ desktop: 1 / 2 }}>
        <h2>Markdown Support</h2>
        <p>
          Documents are stored in Markdown and you can export them at any time. Markdown shortcuts are also built right into the editor so you can easily format using markdown syntax or our GUI.
        </p>
      </Feature>
      <Unit size={{ desktop: 1 / 2 }} />

      <Unit size={{ desktop: 1 / 2 }} />
      <Feature size={{ desktop: 1 / 2 }}>
        <h2>Beautiful Editor</h2>
        <p>
          We built a custom editor that’s a joy to use. Whether you’re typing up quick meeting notes or documenting a full API the interface gets out of your way and lets you focus on the content.
        </p>
      </Feature>

      <MiniFeature size={{ desktop: 1 / 3 }}>
        <h2>Powerful Search</h2>
        <p>
          Built-in search makes that one document easy to find in a large knowledgebase.
        </p>
      </MiniFeature>
      <MiniFeature size={{ desktop: 1 / 3 }}>
        <h2>API & Integrations</h2>
        <p>
          Atlas is built on it’s own API, treat Atlas as a CMS or automatically create documents from outside events.
        </p>
      </MiniFeature>
      <MiniFeature size={{ desktop: 1 / 3 }}>
        <h2>Open Source</h2>
        <p>
          Want to contribute or host Atlas yourself? All of the code is available on GitHub.
        </p>
      </MiniFeature>
    </Grid>
  );
}

const Feature = styled(Unit)`
  padding: 3em;
  padding: 80px;
  background: ${color.smoke}
`;

const MiniFeature = styled(Unit)`
  padding: 80px 40px;
`;

const HeroText = styled.p`
  font-size: 18px;
  max-width: 600px;
  margin-left: auto;
  margin-right: auto;
  margin-bottom: 2em;
`;

export default Home;
