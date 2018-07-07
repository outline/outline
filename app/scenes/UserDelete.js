// @flow
import * as React from 'react';
import { observable } from 'mobx';
import { inject, observer } from 'mobx-react';
import Button from 'components/Button';
import Flex from 'shared/components/Flex';
import HelpText from 'components/HelpText';
import AuthStore from 'stores/AuthStore';

type Props = {
  auth: AuthStore,
};

@observer
class UserDelete extends React.Component<Props> {
  @observable isDeleting: boolean;

  handleSubmit = async (ev: SyntheticEvent<*>) => {
    ev.preventDefault();
    this.isDeleting = true;
    const success = await this.props.auth.delete();

    if (success) {
      this.props.auth.logout();
    }

    this.isDeleting = false;
  };

  render() {
    return (
      <Flex column>
        <form onSubmit={this.handleSubmit}>
          <HelpText>
            Are you sure? Deleting your account will destory identifying data
            associated with your user and cannot be undone. You will be
            immediately logged out of Outline.
          </HelpText>
          <Button type="submit" danger>
            {this.isDeleting ? 'Deleting…' : 'Delete'}
          </Button>
        </form>
      </Flex>
    );
  }
}

export default inject('auth')(UserDelete);
