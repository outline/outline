// @flow
import { observable } from "mobx";
import { inject, observer } from "mobx-react";
import * as React from "react";
import AuthStore from "stores/AuthStore";
import UiStore from "stores/UiStore";
import Button from "components/Button";
import Flex from "components/Flex";
import HelpText from "components/HelpText";
import Modal from "components/Modal";

type Props = {
  auth: AuthStore,
  ui: UiStore,
  onRequestClose: () => void,
};

@observer
class UserDelete extends React.Component<Props> {
  @observable isDeleting: boolean;

  handleSubmit = async (ev: SyntheticEvent<>) => {
    ev.preventDefault();
    this.isDeleting = true;

    try {
      await this.props.auth.deleteUser();
      this.props.auth.logout();
    } catch (error) {
      this.props.ui.showToast(error.message);
    } finally {
      this.isDeleting = false;
    }
  };

  render() {
    const { auth, ...rest } = this.props;

    return (
      <Modal isOpen title="Delete Account" {...rest}>
        <Flex column>
          <form onSubmit={this.handleSubmit}>
            <HelpText>
              Are you sure? Deleting your account will destroy identifying data
              associated with your user and cannot be undone. You will be
              immediately logged out of Outline and all your API tokens will be
              revoked.
            </HelpText>
            <HelpText>
              <strong>Note:</strong> Signing back in will cause a new account to
              be automatically reprovisioned.
            </HelpText>
            <Button type="submit" danger>
              {this.isDeleting ? "Deleting…" : "Delete My Account"}
            </Button>
          </form>
        </Flex>
      </Modal>
    );
  }
}

export default inject("auth", "ui")(UserDelete);
