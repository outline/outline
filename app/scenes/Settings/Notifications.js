// @flow
import { debounce } from "lodash";
import { observer, inject } from "mobx-react";
import { EmailIcon } from "outline-icons";
import * as React from "react";
import styled from "styled-components";
import AuthStore from "stores/AuthStore";
import NotificationSettingsStore from "stores/NotificationSettingsStore";
import UiStore from "stores/UiStore";
import Heading from "components/Heading";
import HelpText from "components/HelpText";
import Input from "components/Input";
import Notice from "components/Notice";
import Scene from "components/Scene";
import Subheading from "components/Subheading";

import NotificationListItem from "./components/NotificationListItem";

type Props = {
  ui: UiStore,
  auth: AuthStore,
  notificationSettings: NotificationSettingsStore,
};

const options = [
  {
    event: "documents.publish",
    title: "Document published",
    description: "Receive a notification whenever a new document is published",
  },
  {
    event: "documents.update",
    title: "Document updated",
    description: "Receive a notification when a document you created is edited",
  },
  {
    event: "collections.create",
    title: "Collection created",
    description: "Receive a notification whenever a new collection is created",
  },
  {
    separator: true,
  },
  {
    event: "emails.onboarding",
    title: "Getting started",
    description:
      "Tips on getting started with Outline`s features and functionality",
  },
  {
    event: "emails.features",
    title: "New features",
    description: "Receive an email when new features of note are added",
  },
];

@observer
class Notifications extends React.Component<Props> {
  componentDidMount() {
    this.props.notificationSettings.fetchPage();
  }

  handleChange = async (ev: SyntheticInputEvent<>) => {
    const { notificationSettings } = this.props;
    const setting = notificationSettings.getByEvent(ev.target.name);

    if (ev.target.checked) {
      await notificationSettings.save({
        event: ev.target.name,
      });
    } else if (setting) {
      await notificationSettings.delete(setting);
    }

    this.showSuccessMessage();
  };

  showSuccessMessage = debounce(() => {
    this.props.ui.showToast("Notifications saved", { type: "success" });
  }, 500);

  render() {
    const { notificationSettings, auth } = this.props;
    const showSuccessNotice = window.location.search === "?success";
    const { user, team } = auth;
    if (!team || !user) return null;

    return (
      <Scene title="Notifications" icon={<EmailIcon color="currentColor" />}>
        {showSuccessNotice && (
          <Notice>
            Unsubscription successful. Your notification settings were updated
          </Notice>
        )}
        <Heading>Notifications</Heading>
        <HelpText>
          Manage when and where you receive email notifications from Outline.
          Your email address can be updated in your SSO provider.
        </HelpText>

        <Input
          type="email"
          value={user.email}
          label="Email address"
          readOnly
          short
        />

        <Subheading>Notifications</Subheading>

        {options.map((option, index) => {
          if (option.separator) return <Separator key={`separator-${index}`} />;

          const setting = notificationSettings.getByEvent(option.event);

          return (
            <NotificationListItem
              key={option.event}
              onChange={this.handleChange}
              setting={setting}
              disabled={
                (setting && setting.isSaving) || notificationSettings.isFetching
              }
              {...option}
            />
          );
        })}
      </Scene>
    );
  }
}

const Separator = styled.hr`
  padding-bottom: 12px;
`;

export default inject("notificationSettings", "auth", "ui")(Notifications);
