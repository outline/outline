// @flow
import * as React from "react";
import { Helmet } from "react-helmet";
import styled from "styled-components";
import Grid from "styled-components-grid";
import AuthNotices from "./components/AuthNotices";
import Hero from "./components/Hero";
import HeroText from "./components/HeroText";
import SigninButtons from "./components/SigninButtons";
import Branding from "../../shared/components/Branding";
import { githubUrl } from "../../shared/utils/routeHelpers";

type Props = {
  provider?: "google" | "slack",
  notice?: "google-hd" | "auth-error" | "hd-not-allowed",
  lastSignedIn: string,
  googleSigninEnabled: boolean,
  slackSigninEnabled: boolean,
};

function Home(props: Props) {
  return (
    <span>
      <Helmet>
        <title>OPEN Digital Wiki</title>
      </Helmet>
      <Grid>
        <Hero id="signin">
          <AuthNotices notice={props.notice} provider={props.provider} />
          <h1>
            {process.env.TEAM_LOGO && <Logo src={process.env.TEAM_LOGO} />}
            <span> </span>
            OPEN Digital Wiki
          </h1>
          <HeroText>
            Collaboratively generated and maintained user documentation of our shared digital tools
          </HeroText>
          <p>
            <SigninButtons {...props} />
          </p>
          <hr/>
          <HeroText>
            <small>
              For information relating to campaigns and tactics please visit <br/>
              <a href={'https://thecampaignslibrary.com/'} target={'_blank'}>The Campaigns Library</a>
            </small>
          </HeroText>
        </Hero>
      </Grid>
    </span>
  );
}

const Logo = styled.img`
  height: 60px;
  border-radius: 4px;
`;

export default Home;
