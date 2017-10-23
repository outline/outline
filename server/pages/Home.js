// @flow
import React from 'react';
import styled from 'styled-components';
import Grid from 'styled-components-grid';
import Hero from './components/Hero';

const Unit = Grid.Unit;

const Feature = styled(Unit)`
  padding: 3em;
`;

export default function Home() {
  return (
    <Grid>
      <Hero>
        <h1>Your team’s knowledge base</h1>
        <p>
          Documentation, meeting notes, playbooks, onboarding, work logs, brainstorming, decisions, & more…
        </p>
        <a href="/auth/slack">Sign In</a>
      </Hero>
      <Unit size={{ desktop: 1 / 2 }} />
      <Unit size={{ desktop: 1 / 2 }}>
        <h2>Blazing Fast</h2>
        <p>
          Atlas is fast, really fast. We’ve trimmed 100ms and 50ms there to make sure that documents load instantly, search is speedy and there are keyboard shortcuts for everything.
        </p>
      </Unit>

      <Unit size={{ desktop: 1 / 2 }}>
        <h2>Markdown Support</h2>
        <p>
          Documents are stored in Markdown and you can export them at any time. Markdown shortcuts are also built right into the editor so you can easily format using markdown syntax or our GUI.
        </p>
      </Unit>
      <Unit size={{ desktop: 1 / 2 }} />

      <Unit size={{ desktop: 1 / 2 }} />
      <Unit size={{ desktop: 1 / 2 }}>
        <h2>Beautiful Editor</h2>
        <p>
          Documents are stored in Markdown and you can export them at any time. Markdown shortcuts are also built right into the editor so you can easily format using markdown syntax or our GUI.
        </p>
      </Unit>

      <Feature size={{ desktop: 1 / 3 }}>
        <h2>Powerful Search</h2>
        <p>
          Built-in search makes that one document easy to find in a large knowledgebase.
        </p>
      </Feature>
      <Feature size={{ desktop: 1 / 3 }}>
        <h2>API & Integrations</h2>
        <p>
          Atlas is built on it’s own API, treat Atlas as a CMS or automatically create documents from outside events.
        </p>
      </Feature>
      <Feature size={{ desktop: 1 / 3 }}>
        <h2>Open Source</h2>
        <p>
          Want to contribute or host Atlas yourself? All of the code is available on GitHub.
        </p>
      </Feature>
    </Grid>
  );
}
