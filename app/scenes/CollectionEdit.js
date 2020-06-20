// @flow
import * as React from "react";
import { observable } from "mobx";
import { inject, observer } from "mobx-react";
import Input from "components/Input";
import InputRich from "components/InputRich";
import Button from "components/Button";
import Switch from "components/Switch";
import Flex from "shared/components/Flex";
import HelpText from "components/HelpText";
import IconPicker from "components/IconPicker";
import Collection from "models/Collection";
import UiStore from "stores/UiStore";

type Props = {
  collection: Collection,
  ui: UiStore,
  onSubmit: () => void,
};

@observer
class CollectionEdit extends React.Component<Props> {
  @observable name: string;
  @observable description: string = "";
  @observable icon: string = "";
  @observable color: string = "#4E5C6E";
  @observable isSaving: boolean;
  @observable private: boolean = false;

  componentDidMount() {
    this.name = this.props.collection.name;
    this.description = this.props.collection.description;
    this.icon = this.props.collection.icon;
    this.color = this.props.collection.color;
    this.private = this.props.collection.private;
  }

  handleSubmit = async (ev: SyntheticEvent<*>) => {
    ev.preventDefault();
    this.isSaving = true;

    try {
      await this.props.collection.save({
        name: this.name,
        description: this.description,
        icon: this.icon,
        color: this.color,
        private: this.private,
      });
      this.props.onSubmit();
      this.props.ui.showToast("The collection was updated");
    } catch (err) {
      this.props.ui.showToast(err.message);
    } finally {
      this.isSaving = false;
    }
  };

  handleDescriptionChange = getValue => {
    this.description = getValue();
  };

  handleNameChange = (ev: SyntheticInputEvent<*>) => {
    this.name = ev.target.value;
  };

  handleChange = (color: string, icon: string) => {
    this.color = color;
    this.icon = icon;
  };

  handlePrivateChange = (ev: SyntheticInputEvent<*>) => {
    this.private = ev.target.checked;
  };

  render() {
    return (
      <Flex column>
        <form onSubmit={this.handleSubmit}>
          <HelpText>
            You can edit the name and other details at any time, however doing
            so often might confuse your team mates.
          </HelpText>
          <Flex>
            <Input
              type="text"
              label="Name"
              onChange={this.handleNameChange}
              value={this.name}
              required
              autoFocus
              flex
            />
            &nbsp;
            <IconPicker
              onChange={this.handleChange}
              color={this.color}
              icon={this.icon}
            />
          </Flex>
          <InputRich
            id={this.props.collection.id}
            label="Description"
            onChange={this.handleDescriptionChange}
            defaultValue={this.description || ""}
            placeholder="More details about this collection…"
            minHeight={68}
            maxHeight={200}
          />
          <Switch
            id="private"
            label="Private collection"
            onChange={this.handlePrivateChange}
            checked={this.private}
          />
          <HelpText>
            A private collection will only be visible to invited team members.
          </HelpText>
          <Button
            type="submit"
            disabled={this.isSaving || !this.props.collection.name}
          >
            {this.isSaving ? "Saving…" : "Save"}
          </Button>
        </form>
      </Flex>
    );
  }
}

export default inject("ui")(CollectionEdit);
