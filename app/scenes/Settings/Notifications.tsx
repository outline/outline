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
import { errToString } from "@shared/utils/error";
import Heading from "~/components/Heading";
import Notice from "~/components/Notice";
import Scene from "~/components/Scene";
import Switch from "~/components/Switch";
import Text from "~/components/Text";
import useCurrentUser from "~/hooks/useCurrentUser";
import { client } from "~/utils/ApiClient";
import isCloudHosted from "~/utils/isCloudHosted";
import SettingRow from "./components/SettingRow";
import { SettingsSection } from "./components/SettingsSection";

interface NotificationOption {
  /** The event types that the option controls. */
  events: NotificationEventType[];
  /** The icon for the option. */
  icon: React.ReactNode;
  /** The label for the option. */
  title: string;
  /** The description for the option. */
  description: string;
}

interface NotificationGroup {
  /** A stable key for the group. */
  id: string;
  /** The section heading. */
  title: string;
  /** A summary of the notification types in the group. */
  description: string;
  /** Whether the group is shown. Defaults to true. */
  visible?: boolean;
  /** The options in the group. */
  options: NotificationOption[];
}

function Notifications() {
  const user = useCurrentUser();
  const { t } = useTranslation();

  const groups: NotificationGroup[] = [
    {
      id: "documents",
      title: t("Documents"),
      description: t(
        "Documents that are published, updated, or shared with you, and access requests"
      ),
      options: [
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
          events: [NotificationEventType.AddUserToDocument],
          icon: <DocumentIcon />,
          title: t("Invited to document"),
          description: t(
            "Receive a notification when a document is shared with you"
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
      ],
    },
    {
      id: "collections",
      title: t("Collections"),
      description: t("New collections and access to collections"),
      options: [
        {
          events: [NotificationEventType.CreateCollection],
          icon: <CollectionIcon />,
          title: t("Collection created"),
          description: t(
            "Receive a notification whenever a new collection is created"
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
      ],
    },
    {
      id: "comments",
      title: t("Comments and mentions"),
      description: t(
        "New comments, mentions of you or your groups, resolved threads, and reactions"
      ),
      options: [
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
      ],
    },
    {
      id: "workspace",
      title: t("Workspace"),
      description: t(
        "Group membership, accepted invites, and completed exports"
      ),
      options: [
        {
          events: [NotificationEventType.AddUserToGroup],
          icon: <GroupIcon />,
          title: t("Group membership"),
          description: t(
            "Receive a notification when you are added to or removed from a group"
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
          events: [NotificationEventType.ExportCompleted],
          icon: <CheckboxIcon checked />,
          title: t("Export completed"),
          description: t(
            "Receive a notification when an export you requested has been completed"
          ),
        },
      ],
    },
    {
      id: "product",
      title: t("Product updates"),
      description: t(
        "Tips on getting started and announcements of new features"
      ),
      visible: isCloudHosted,
      options: [
        {
          icon: <AcademicCapIcon />,
          events: [NotificationEventType.Onboarding],
          title: t("Getting started"),
          description: t(
            "Tips on getting started with features and functionality"
          ),
        },
        {
          icon: <StarredIcon />,
          events: [NotificationEventType.Features],
          title: t("New features"),
          description: t(
            "Receive an email when new features of note are added"
          ),
        },
      ],
    },
  ];

  const visibleGroups = groups.filter((group) => group.visible !== false);
  const visibleEvents = visibleGroups.flatMap((group) =>
    group.options.flatMap((option) => option.events)
  );

  const showSuccessMessage = debounce(() => {
    toast.success(t("Notifications saved"));
  }, 500);

  const handleChange = React.useCallback(
    (eventTypes: NotificationEventType[]) => async (checked: boolean) => {
      const changed = eventTypes.filter(
        (eventType) => user.subscribedToEventType(eventType) !== checked
      );

      // Update all switches at once, before the requests complete.
      runInAction(() => {
        const updated = { ...user.notificationSettings };
        for (const eventType of changed) {
          updated[eventType] = checked;
        }
        user.notificationSettings = updated;
      });

      const unsaved = new Set(changed);

      try {
        // Sequential, as each request saves the full settings object.
        for (const eventType of changed) {
          await user.setNotificationEventType(eventType, checked);
          unsaved.delete(eventType);
        }
        showSuccessMessage();
      } catch (err) {
        toast.error(errToString(err));

        // Restore the events that were not saved.
        runInAction(() => {
          const updated = { ...user.notificationSettings };
          for (const eventType of unsaved) {
            updated[eventType] = !checked;
          }
          user.notificationSettings = updated;
        });
      }
    },
    [user, showSuccessMessage]
  );

  const handleToggleAll = React.useCallback(
    async (checked: boolean) => {
      runInAction(() => {
        const updated = { ...user.notificationSettings };
        for (const eventType of visibleEvents) {
          updated[eventType] = checked;
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
    [user, visibleEvents, showSuccessMessage]
  );

  const isSubscribed = (eventTypes: NotificationEventType[]) =>
    eventTypes.every((eventType) => user.subscribedToEventType(eventType));

  const allEnabled = isSubscribed(visibleEvents);

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

      {visibleGroups.map((group) => {
        const groupEvents = group.options.flatMap((option) => option.events);
        const groupChecked = isSubscribed(groupEvents);
        const isMixed =
          !groupChecked &&
          groupEvents.some((eventType) =>
            user.subscribedToEventType(eventType)
          );

        return (
          <SettingsSection
            key={group.id}
            title={group.title}
            description={group.description}
            collapsible
            defaultOpen={isMixed}
            action={
              <Switch
                aria-label={group.title}
                checked={groupChecked}
                onChange={handleChange(groupEvents)}
              />
            }
          >
            {group.options.map((option) => {
              const [name] = option.events;

              return (
                <SettingRow
                  key={name}
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
                    id={name}
                    name={name}
                    checked={isSubscribed(option.events)}
                    onChange={handleChange(option.events)}
                  />
                </SettingRow>
              );
            })}
          </SettingsSection>
        );
      })}
    </Scene>
  );
}

export default observer(Notifications);
