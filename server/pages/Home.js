// @flow
import * as React from 'react';
import { Helmet } from 'react-helmet';
import styled from 'styled-components';
import Grid from 'styled-components-grid';
import breakpoint from 'styled-components-breakpoint';
import Notice from '../../shared/components/Notice';
import Hero from './components/Hero';
import SigninButtons from './components/SigninButtons';
import { developers, githubUrl } from '../../shared/utils/routeHelpers';

type Props = {
  notice?: 'google-hd' | 'auth-error',
  lastSignedIn: string,
  googleSigninEnabled: boolean,
  slackSigninEnabled: boolean,
};

function Home(props: Props) {
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
            <SigninButtons {...props} />
          </p>
          {props.notice === 'google-hd' && (
            <Notice>
              Sorry, Google sign in cannot be used with a personal email. Please
              try signing in with your company Google account.
            </Notice>
          )}
          {props.notice === 'auth-error' && (
            <Notice>
              Authentication failed - we were unable to sign you in at this
              time. Please try again.
            </Notice>
          )}
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
            <h2>Slack integration</h2>
            <p>
              Keep your team up to date and informed with Slack notifications
              about newly published documents. You can also search Outline
              directly within Slack using <code>/outline &lt;keyword&gt;</code>{' '}
              command.
            </p>
          </Feature>
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
              All of Outline’s functionality is available through the API.
              Migrating Markdown documents or setting up automations is a breeze
              with a few lines of code.
            </p>
            <p>
              <a href={developers()}>Documentation</a>
            </p>
          </Feature>
        </Highlights>
        <Footer>
          <h2>Create an account</h2>
          <p>
            On the same page as us? Create a free account to give Outline a try.
          </p>
          <FooterCTA>
            <SigninButtons {...props} />
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
  background: ${props => props.theme.yellow};
  margin: 0 1em;
  padding: 0 1em;
`;

const Features = styled(Grid)`
  padding: 0 2em;
  overflow: hidden;
`;

const Feature = styled(Grid.Unit)`
  padding: 4em 3em;

  h2 {
    margin-top: 0;
  }

  a {
    color: ${props => props.theme.black};
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
