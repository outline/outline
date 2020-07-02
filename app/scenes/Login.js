// @flow
import * as React from "react";
import styled from "styled-components";
import { observer, inject } from "mobx-react";
import { Redirect } from "react-router-dom";
import Flex from "shared/components/Flex";
import Heading from "components/Heading";
import PageTitle from "components/PageTitle";
import Button from "components/Button";
import Fade from "components/Fade";
import AuthStore from "stores/AuthStore";

type Props = {
  auth: AuthStore,
  location: Object,
};

@observer
class Login extends React.Component<Props> {
  render() {
    const { auth, location } = this.props;
    const isCreate = location.pathname === "/create";

    if (auth.authenticated) {
      return <Redirect to="/home" />;
    }

    if (!auth.config) {
      // TODO: loading state
      return null;
    }

    return (
      <Fade>
        <Centered align="center" justify="center" column auto>
          <PageTitle title="Login" />
          {/* TODO: LOGO */}
          {/* TODO: Auth notices */}
          <Heading>Login to {auth.config.name || "Outline"}</Heading>

          {/* TODO: Style this */}
          <p>Last signed in with {auth.lastSignedIn}</p>

          {/* TODO: Email login */}
          {auth.config.services.map(service => (
            <React.Fragment key={service.id}>
              <Button onClick={() => (window.location.href = service.authUrl)}>
                {isCreate ? "Sign up" : "Continue"} with {service.name}
              </Button>
            </React.Fragment>
          ))}
        </Centered>
      </Fade>
    );
  }
}

const Centered = styled(Flex)`
  height: 100%;
`;

export default inject("auth")(Login);
