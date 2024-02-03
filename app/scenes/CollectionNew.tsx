import { observable } from "mobx";
import { observer } from "mobx-react";
import * as React from "react";
import { withTranslation, Trans, WithTranslation } from "react-i18next";
import { toast } from "sonner";
import styled from "styled-components";
import { randomElement } from "@shared/random";
import { CollectionPermission } from "@shared/types";
import { colorPalette } from "@shared/utils/collections";
import { CollectionValidation } from "@shared/validations";
import RootStore from "~/stores/RootStore";
import Collection from "~/models/Collection";
import Button from "~/components/Button";
import Flex from "~/components/Flex";
import IconPicker from "~/components/IconPicker";
import { IconLibrary } from "~/components/Icons/IconLibrary";
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
  nameInputRef = React.createRef<HTMLInputElement>();

  @observable
  name = "";

  @observable
  icon = "";

  @observable
  color = randomElement(colorPalette);

  @observable
  sharing = true;

  @observable
  permission: CollectionPermission;

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
        documents: [],
      },
      this.props.collections
    );

    try {
      await collection.save();
      this.props.onSubmit();
      history.push(collection.path);
    } catch (err) {
      toast.error(err.message);
    } finally {
      this.isSaving = false;
    }
  };

  handleNameChange = (ev: React.ChangeEvent<HTMLInputElement>) => {
    this.name = ev.target.value;

    // If the user hasn't picked an icon yet, go ahead and suggest one based on
    // the name of the collection. It's the little things sometimes.
    if (!this.hasOpenedIconPicker) {
      this.icon = IconLibrary.findIconByKeyword(this.name) ?? "collection";
    }
  };

  handleIconPickerOpen = () => {
    this.hasOpenedIconPicker = true;
  };

  handlePermissionChange = (permission: CollectionPermission) => {
    this.permission = permission;
  };

  handleSharingChange = (ev: React.ChangeEvent<HTMLInputElement>) => {
    this.sharing = ev.target.checked;
  };

  handleChange = (color: string, icon: string) => {
    if (icon !== this.icon) {
      this.nameInputRef.current?.focus();
    }

    this.color = color;
    this.icon = icon;
  };

  render() {
    const { t, auth } = this.props;
    const teamSharingEnabled = !!auth.team && auth.team.sharing;

    return (
      <form onSubmit={this.handleSubmit}>
        <Text as="p">
          <Trans>
            Collections are used to group documents and choose permissions
          </Trans>
          .
        </Text>
        <Flex gap={8}>
          <Input
            type="text"
            ref={this.nameInputRef}
            placeholder={t("Name")}
            onChange={this.handleNameChange}
            maxLength={CollectionValidation.maxNameLength}
            value={this.name}
            prefix={
              <StyledIconPicker
                onOpen={this.handleIconPickerOpen}
                onChange={this.handleChange}
                initial={this.name[0]}
                color={this.color}
                icon={this.icon}
              />
            }
            required
            autoFocus
            flex
          />
        </Flex>
        <InputSelectPermission
          value={this.permission}
          label={t("Permission")}
          onChange={this.handlePermissionChange}
          note={t(
            "The default access for workspace members, you can share with more users or groups later."
          )}
        />
        {teamSharingEnabled && (
          <Switch
            id="sharing"
            label={t("Public document sharing")}
            onChange={this.handleSharingChange}
            checked={this.sharing}
            note={t(
              "Allow documents within this collection to be shared publicly on the internet."
            )}
          />
        )}

        <Flex justify="flex-end">
          <Button type="submit" disabled={this.isSaving || !this.name}>
            {this.isSaving ? `${t("Creating")}…` : t("Create")}
          </Button>
        </Flex>
      </form>
    );
  }
}

const StyledIconPicker = styled(IconPicker)`
  margin-left: 4px;
  margin-right: -8px;
`;

export default withTranslation()(withStores(CollectionNew));
