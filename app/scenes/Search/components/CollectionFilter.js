// @flow
import * as React from 'react';
import { observer, inject } from 'mobx-react';
import FilterOptions from './FilterOptions';
import CollectionsStore from 'stores/CollectionsStore';

const defaultOption = {
  key: undefined,
  label: 'Any collection',
};

type Props = {
  collections: CollectionsStore,
  collectionId: ?string,
  onSelect: (key: ?string) => void,
};

@observer
class CollectionFilter extends React.Component<Props> {
  render() {
    const { onSelect, collectionId, collections } = this.props;
    const collectionOptions = collections.orderedData.map(user => ({
      key: user.id,
      label: user.name,
    }));

    return (
      <FilterOptions
        options={[defaultOption, ...collectionOptions]}
        activeKey={collectionId}
        onSelect={onSelect}
        defaultLabel="Any collection"
        selectedPrefix="Collection:"
      />
    );
  }
}

export default inject('collections')(CollectionFilter);
