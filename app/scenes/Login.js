// @flow
import * as React from "react";
import { observer, inject } from "mobx-react";
import { Redirect } from "react-router-dom";
import CenteredContent from "components/CenteredContent";
import Heading from "components/Heading";
import PageTitle from "components/PageTitle";
import Button from "components/Button";
import { signin } from "shared/utils/routeHelpers";

import AuthStore from "stores/AuthStore";

type Props = {
  auth: AuthStore,
};

@observer
class Login extends React.Component<Props> {
  render() {
    const { auth } = this.props;

    if (auth.authenticated) {
      return <Redirect to="/home" />;
    }

    return (
      <CenteredContent column auto>
        <PageTitle title="Login" />
        <Heading>Login to Outline</Heading>
        Last signed in with {auth.lastSignedIn}
        <Button onClick={() => (window.location.href = signin("slack"))}>
          Continue with Slack
        </Button>
        <Button onClick={() => (window.location.href = signin("google"))}>
          Continue with Google
        </Button>
      </CenteredContent>
    );
  }
}

export default inject("auth")(Login);
