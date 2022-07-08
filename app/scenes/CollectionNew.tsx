import { intersection } from "lodash";
import { observable } from "mobx";
import { observer } from "mobx-react";
import * as React from "react";
import { withTranslation, Trans, WithTranslation } from "react-i18next";
import { MAX_TITLE_LENGTH } from "@shared/constants";
import RootStore from "~/stores/RootStore";
import Collection from "~/models/Collection";
import Button from "~/components/Button";
import Flex from "~/components/Flex";
import IconPicker, { icons } from "~/components/IconPicker";
import Input from "~/components/Input";
import InputSelectPermission from "~/components/InputSelectPermission";
import Switch from "~/components/Switch";
import Text from "~/components/Text";
import withStores from "~/components/withStores";
import history from "~/utils/history";

type Props = RootStore &
  WithTranslation & {
    onSubmit: () => void;
  };

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
      await collection.save();
      this.props.onSubmit();
      history.push(collection.url);
    } catch (err) {
      this.props.toasts.showToast(err.message, {
        type: "error",
      });
    } finally {
      this.isSaving = false;
    }
  };

  handleNameChange = (ev: React.ChangeEvent<HTMLInputElement>) => {
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

  handleSharingChange = (ev: React.ChangeEvent<HTMLInputElement>) => {
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
        <Text type="secondary">
          <Trans>
            Collections are for grouping your documents. They work best when
            organized around a topic or internal team — Product or Engineering
            for example.
          </Trans>
        </Text>
        <Flex gap={8}>
          <Input
            type="text"
            label={t("Name")}
            onChange={this.handleNameChange}
            maxLength={MAX_TITLE_LENGTH}
            value={this.name}
            required
            autoFocus
            flex
          />
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
          note={t(
            "This is the default level of access, you can give individual users or groups more access once the collection is created."
          )}
        />
        {teamSharingEnabled && (
          <Switch
            id="sharing"
            label={t("Public document sharing")}
            onChange={this.handleSharingChange}
            checked={this.sharing}
            note={t(
              "When enabled any documents within this collection can be shared publicly on the internet."
            )}
          />
        )}

        <Button type="submit" disabled={this.isSaving || !this.name}>
          {this.isSaving ? `${t("Creating")}…` : t("Create")}
        </Button>
      </form>
    );
  }
}

export default withTranslation()(withStores(CollectionNew));
