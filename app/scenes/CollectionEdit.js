// @flow
import { observable } from "mobx";
import { inject, observer } from "mobx-react";
import * as React from "react";
import { withTranslation, Trans, type TFunction } from "react-i18next";
import AuthStore from "stores/AuthStore";
import UiStore from "stores/UiStore";
import Collection from "models/Collection";
import Button from "components/Button";
import Flex from "components/Flex";
import HelpText from "components/HelpText";
import IconPicker from "components/IconPicker";
import Input from "components/Input";
import InputSelect from "components/InputSelect";
import Switch from "components/Switch";

type Props = {
  collection: Collection,
  ui: UiStore,
  auth: AuthStore,
  onSubmit: () => void,
  t: TFunction,
};

@observer
class CollectionEdit extends React.Component<Props> {
  @observable name: string = this.props.collection.name;
  @observable sharing: boolean = this.props.collection.sharing;
  @observable icon: string = this.props.collection.icon;
  @observable color: string = this.props.collection.color || "#4E5C6E";
  @observable private: boolean = this.props.collection.private;
  @observable sort: { field: string, direction: "asc" | "desc" } = this.props
    .collection.sort;
  @observable isSaving: boolean;

  handleSubmit = async (ev: SyntheticEvent<*>) => {
    ev.preventDefault();
    this.isSaving = true;
    const { t } = this.props;

    try {
      await this.props.collection.save({
        name: this.name,
        icon: this.icon,
        color: this.color,
        private: this.private,
        sharing: this.sharing,
        sort: this.sort,
      });
      this.props.onSubmit();
      this.props.ui.showToast(t("The collection was updated"), {
        type: "success",
      });
    } catch (err) {
      this.props.ui.showToast(err.message, { type: "error" });
    } finally {
      this.isSaving = false;
    }
  };

  handleSortChange = (ev: SyntheticInputEvent<HTMLSelectElement>) => {
    const [field, direction] = ev.target.value.split(".");

    if (direction === "asc" || direction === "desc") {
      this.sort = { field, direction };
    }
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

  handleSharingChange = (ev: SyntheticInputEvent<*>) => {
    this.sharing = ev.target.checked;
  };

  render() {
    const { auth, t } = this.props;
    const teamSharingEnabled = !!auth.team && auth.team.sharing;

    return (
      <Flex column>
        <form onSubmit={this.handleSubmit}>
          <HelpText>
            <Trans>
              You can edit the name and other details at any time, however doing
              so often might confuse your team mates.
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
              onChange={this.handleChange}
              color={this.color}
              icon={this.icon}
            />
          </Flex>
          <InputSelect
            label={t("Sort in sidebar")}
            options={[
              { label: t("Alphabetical"), value: "title.asc" },
              { label: t("Manual sort"), value: "index.asc" },
            ]}
            value={`${this.sort.field}.${this.sort.direction}`}
            onChange={this.handleSortChange}
          />
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
          <Switch
            id="sharing"
            label={t("Public document sharing")}
            onChange={this.handleSharingChange}
            checked={this.sharing && teamSharingEnabled}
            disabled={!teamSharingEnabled}
          />
          <HelpText>
            {teamSharingEnabled ? (
              <Trans>
                When enabled, documents can be shared publicly on the internet.
              </Trans>
            ) : (
              <Trans>
                Public sharing is currently disabled in the team security
                settings.
              </Trans>
            )}
          </HelpText>
          <Button
            type="submit"
            disabled={this.isSaving || !this.props.collection.name}
          >
            {this.isSaving ? `${t("Saving")}…` : t("Save")}
          </Button>
        </form>
      </Flex>
    );
  }
}

export default withTranslation()<CollectionEdit>(
  inject("ui", "auth")(CollectionEdit)
);
