// @flow
import * as React from 'react';
import { observable } from 'mobx';
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
  @observable isLoading: boolean = false;

  handleSubmit = async (ev: SyntheticEvent<>) => {
    ev.preventDefault();

    this.isLoading = true;
    await this.props.collection.export();
    this.isLoading = false;
    this.props.onSubmit();
  };

  render() {
    const { collection, auth } = this.props;
    if (!auth.user) return null;

    return (
      <Flex column>
        <form onSubmit={this.handleSubmit}>
          <HelpText>
            Exporting the collection <strong>{collection.name}</strong> may take
            a few seconds. Your documents will be downloaded as a zip of folders
            with files in Markdown format.
          </HelpText>
          <Button type="submit" disabled={this.isLoading} primary>
            {this.isLoading ? 'Exporting…' : 'Export Collection'}
          </Button>
        </form>
      </Flex>
    );
  }
}

export default inject('ui', 'auth')(CollectionExport);
