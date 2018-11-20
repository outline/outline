// @flow
import * as React from 'react';
import { withRouter } from 'react-router-dom';
import { observable } from 'mobx';
import { inject, observer } from 'mobx-react';
import Button from 'components/Button';
import Input from 'components/Input';
import InputRich from 'components/InputRich';
import ColorPicker from 'components/ColorPicker';
import HelpText from 'components/HelpText';

import Collection from 'models/Collection';
import CollectionsStore from 'stores/CollectionsStore';

type Props = {
  history: Object,
  collections: CollectionsStore,
  onSubmit: () => void,
};

@observer
class CollectionNew extends React.Component<Props> {
  @observable collection: Collection;
  @observable name: string = '';
  @observable description: string = '';
  @observable color: string = '';
  @observable isSaving: boolean;

  constructor(props: Props) {
    super(props);
    this.collection = new Collection();
  }

  handleSubmit = async (ev: SyntheticEvent<*>) => {
    ev.preventDefault();
    this.isSaving = true;
    this.collection.updateData({
      name: this.name,
      description: this.description,
      color: this.color,
    });
    const success = await this.collection.save();

    if (success) {
      this.props.collections.add(this.collection);
      this.props.onSubmit();
      this.props.history.push(this.collection.url);
    }

    this.isSaving = false;
  };

  handleNameChange = (ev: SyntheticInputEvent<*>) => {
    this.name = ev.target.value;
  };

  handleDescriptionChange = getValue => {
    this.description = getValue();
  };

  handleColor = (color: string) => {
    this.color = color;
  };

  render() {
    return (
      <form onSubmit={this.handleSubmit}>
        <HelpText>
          Collections are for grouping your knowledge base. They work best when
          organized around a topic or internal team — Product or Engineering for
          example.
        </HelpText>
        <Input
          type="text"
          label="Name"
          onChange={this.handleNameChange}
          value={this.name}
          required
          autoFocus
        />
        <InputRich
          label="Description"
          onChange={this.handleDescriptionChange}
          defaultValue={this.description || ''}
          placeholder="More details about this collection…"
          minHeight={68}
          maxHeight={200}
        />
        <ColorPicker onSelect={this.handleColor} />
        <Button type="submit" disabled={this.isSaving || !this.name}>
          {this.isSaving ? 'Creating…' : 'Create'}
        </Button>
      </form>
    );
  }
}

export default inject('collections')(withRouter(CollectionNew));
