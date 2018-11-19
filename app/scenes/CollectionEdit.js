// @flow
import * as React from 'react';
import { withRouter } from 'react-router-dom';
import { observable } from 'mobx';
import { inject, observer } from 'mobx-react';
import Input from 'components/Input';
import InputRich from 'components/InputRich';
import Button from 'components/Button';
import Flex from 'shared/components/Flex';
import HelpText from 'components/HelpText';
import ColorPicker from 'components/ColorPicker';
import Collection from 'models/Collection';

type Props = {
  history: Object,
  collection: Collection,
  onSubmit: () => void,
};

@observer
class CollectionEdit extends React.Component<Props> {
  @observable name: string;
  @observable description: string = '';
  @observable color: string = '';
  @observable isSaving: boolean;

  componentWillMount() {
    this.name = this.props.collection.name;
    this.description = this.props.collection.description;
  }

  handleSubmit = async (ev: SyntheticEvent<*>) => {
    ev.preventDefault();
    this.isSaving = true;

    this.props.collection.updateData({
      name: this.name,
      description: this.description,
      color: this.color,
    });
    const success = await this.props.collection.save();

    if (success) {
      this.props.onSubmit();
    }

    this.isSaving = false;
  };

  handleDescriptionChange = getValue => {
    this.description = getValue();
  };

  handleNameChange = (ev: SyntheticInputEvent<*>) => {
    this.name = ev.target.value;
  };

  handleColor = (color: string) => {
    this.color = color;
  };

  render() {
    return (
      <Flex column>
        <form onSubmit={this.handleSubmit}>
          <HelpText>
            You can edit a collection’s details at any time, however doing so
            often might confuse your team mates.
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
          <ColorPicker
            onSelect={this.handleColor}
            value={this.props.collection.color}
          />
          <Button
            type="submit"
            disabled={this.isSaving || !this.props.collection.name}
          >
            {this.isSaving ? 'Saving…' : 'Save'}
          </Button>
        </form>
      </Flex>
    );
  }
}

export default inject('collections')(withRouter(CollectionEdit));
