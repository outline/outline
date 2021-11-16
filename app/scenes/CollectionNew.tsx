import { intersection } from "lodash";
import { observable } from "mobx";
import { inject, observer } from "mobx-react";
import * as React from "react";
import { withTranslation, Trans, WithTranslation } from "react-i18next";
import { RouteComponentProps, withRouter } from "react-router-dom";
import AuthStore from "stores/AuthStore";
import CollectionsStore from "stores/CollectionsStore";
import ToastsStore from "stores/ToastsStore";
import Collection from "models/Collection";
import Button from "components/Button";
import Flex from "components/Flex";
import HelpText from "components/HelpText";
import IconPicker, { icons } from "components/IconPicker";
import Input from "components/Input";
import InputSelectPermission from "components/InputSelectPermission";
import Switch from "components/Switch";
import withStores from "components/withStores";

type StoreProps = {
  auth: AuthStore;
  toasts: ToastsStore;
  collections: CollectionsStore;
};

interface Props extends StoreProps, WithTranslation, RouteComponentProps {
  onSubmit: () => void;
}

@observer
class CollectionNew extends React.Component<Props> {
  @observable
  name = "";

  @observable
  icon = "";

  @observable
  color = "#4E5C6E";

  @observable
  sharing = true;

  @observable
  permission = "read_write";

  @observable
  isSaving: boolean;

  hasOpenedIconPicker = false;

  handleSubmit = async (ev: React.SyntheticEvent) => {
    ev.preventDefault();
    this.isSaving = true;
    const collection = new Collection(
      {
        name: this.name,
        sharing: this.sharing,
        icon: this.icon,
        color: this.color,
        permission: this.permission,
      },
      this.props.collections
    );

    try {
      // @ts-expect-error ts-migrate(2554) FIXME: Expected 1 arguments, but got 0.
      await collection.save();
      this.props.onSubmit();
      this.props.history.push(collection.url);
    } catch (err) {
      this.props.toasts.showToast(err.message, {
        type: "error",
      });
    } finally {
      this.isSaving = false;
    }
  };

  handleNameChange = (ev: React.SyntheticEvent) => {
    // @ts-expect-error ts-migrate(2339) FIXME: Property 'value' does not exist on type 'EventTarg... Remove this comment to see the full error message
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

  handlePermissionChange = (newPermission: string) => {
    this.permission = newPermission;
  };

  handleSharingChange = (ev: React.SyntheticEvent<HTMLInputElement>) => {
    // @ts-expect-error ts-migrate(2339) FIXME: Property 'checked' does not exist on type 'EventTa... Remove this comment to see the full error message
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
        <InputSelectPermission
          value={this.permission}
          onChange={this.handlePermissionChange}
          short
        />
        <HelpText>
          <Trans>
            This is the default level of access given to team members, you can
            give specific users or groups more access once the collection is
            created.
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

export default withStores(withTranslation()(withRouter(CollectionNew)));
