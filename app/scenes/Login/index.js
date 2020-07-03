// @flow
import * as React from "react";
import styled from "styled-components";
import { BackIcon } from "outline-icons";
import { observer, inject } from "mobx-react";
import { Redirect } from "react-router-dom";
import { find } from "lodash";
import Flex from "shared/components/Flex";
import TeamLogo from "shared/components/TeamLogo";
import OutlineLogo from "shared/components/OutlineLogo";
import Heading from "components/Heading";
import PageTitle from "components/PageTitle";
import ButtonLarge from "components/ButtonLarge";
import HelpText from "components/HelpText";
import Fade from "components/Fade";
import Service from "./Service";
import AuthStore from "stores/AuthStore";

type Props = {
  auth: AuthStore,
  location: Object,
};

type State = {
  signinLinkSent: string,
};

@observer
class Login extends React.Component<Props, State> {
  state = {
    signinLinkSent: "",
  };

  handleReset = () => {
    this.setState({ signinLinkSent: "" });
  };

  handleEmailSuccess = email => {
    this.setState({ signinLinkSent: email });
  };

  render() {
    const { auth, location } = this.props;
    const { config } = auth;
    const isCreate = location.pathname === "/create";

    if (auth.authenticated) {
      return <Redirect to="/home" />;
    }

    if (!config) {
      // TODO: loading state
      return null;
    }

    const hasMultipleServices = config.services.length > 1;
    const defaultService = find(
      config.services,
      service => service.id === auth.lastSignedIn
    );

    const logo = process.env.TEAM_LOGO ? (
      <TeamLogo src={process.env.TEAM_LOGO} />
    ) : (
      <OutlineLogo size={38} />
    );

    const header =
      process.env.DEPLOYMENT === "hosted" &&
      (config.hostname ? (
        <Back href={process.env.URL}>
          <BackIcon color="currentColor" /> Back to home
        </Back>
      ) : (
        <Back href="https://www.getoutline.com">
          <BackIcon color="currentColor" /> Back to website
        </Back>
      ));

    if (this.state.signinLinkSent) {
      return (
        <Fade>
          {header}
          <Centered align="center" justify="center" column auto>
            <PageTitle title="Check your email" />
            {logo}

            <Heading>Check your email</Heading>
            <Note>
              A magic sign-in link has been sent to the email{" "}
              <em>{this.state.signinLinkSent}</em>, no password needed.
            </Note>
            <br />
            <ButtonLarge onClick={this.handleReset} fullwidth neutral>
              Back to login
            </ButtonLarge>
          </Centered>
        </Fade>
      );
    }

    return (
      <Fade>
        {header}
        <Centered align="center" justify="center" column auto>
          <PageTitle title="Login" />
          {logo}

          {/* TODO: Auth notices */}
          <Heading>Login to {config.name || "Outline"}</Heading>

          {defaultService && (
            <React.Fragment key={defaultService.id}>
              <Service
                isCreate={isCreate}
                onEmailSuccess={this.handleEmailSuccess}
                {...defaultService}
              />
              {hasMultipleServices && (
                <React.Fragment>
                  <Note>
                    You signed in with {defaultService.name} last time.
                  </Note>
                  <Or />
                </React.Fragment>
              )}
            </React.Fragment>
          )}

          {/* TODO: Email login */}
          {config.services.map(service => {
            if (service.id === auth.lastSignedIn) {
              return null;
            }

            return (
              <Service
                key={service.id}
                isCreate={isCreate}
                onEmailSuccess={this.handleEmailSuccess}
                {...service}
              />
            );
          })}
        </Centered>
      </Fade>
    );
  }
}

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
    font-size: 12px;
    color: ${props => props.theme.textSecondary};
    background: ${props => props.theme.background};
    border-radius: 2px;
    padding: 0 4px;
  }
`;

const Centered = styled(Flex)`
  width: 90vw;
  height: 100%;
  max-width: 300px;
  margin: 0 auto;
`;

export default inject("auth")(Login);
