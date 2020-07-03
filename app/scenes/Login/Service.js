// @flow
import * as React from "react";
import styled from "styled-components";
import { client } from "utils/ApiClient";
import ButtonLarge from "components/ButtonLarge";
import Input from "components/Input";
import Fade from "components/Fade";

type Props = {
  id: string,
  name: string,
  authUrl: string,
  isCreate: boolean,
  onEmailSuccess: (email: string) => void,
};

type State = {
  showEmailSignin: boolean,
  isSubmitting: boolean,
  email: string,
};

class Service extends React.Component<Props, State> {
  state = {
    showEmailSignin: false,
    isSubmitting: false,
    email: "",
  };

  handleChangeEmail = (event: SyntheticInputEvent<HTMLInputElement>) => {
    this.setState({ email: event.target.value });
  };

  handleSubmitEmail = async (event: SyntheticEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (this.state.showEmailSignin && this.state.email) {
      this.setState({ isSubmitting: true });

      try {
        await client.post(event.currentTarget.action, {
          email: this.state.email,
        });
        this.props.onEmailSuccess(this.state.email);
      } finally {
        this.setState({ isSubmitting: false });
      }
    } else {
      this.setState({ showEmailSignin: true });
    }
  };

  render() {
    const { isCreate, id, name, authUrl } = this.props;

    if (id === "email" && !isCreate) {
      return (
        <Wrapper key="email">
          <Form
            method="POST"
            action="/auth/email"
            onSubmit={this.handleSubmitEmail}
          >
            {this.state.showEmailSignin && (
              <Fade>
                <Input
                  type="email"
                  name="email"
                  placeholder="me@domain.com"
                  value={this.state.email}
                  onChange={this.handleChangeEmail}
                  disabled={this.state.isSubmitting}
                  autoFocus
                  required
                />
              </Fade>
            )}
            <ButtonLarge
              type="submit"
              disabled={this.state.isSubmitting}
              fullwidth
            >
              Continue with email
            </ButtonLarge>
          </Form>
        </Wrapper>
      );
    }

    return (
      <Wrapper key={id}>
        <ButtonLarge onClick={() => (window.location.href = authUrl)} fullwidth>
          {isCreate ? "Sign up" : "Continue"} with {name}
        </ButtonLarge>
      </Wrapper>
    );
  }
}

const Wrapper = styled.div`
  margin-bottom: 1em;
  width: 100%;
`;

const Form = styled.form`
  width: 100%;
`;

export default Service;
