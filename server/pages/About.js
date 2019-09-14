// @flow
import * as React from 'react';
import styled from 'styled-components';
import Grid from 'styled-components-grid';
import PageTitle from './components/PageTitle';
import Header from './components/Header';
import Content from './components/Content';

const List = styled('ul')`
  padding-left: 1em;
`;

export default function About() {
  return (
    <Grid>
      <PageTitle title="About" />

      <Header background="#F4F7FA">
        <h1>About</h1>
        <p>The ideas behind Outline</p>
      </Header>
      <Content>
        <p>
          Outline is a wiki and knowledge base built for growing teams. We’re
          focused on speed, usability and extensibility.
        </p>
        <p>
          The project consists of an{' '}
          <a
            href="https://github.com/outline/outline"
            target="_blank"
            rel="noopener noreferrer"
          >
            Open Source core
          </a>{' '}
          which can be hosted on your own infrastructure and a paid, hosted,
          service (you’re looking at it!) that provides income for continued
          feature development and maintenance.
        </p>

        <Grid>
          <Grid.Unit size={{ tablet: 3 / 7 }}>
            <h2>Open Source</h2>
            <p>
              Most software products today are built to be closed source, so why
              make the code public? We believe there are many advantages to
              doing so:
            </p>
            <List>
              <li>
                <strong>Accountability.</strong> Being open source helps to keep
                the team accountable for progress, code quality, communication,
                and roadmap.
              </li>
              <li>
                <strong>Community.</strong> We’re building a community of
                like-minded people that can contribute plugins, integrations,
                and fixes to the project that will benefit everyone.
              </li>
              <li>
                <strong>Marketing.</strong> Every product needs a wedge into the
                market. Being open source offers many opportunities to spread
                the project.
              </li>
              <li>
                <strong>Security.</strong> We take privacy of your data
                extremely seriously. Getting more eyes on the code makes us more
                confident that Outline is as secure as possible.
              </li>
              <li>
                <strong>Peace of Mind.</strong> A lot of software products are
                shut down and disappear, in the worst case scenario you’ll
                always be able to run your own copy of Outline.
              </li>
            </List>
          </Grid.Unit>
          <Grid.Unit size={{ tablet: 1 / 7 }} />
          <Grid.Unit size={{ tablet: 3 / 7 }}>
            <h2>FAQ</h2>
            <p>
              <h3>Why would I pay you if I can run Outline myself?</h3>
              You don’t have to but you might have better things to do with your
              time. When you sign up for Outline, you’ll always be running the
              latest version, have all the features and we’ll answer the
              questions your team might have. You’ll also help to keep Outline
              getting better by supporting us financially.
            </p>
            <p>
              <h3>Can I use X to signin to Outline?</h3>
              We started with Slack and Google as many teams are already using
              these services for team identity. We’ll consider adding more login
              methods soon. Please let us know which one you would like to see
              next{' '}
              <a
                href="https://spectrum.chat/outline/feature-requests?thread=a851c20d-251a-4c7b-8977-e1438894db51"
                target="_blank"
                rel="noopener noreferrer"
              >
                here
              </a>.
            </p>
            <p>
              <h3>How can I export my data if you go away?</h3>
              Outline includes the ability to export individual documents,
              collections or your entire knowledge base to markdown with a
              single click so you’re never locked in. We also have an extensive{' '}
              <a href="/developers">API</a> that can be used for accessing
              documents programatically.
            </p>
            <p>
              <h3>How can I get in touch with you?</h3>
              You can drop us a note on our{' '}
              <a href="https://spectrum.chat/outline">Spectrum</a> community or
              email us at{' '}
              <a href="mailto:hello@getoutline.com">hello@getoutline.com</a>.
            </p>
          </Grid.Unit>
        </Grid>
      </Content>
    </Grid>
  );
}
