// @flow
import * as React from 'react';
import { Helmet } from 'react-helmet';
import styled from 'styled-components';
import Grid from 'styled-components-grid';
import breakpoint from 'styled-components-breakpoint';
import AuthErrors from './components/AuthErrors';
import Hero from './components/Hero';
import HeroText from './components/HeroText';
import Centered from './components/Centered';
import SigninButtons from './components/SigninButtons';
import SlackLogo from '../../shared/components/SlackLogo';
import GithubLogo from '../../shared/components/GithubLogo';
import Flex from '../../shared/components/Flex';
import { githubUrl, slackAppStoreUrl } from '../../shared/utils/routeHelpers';

type Props = {
  notice?: 'google-hd' | 'auth-error' | 'hd-not-allowed',
  lastSignedIn: string,
  googleSigninEnabled: boolean,
  slackSigninEnabled: boolean,
};

function Home(props: Props) {
  return (
    <span>
      <Helmet>
        <title>Outline - Team wiki & knowledge base</title>
      </Helmet>
      <Grid>
        <Hero id="signin">
          <h1>Your team’s knowledge base</h1>
          <HeroText>
            Team wiki, documentation, meeting notes, playbooks, onboarding, work
            logs, brainstorming, & more…
          </HeroText>
          <p>
            <SigninButtons {...props} />
          </p>
          <AuthErrors notice={props.notice} />
        </Hero>
        <Mask>
          <Features>
            <Centered>
              <Grid reverse={{ mobile: true, tablet: false, desktop: false }}>
                <Grid.Unit size={{ tablet: 1 / 3 }}>
                  <Feature>
                    <h2>Improve Communication</h2>
                    <p>
                      Easily structure your teams information in one central,
                      structured location. No more hunting through folders or
                      scanning pages of search results and chat conversations.
                    </p>
                  </Feature>
                  <Feature>
                    <h2>Safe &amp; Secure</h2>
                    <p>
                      Outline provides a secure place for your teams
                      documentation on our hosted platform, stored in portable
                      Markdown format. Or, you can run your own copy – it’s open
                      source!
                    </p>
                  </Feature>
                </Grid.Unit>
                <Feature size={{ tablet: 2 / 3 }}>
                  <Screenshot
                    srcset="screenshot.png, screenshot@2x.png 2x"
                    src="/screenshot@2x.png"
                    alt="Outline Screenshot"
                  />
                </Feature>
              </Grid>
            </Centered>
          </Features>
        </Mask>
        <Centered id="features">
          <Grid>
            <Feature size={{ desktop: 1 / 3 }}>
              <h2>Blazing Fast</h2>
              <p>
                Outline is fast, really fast. We’ve worked hard to ensure
                millisecond response times – documents load instantly, search is
                speedy and navigating the UI is delightful.
              </p>
            </Feature>
            <Feature size={{ desktop: 1 / 3 }} />
            <Feature size={{ desktop: 1 / 3 }}>
              <h2>Markdown Support</h2>
              <p>
                Documents are stored in plain Markdown making editing, import
                and export painless. Shortcuts are also built right into the
                editor so you can easily format using **markdown syntax** if you
                like.
              </p>
            </Feature>
            <Feature size={{ desktop: 1 / 3 }}>
              <h2>
                <SlackLogo fill="#000" size={30} />&nbsp;Slack &amp; API
              </h2>
              <p>
                Get Slack notifications about changes and search Outline
                directly within Slack using the{' '}
                <code>/outline &lt;keyword&gt;</code> command. Access your
                information programatically through the modern API.
              </p>
              <p>
                <a href={slackAppStoreUrl()}>Slack App</a>
              </p>
            </Feature>
            <Feature size={{ desktop: 1 / 3 }} />
            <Feature size={{ desktop: 1 / 3 }}>
              <h2>
                <GithubLogo fill="#000" size={30} />&nbsp;Open Source
              </h2>
              <p>
                Outline is open source, so the community can help improve it
                too. You get new features, interface improvements, bug fixes,
                and a transparent roadmap for free.
              </p>
              <p>
                <a href={githubUrl()}>GitHub</a>
              </p>
            </Feature>
          </Grid>
        </Centered>
        <Footer>
          <Centered>
            <Grid>
              <Grid.Unit size={{ desktop: 1 / 3 }}>
                <h2>Create an account</h2>
                <p>
                  On the same page as us? Create a free account to give Outline
                  a try with your team.
                </p>
              </Grid.Unit>
              <Grid.Unit size={{ desktop: 2 / 3 }}>
                <Flex justify="center" align="center">
                  <SigninButtons {...props} />
                </Flex>
              </Grid.Unit>
            </Grid>
          </Centered>
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
    margin-top: -120px;
    margin-left: 120px;
    width: 135%;
  `};
`;

const Mask = styled.div`
  width: 100%;
  overflow: hidden;
  padding: 8em 0;
`;

const Features = styled.div`
  background: hsl(180, 58%, 85%);
  padding: 0 2em;
  width: 100%;
`;

const Feature = styled(Grid.Unit)`
  padding: 2em 0;

  p {
    font-weight: 500;
    opacity: 0.8;
  }

  h2 {
    display: flex;
    font-size: 1.8em;
    align-items: center;
    margin-top: 0;
  }

  a {
    color: ${props => props.theme.black};
    text-decoration: underline;
    text-transform: uppercase;
    font-weight: 500;
    font-size: 14px;
  }

  ${breakpoint('tablet')`
    padding: 4em 0;
  `};
`;

const Footer = styled.div`
  background: hsl(127, 58%, 85%);
  text-align: left;
  width: 100%;
  padding: 4em 2em;

  h2 {
    font-size: 1.8em;
    margin-top: 0;
  }

  ${breakpoint('tablet')`
    margin: 2em 0;
    padding: 6em 4em;
  `};
`;

export default Home;
