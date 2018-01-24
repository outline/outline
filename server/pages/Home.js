// @flow
import React from 'react';
import { Helmet } from 'react-helmet';
import styled from 'styled-components';
import Grid from 'styled-components-grid';
import breakpoint from 'styled-components-breakpoint';
import Hero from './components/Hero';
import SignupButton from './components/SignupButton';
import { developers, githubUrl } from '../../shared/utils/routeHelpers';
import { color } from '../../shared/styles/constants';

function Home() {
  return (
    <span>
      <Helmet>
        <title>Outline - Team wiki & documentation</title>
      </Helmet>
      <Grid>
        <Hero>
          <h1>Your team’s knowledge base</h1>
          <HeroText>
            Team wiki, documentation, meeting notes, playbooks, onboarding, work
            logs, brainstorming, & more…
          </HeroText>
          <p>
            <SignupButton />
          </p>
        </Hero>
        <Features reverse={{ mobile: true, tablet: false, desktop: false }}>
          <Grid.Unit size={{ desktop: 1 / 3, tablet: 1 / 2 }}>
            <Feature>
              <h2>Blazing Fast Wiki</h2>
              <p>
                Outline is fast, really fast. We’ve worked hard to ensure
                millisecond response times, documents load instantly, search is
                speedy and navigating the UI is delightful.
              </p>
            </Feature>
            <Feature>
              <h2># Markdown Support</h2>
              <p>
                Outline stores, imports and exports all documents in plain
                Markdown. Shortcuts are also built right into the editor so you
                can easily format using <strong>**markdown syntax**</strong> if
                you like.
              </p>
            </Feature>
          </Grid.Unit>
          <Feature size={{ desktop: 2 / 3, tablet: 1 / 2 }}>
            <Screenshot
              srcset="screenshot.png, screenshot@2x.png 2x"
              src="/screenshot@2x.png"
              alt="Outline Screenshot"
            />
          </Feature>
        </Features>
        <Highlights id="features">
          <Feature size={{ desktop: 1 / 3 }}>
            <h2>Open Source</h2>
            <p>
              Outline is open source, so the community can help improve it too.
              You get new features, interface improvements, and bug fixes for
              free.
            </p>
            <p>
              <a href={githubUrl()}>GitHub</a>
            </p>
          </Feature>
          <Feature size={{ desktop: 1 / 3 }}>
            <h2>Integrations &amp; API</h2>
            <p>
              All of Outline’s functionality is available through the API. The
              editor itself is built on React and we’re working on making it
              pluggable and extensible.
            </p>
            <p>
              <a href={developers()}>Documentation</a>
            </p>
          </Feature>
          <Feature size={{ desktop: 1 / 3 }}>
            <h2>Powerful Search</h2>
            <p>
              Outline includes a super fast search that’s the best way to find
              what you’re looking for once your knowledge base starts to grow in
              size.
            </p>
            <p>
              Search directly within Slack using{' '}
              <code>/outline &lt;keyword&gt;</code> command.
            </p>
          </Feature>
        </Highlights>
        <Footer>
          <h2>Create an account</h2>
          <p>
            On the same page as us? Create a beta account to give Outline a try.
          </p>
          <FooterCTA>
            <SignupButton />
          </FooterCTA>
        </Footer>
      </Grid>
    </span>
  );
}

const Screenshot = styled.img`
  width: 100%;
  box-shadow: 0 0 80px 0 rgba(124, 124, 124, 0.5),
    0 0 10px 0 rgba(237, 237, 237, 0.5);
  border-radius: 5px;

  ${breakpoint('desktop')`
    width: 150%;
  `};
`;

const Highlights = styled(Grid)`
  background: ${color.yellow};
  margin: 0 1em;
  padding: 0 1em;
`;

const Features = styled(Grid)`
  padding: 0 2em;
  overflow: hidden;

  ${breakpoint('mobile')`
    flex-direction
  `};
`;

const Feature = styled(Grid.Unit)`
  padding: 4em 3em;

  h2 {
    margin-top: 0;
  }

  a {
    color: ${color.black};
    text-decoration: underline;
    text-transform: uppercase;
    font-weight: 500;
    font-size: 14px;
  }
`;

const Footer = styled.div`
  text-align: center;
  width: 100%;
  padding: 6em 4em;
`;

const FooterCTA = styled.p`
  padding-top: 1em;
`;

const HeroText = styled.p`
  font-size: 18px;
  max-width: 600px;
  margin-left: auto;
  margin-right: auto;
  margin-bottom: 2em;
`;

export default Home;
