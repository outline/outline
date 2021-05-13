// @flow
import { find } from "lodash";
import { observer } from "mobx-react";
import { BackIcon, EmailIcon } from "outline-icons";
import * as React from "react";
import { Redirect, Link, type Location } from "react-router-dom";
import styled from "styled-components";
import { setCookie } from "tiny-cookie";
import ButtonLarge from "components/ButtonLarge";
import Fade from "components/Fade";
import Flex from "components/Flex";
import Heading from "components/Heading";
import HelpText from "components/HelpText";
import OutlineLogo from "components/OutlineLogo";
import PageTitle from "components/PageTitle";
import TeamLogo from "components/TeamLogo";
import Notices from "./Notices";
import Provider from "./Provider";
import env from "env";
import useQuery from "hooks/useQuery";
import useStores from "hooks/useStores";

type Props = {|
  location: Location,
|};

function Login({ location }: Props) {
  const query = useQuery();
  const { auth } = useStores();
  const { config } = auth;
  const [emailLinkSentTo, setEmailLinkSentTo] = React.useState("");
  const isCreate = location.pathname === "/create";

  const handleReset = React.useCallback(() => {
    setEmailLinkSentTo("");
  }, []);

  const handleEmailSuccess = React.useCallback((email) => {
    setEmailLinkSentTo(email);
  }, []);

  React.useEffect(() => {
    auth.fetchConfig();
  }, [auth]);

  React.useEffect(() => {
    const entries = Object.fromEntries(query.entries());

    // We don't want to override this cookie if we're viewing an error notice
    // sent back from the server via query string (notice=), or if there are no
    // query params at all.
    if (Object.keys(entries).length && !query.get("notice")) {
      setCookie("signupQueryParams", JSON.stringify(entries));
    }
  }, [query]);

  if (auth.authenticated) {
    return <Redirect to="/home" />;
  }

  // we're counting on the config request being fast
  if (!config) {
    return null;
  }

  const hasMultipleProviders = config.providers.length > 1;
  const defaultProvider = find(
    config.providers,
    (provider) => provider.id === auth.lastSignedIn && !isCreate
  );

  const header =
    env.DEPLOYMENT === "hosted" &&
    (config.hostname ? (
      <Back href={env.URL}>
        <BackIcon color="currentColor" /> Back to home
      </Back>
    ) : (
      <Back href="https://www.getoutline.com">
        <BackIcon color="currentColor" /> Back to website
      </Back>
    ));

  if (emailLinkSentTo) {
    return (
      <Background>
        {header}
        <Centered align="center" justify="center" column auto>
          <PageTitle title="Check your email" />
          <CheckEmailIcon size={38} color="currentColor" />

          <Heading centered>Check your email</Heading>
          <Note>
            A magic sign-in link has been sent to the email{" "}
            <em>{emailLinkSentTo}</em>, no password needed.
          </Note>
          <br />
          <ButtonLarge onClick={handleReset} fullwidth neutral>
            Back to login
          </ButtonLarge>
        </Centered>
      </Background>
    );
  }

  return (
    <Background>
      {header}
      <Centered align="center" justify="center" column auto>
        <PageTitle title="Login" />
        <Logo>
          {env.TEAM_LOGO && env.DEPLOYMENT !== "hosted" ? (
            <TeamLogo src={env.TEAM_LOGO} />
          ) : (
            <OutlineLogo size={38} fill="currentColor" />
          )}
        </Logo>

        {isCreate ? (
          <>
            <Heading centered>Create an account</Heading>
            <GetStarted>
              Get started by choosing a sign-in method for your new team below…
            </GetStarted>
          </>
        ) : (
          <Heading centered>Login to {config.name || "Outline"}</Heading>
        )}

        <Notices />

        {defaultProvider && (
          <React.Fragment key={defaultProvider.id}>
            <Provider
              isCreate={isCreate}
              onEmailSuccess={handleEmailSuccess}
              {...defaultProvider}
            />
            {hasMultipleProviders && (
              <>
                <Note>
                  You signed in with {defaultProvider.name} last time.
                </Note>
                <Or />
              </>
            )}
          </React.Fragment>
        )}

        {config.providers.map((provider) => {
          if (defaultProvider && provider.id === defaultProvider.id) {
            return null;
          }

          return (
            <Provider
              key={provider.id}
              isCreate={isCreate}
              onEmailSuccess={handleEmailSuccess}
              {...provider}
            />
          );
        })}

        {isCreate && (
          <Note>
            Already have an account? Go to <Link to="/">login</Link>.
          </Note>
        )}
      </Centered>
    </Background>
  );
}

const CheckEmailIcon = styled(EmailIcon)`
  margin-bottom: -1.5em;
`;

const Background = styled(Fade)`
  width: 100vw;
  height: 100vh;
  background: ${(props) => props.theme.background};
  display: flex;
`;

const Logo = styled.div`
  margin-bottom: -1.5em;
  height: 38px;
`;

const GetStarted = styled(HelpText)`
  text-align: center;
  margin-top: -12px;
`;

const Note = styled(HelpText)`
  text-align: center;
  font-size: 14px;

  em {
    font-style: normal;
    font-weight: 500;
  }
`;

const Back = styled.a`
  display: flex;
  align-items: center;
  color: inherit;
  padding: 32px;
  font-weight: 500;
  position: absolute;

  svg {
    transition: transform 100ms ease-in-out;
  }

  &:hover {
    svg {
      transform: translateX(-4px);
    }
  }
`;

const Or = styled.hr`
  margin: 1em 0;
  position: relative;
  width: 100%;

  &:after {
    content: "Or";
    display: block;
    position: absolute;
    left: 50%;
    transform: translate3d(-50%, -50%, 0);
    text-transform: uppercase;
    font-size: 11px;
    color: ${(props) => props.theme.textSecondary};
    background: ${(props) => props.theme.background};
    border-radius: 2px;
    padding: 0 4px;
  }
`;

const Centered = styled(Flex)`
  user-select: none;
  width: 90vw;
  height: 100%;
  max-width: 320px;
  margin: 0 auto;
`;

export default observer(Login);
