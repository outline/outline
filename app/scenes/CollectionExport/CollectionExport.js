// @flow
import * as React from 'react';
import { inject, observer } from 'mobx-react';
import Button from 'components/Button';
import Flex from 'shared/components/Flex';
import HelpText from 'components/HelpText';
import Collection from 'models/Collection';
import AuthStore from 'stores/AuthStore';
import UiStore from 'stores/UiStore';

type Props = {
  collection: Collection,
  auth: AuthStore,
  ui: UiStore,
  onSubmit: () => void,
};

@observer
class CollectionExport extends React.Component<Props> {
  handleSubmit = async (ev: SyntheticEvent<*>) => {
    ev.preventDefault();
    await this.props.collection.export();
    this.props.ui.showToast(
      'Export in progress (check your email)…',
      'success'
    );
    this.props.onSubmit();
  };

  render() {
    const { collection, auth } = this.props;
    if (!auth.user) return;

    return (
      <Flex column>
        <form onSubmit={this.handleSubmit}>
          <HelpText>
            Exporting the collection <strong>{collection.name}</strong> may take
            a few minutes. We’ll put together a zip file of your documents in
            Markdown format and email it to <strong>{auth.user.email}</strong>.
          </HelpText>
          <Button type="submit" primary>
            Export Collection
          </Button>
        </form>
      </Flex>
    );
  }
}

export default inject('ui', 'auth')(CollectionExport);
