import { debounce } from "es-toolkit/compat";
import { runInAction } from "mobx";
import { observer } from "mobx-react";
import {
  AcademicCapIcon,
  CheckboxIcon,
  CollectionIcon,
  CommentIcon,
  DocumentIcon,
  DoneIcon,
  EditIcon,
  EmailIcon,
  PublishIcon,
  SmileyIcon,
  StarredIcon,
  UserIcon,
  GroupIcon,
} from "outline-icons";
import * as React from "react";
import { useTranslation, Trans } from "react-i18next";
import { toast } from "sonner";
import { NotificationEventType } from "@shared/types";
import Heading from "~/components/Heading";
import Notice from "~/components/Notice";
import Scene from "~/components/Scene";
import Switch from "~/components/Switch";
import Text from "~/components/Text";
import useCurrentUser from "~/hooks/useCurrentUser";
import { client } from "~/utils/ApiClient";
import isCloudHosted from "~/utils/isCloudHosted";
import SettingRow from "./components/SettingRow";

function Notifications() {
  const user = useCurrentUser();
  const { t } = useTranslation();

  const options = [
    {
      events: [NotificationEventType.PublishDocument],
      icon: <PublishIcon />,
      title: t("Document published"),
      description: t(
        "Receive a notification whenever a new document is published"
      ),
    },
    {
      events: [NotificationEventType.UpdateDocument],
      icon: <EditIcon />,
      title: t("Document updated"),
      description: t(
        "Receive a notification when a document you are subscribed to is edited"
      ),
    },
    {
      events: [NotificationEventType.CreateComment],
      icon: <CommentIcon />,
      title: t("Comment posted"),
      description: t(
        "Receive a notification when a document you are subscribed to or a thread you participated in receives a comment"
      ),
    },
    {
      events: [
        NotificationEventType.MentionedInComment,
        NotificationEventType.MentionedInDocument,
      ],
      icon: <EmailIcon />,
      title: t("Mentioned"),
      description: t(
        "Receive a notification when someone mentions you in a document or comment"
      ),
    },
    {
      events: [
        NotificationEventType.GroupMentionedInDocument,
        NotificationEventType.GroupMentionedInComment,
      ],
      icon: <GroupIcon />,
      title: t("Group mentions"),
      description: t(
        "Receive a notification when someone mentions a group you are a member of in a document or comment"
      ),
    },
    {
      events: [NotificationEventType.ResolveComment],
      icon: <DoneIcon />,
      title: t("Resolved"),
      description: t(
        "Receive a notification when a comment thread you were involved in is resolved"
      ),
    },
    {
      events: [NotificationEventType.ReactionsCreate],
      icon: <SmileyIcon />,
      title: t("Reaction added"),
      description: t(
        "Receive a notification when someone reacts to your comment"
      ),
    },
    {
      events: [NotificationEventType.CreateCollection],
      icon: <CollectionIcon />,
      title: t("Collection created"),
      description: t(
        "Receive a notification whenever a new collection is created"
      ),
    },
    {
      events: [NotificationEventType.InviteAccepted],
      icon: <UserIcon />,
      title: t("Invite accepted"),
      description: t(
        "Receive a notification when someone you invited creates an account"
      ),
    },
    {
      events: [NotificationEventType.AddUserToDocument],
      icon: <DocumentIcon />,
      title: t("Invited to document"),
      description: t(
        "Receive a notification when a document is shared with you"
      ),
    },
    {
      events: [NotificationEventType.AddUserToCollection],
      icon: <CollectionIcon />,
      title: t("Invited to collection"),
      description: t(
        "Receive a notification when you are given access to a collection"
      ),
    },
    {
      events: [NotificationEventType.AddUserToGroup],
      icon: <GroupIcon />,
      title: t("Group membership"),
      description: t(
        "Receive a notification when you are added to or removed from a group"
      ),
    },
    {
      events: [NotificationEventType.ExportCompleted],
      icon: <CheckboxIcon checked />,
      title: t("Export completed"),
      description: t(
        "Receive a notification when an export you requested has been completed"
      ),
    },
    {
      events: [NotificationEventType.RequestDocumentAccess],
      icon: <CheckboxIcon checked />,
      title: t("Document access requested"),
      description: t(
        "Receive a notification when a user requests access to a document you manage"
      ),
    },
    {
      visible: isCloudHosted,
      icon: <AcademicCapIcon />,
      events: [NotificationEventType.Onboarding],
      title: t("Getting started"),
      description: t("Tips on getting started with features and functionality"),
    },
    {
      visible: isCloudHosted,
      icon: <StarredIcon />,
      events: [NotificationEventType.Features],
      title: t("New features"),
      description: t("Receive an email when new features of note are added"),
    },
  ];

  const visibleOptions = options.filter((o) => o.visible !== false);

  const showSuccessMessage = debounce(() => {
    toast.success(t("Notifications saved"));
  }, 500);

  const handleChange = React.useCallback(
    (eventTypes: NotificationEventType[]) => async (checked: boolean) => {
      // Sequential, as each request saves the full settings object.
      for (const eventType of eventTypes) {
        await user.setNotificationEventType(eventType, checked);
      }
      showSuccessMessage();
    },
    [user, showSuccessMessage]
  );

  const handleToggleAll = React.useCallback(
    async (checked: boolean) => {
      runInAction(() => {
        const updated = { ...user.notificationSettings };
        for (const option of visibleOptions) {
          for (const eventType of option.events) {
            updated[eventType] = checked;
          }
        }
        user.notificationSettings = updated;
      });
      await client.post(
        checked
          ? `/users.notificationsSubscribe`
          : `/users.notificationsUnsubscribe`
      );
      showSuccessMessage();
    },
    [user, visibleOptions, showSuccessMessage]
  );

  const allEnabled = visibleOptions.every((o) =>
    o.events.every((eventType) => user.subscribedToEventType(eventType))
  );

  const showSuccessNotice = window.location.search === "?success";

  return (
    <Scene title={t("Notifications")} icon={<EmailIcon />}>
      <Heading>{t("Notifications")}</Heading>

      {showSuccessNotice && (
        <Notice>
          <Trans>
            Unsubscription successful. Your notification settings were updated
          </Trans>
        </Notice>
      )}
      <Text as="p" type="secondary">
        <Trans>Manage when and where you receive email notifications.</Trans>
      </Text>

      <SettingRow
        name="allNotifications"
        label={t("All notifications")}
        compact
        border={false}
      >
        <Switch
          id="allNotifications"
          checked={allEnabled}
          onChange={handleToggleAll}
        />
      </SettingRow>

      {options.map((option) => {
        const [name] = option.events;
        const checked = option.events.every((eventType) =>
          user.subscribedToEventType(eventType)
        );

        return (
          <SettingRow
            key={name}
            visible={option.visible}
            label={option.title}
            name={name}
            description={
              <Text size="small" type="secondary">
                {option.description}
              </Text>
            }
            compact
          >
            <Switch
              key={name}
              id={name}
              name={name}
              checked={checked}
              onChange={handleChange(option.events)}
            />
          </SettingRow>
        );
      })}
    </Scene>
  );
}

export default observer(Notifications);
