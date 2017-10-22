// @flow
import React from 'react';
import styled from 'styled-components';
import Grid from 'styled-components-grid';

const Unit = Grid.Unit;

const Header = styled.div`
  width: 100%;
  padding: 3em;
  text-align: center;
`;

export default function Home() {
  return (
    <Grid>
      <Header>
        <h1>Your team’s knowledge base</h1>
        <p>
          Documentation, meeting notes, playbooks, onboarding, work logs, brainstorming, decisions, & more…
        </p>
        <a href="">Sign In</a>
      </Header>
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
    </Grid>
  );
}
