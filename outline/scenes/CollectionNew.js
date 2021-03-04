// @flow
import { intersection } from "lodash";
import { observable } from "mobx";
import { inject, observer } from "mobx-react";
import * as React from "react";
import { withTranslation, type TFunction, Trans } from "react-i18next";
import { withRouter, type RouterHistory } from "react-router-dom";
import AuthStore from "stores/AuthStore";
import CollectionsStore from "stores/CollectionsStore";
import UiStore from "stores/UiStore";
import Collection from "models/Collection";
import Button from "components/Button";
import Flex from "components/Flex";
import HelpText from "components/HelpText";
import IconPicker, { icons } from "components/IconPicker";
import Input from "components/Input";
import Switch from "components/Switch";

type Props = {
  history: RouterHistory,
  auth: AuthStore,
  ui: UiStore,
  collections: CollectionsStore,
  onSubmit: () => void,
  t: TFunction,
};

@observer
class CollectionNew extends React.Component<Props> {
  @observable name: string = "";
  @observable icon: string = "";
  @observable color: string = "#4E5C6E";
  @observable sharing: boolean = true;
  @observable private: boolean = false;
  @observable isSaving: boolean;
  hasOpenedIconPicker: boolean = false;

  handleSubmit = async (ev: SyntheticEvent<>) => {
    ev.preventDefault();
    this.isSaving = true;
    const collection = new Collection(
      {
        name: this.name,
        sharing: this.sharing,
        icon: this.icon,
        color: this.color,
        private: this.private,
      },
      this.props.collections
    );

    try {
      await collection.save();
      this.props.onSubmit();
      this.props.history.push(collection.url);
    } catch (err) {
      this.props.ui.showToast(err.message, { type: "error" });
    } finally {
      this.isSaving = false;
    }
  };

  handleNameChange = (ev: SyntheticInputEvent<HTMLInputElement>) => {
    this.name = ev.target.value;

    // If the user hasn't picked an icon yet, go ahead and suggest one based on
    // the name of the collection. It's the little things sometimes.
    if (!this.hasOpenedIconPicker) {
      const keys = Object.keys(icons);
      for (const key of keys) {
        const icon = icons[key];
        const keywords = icon.keywords.split(" ");
        const namewords = this.name.toLowerCase().split(" ");
        const matches = intersection(namewords, keywords);

        if (matches.length > 0) {
          this.icon = key;
          return;
        }
      }

      this.icon = "collection";
    }
  };

  handleIconPickerOpen = () => {
    this.hasOpenedIconPicker = true;
  };

  handlePrivateChange = (ev: SyntheticInputEvent<HTMLInputElement>) => {
    this.private = ev.target.checked;
  };

  handleSharingChange = (ev: SyntheticInputEvent<HTMLInputElement>) => {
    this.sharing = ev.target.checked;
  };

  handleChange = (color: string, icon: string) => {
    this.color = color;
    this.icon = icon;
  };

  render() {
    const { t, auth } = this.props;
    const teamSharingEnabled = !!auth.team && auth.team.sharing;

    return (
      <form onSubmit={this.handleSubmit}>
        <HelpText>
          <Trans>
            Collections are for grouping your documents. They work best when
            organized around a topic or internal team — Product or Engineering
            for example.
          </Trans>
        </HelpText>
        <Flex>
          <Input
            type="text"
            label={t("Name")}
            onChange={this.handleNameChange}
            value={this.name}
            required
            autoFocus
            flex
          />
          &nbsp;
          <IconPicker
            onOpen={this.handleIconPickerOpen}
            onChange={this.handleChange}
            color={this.color}
            icon={this.icon}
          />
        </Flex>
        <Switch
          id="private"
          label={t("Private collection")}
          onChange={this.handlePrivateChange}
          checked={this.private}
        />
        <HelpText>
          <Trans>
            A private collection will only be visible to invited team members.
          </Trans>
        </HelpText>
        {teamSharingEnabled && (
          <>
            <Switch
              id="sharing"
              label={t("Public document sharing")}
              onChange={this.handleSharingChange}
              checked={this.sharing}
            />
            <HelpText>
              <Trans>
                When enabled, documents can be shared publicly on the internet.
              </Trans>
            </HelpText>
          </>
        )}

        <Button type="submit" disabled={this.isSaving || !this.name}>
          {this.isSaving ? `${t("Creating")}…` : t("Create")}
        </Button>
      </form>
    );
  }
}

export default withTranslation()<CollectionNew>(
  inject("collections", "ui", "auth")(withRouter(CollectionNew))
);
