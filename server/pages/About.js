// @flow
import React from 'react';
import Grid from 'styled-components-grid';
import styled from 'styled-components';
import { Helmet } from 'react-helmet';
import Flex from '../../shared/components/Flex';
import Header from './components/Header';
import Content from './components/Content';

const Authors = styled(Flex).attrs({
  justify: 'center',
})`
  margin: 40px 0;
`;

const Author = styled(Flex).attrs({
  column: true,
  align: 'center',
})`
  margin-right: 60px;

  &:last-child {
    margin-right: 0;
  }
`;

const Avatar = styled.img`
  width: 60px;
  height: 60px;
  margin-bottom: 20px;

  border-radius: 50%;
`;

export default function About() {
  return (
    <Grid>
      <Helmet>
        <title>About Us</title>
      </Helmet>
      <Header>
        <h1>About Us</h1>
        <p>Who builds this anyway?</p>
      </Header>
      <Content>
        <p>
          Outline is a wiki and knowledge base built for growing teams. We’re
          focused on speed, usability and extensibility.
        </p>
        <p>
          The open source project is maintained by Jori Lallo and Tom Moor.
          Having both run venture-backed software startups previously and seeing
          many similar VC-funded products try and fail while the market need
          remained we decided to try a different approach. So don’t worry,
          Outline is here to last.
        </p>
        <p>
          <i>
            Outline is currently in public beta. The hosted service will stay
            free during this period. After that we will offer Outline free for
            teams up to 5 people and have reasonable plans for larger teams.
          </i>
        </p>
        <Authors>
          <Author column>
            <Avatar src="/jori.jpg" />
            <div>
              <strong>Jori Lallo</strong>
            </div>
            <div>
              <a href="https://twitter.com/jorilallo" target="_blank">
                @jorilallo
              </a>
            </div>
          </Author>

          <Author column>
            <Avatar src="/tom.jpg" />
            <div>
              <strong>Tom Moor</strong>
            </div>
            <div>
              <a href="https://twitter.com/tommoor" target="_blank">
                @tommoor
              </a>
            </div>
          </Author>
        </Authors>

        <h2>Open Source</h2>
        <p>
          Outline is built by a group of core{' '}
          <a
            href="https://github.com/outline/outline/graphs/contributors"
            target="_blank"
          >
            maintainers
          </a>, we believe in being honest and transparent.
        </p>
        <ul>
          <li>
            <strong>Accountability.</strong> Being open source helps to keep
            ourselves accountable for progress, code quality, communication, and
            roadmap.
          </li>
          <li>
            <strong>Community.</strong> We hope that over time we can build up a
            community of like-minded folks that can contribute plugins,
            integrations, and core fixes to the project that will benefit
            everyone.
          </li>
          <li>
            <strong>Marketing.</strong> Every product needs a wedge into the
            market. Being open source offers many opportunities to market the
            project with a limited budget.
          </li>
          <li>
            <strong>Security.</strong> We take privacy of your data extremely
            seriously. Getting more eyes on the code makes us more confident
            that Outline is as secure as possible.
          </li>
        </ul>
        <p>
          You can view Outline’s source code on{' '}
          <a href="https://github.com/outline/outline">GitHub</a>.
        </p>
        <h2>FAQ</h2>
        <p>
          <h3>Why would I pay you if I can run Outline myself?</h3>
          You don’t have to but you might have better things to do with your
          time. When you sign up for Outline, you’ll always be running the
          latest version, have all the features and we’ll answer the questions
          your team might have. You’ll also help to keep Outline getting better
          by supporting us financially.
        </p>
        <p>
          <h3>Can I use Google/GitHub/etc to signup for Outline?</h3>
          We started with Slack as many teams are already using it and benefit
          from the integrations. We’ll be adding more login methods soon. Please
          let us know which one you would like to see next{' '}
          <a
            href="https://spectrum.chat/outline/feature-requests?thread=a851c20d-251a-4c7b-8977-e1438894db51"
            target="_blank"
          >
            here
          </a>.
        </p>
        <p>
          <h3>How can I export my data if you go away?</h3>
          We’re committed on making your data portable. We’ll soon add better
          import and export options so you which will let you take your data and
          view it in HTML form or upload to self-hosted Outline. Until then, you
          can do this through our <a href="/developers">API</a>.
        </p>
        <p>
          <h3>How can I get in touch with you?</h3>
          You can drop us a note on our{' '}
          <a href="https://spectrum.chat/outline">Spectrum</a> community or
          email us at{' '}
          <a href="mailto:hello@getoutline.com">hello@getoutline.com</a>.
        </p>
      </Content>
    </Grid>
  );
}
