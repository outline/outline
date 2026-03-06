import debounce from "lodash/debounce";
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
import { Link } from "react-router-dom";
import { toast } from "sonner";
import {
  NotificationEventType,
  NotificationChannelType,
  IntegrationService,
  IntegrationType,
} from "@shared/types";
import Heading from "~/components/Heading";
import Notice from "~/components/Notice";
import Scene from "~/components/Scene";
import Text from "~/components/Text";
import { HStack } from "~/components/primitives/HStack";
import env from "~/env";
import useCurrentTeam from "~/hooks/useCurrentTeam";
import useCurrentUser from "~/hooks/useCurrentUser";
import usePolicy from "~/hooks/usePolicy";
import useStores from "~/hooks/useStores";
import isCloudHosted from "~/utils/isCloudHosted";
import { settingsPath } from "~/utils/routeHelpers";
import ChannelSelector from "./components/ChannelSelector";
import SettingRow from "./components/SettingRow";

function Notifications() {
  const user = useCurrentUser();
  const team = useCurrentTeam();
  const { t } = useTranslation();
  const can = usePolicy(team.id);
  const { integrations } = useStores();

  const hasSlackLinked = !!integrations.find({
    type: IntegrationType.LinkedAccount,
    service: IntegrationService.Slack,
  });

  const options = [
    {
      event: NotificationEventType.PublishDocument,
      icon: <PublishIcon />,
      title: t("Document published"),
      description: t(
        "Receive a notification whenever a new document is published"
      ),
    },
    {
      event: NotificationEventType.UpdateDocument,
      icon: <EditIcon />,
      title: t("Document updated"),
      description: t(
        "Receive a notification when a document you are subscribed to is edited"
      ),
    },
    {
      event: NotificationEventType.CreateComment,
      icon: <CommentIcon />,
      title: t("Comment posted"),
      description: t(
        "Receive a notification when a document you are subscribed to or a thread you participated in receives a comment"
      ),
    },
    {
      event: NotificationEventType.MentionedInComment,
      icon: <EmailIcon />,
      title: t("Mentioned"),
      description: t(
        "Receive a notification when someone mentions you in a document or comment"
      ),
    },
    {
      event: NotificationEventType.GroupMentionedInDocument,
      icon: <GroupIcon />,
      title: t("Group mentions"),
      description: t(
        "Receive a notification when someone mentions a group you are a member of in a document or comment"
      ),
    },
    {
      event: NotificationEventType.ResolveComment,
      icon: <DoneIcon />,
      title: t("Resolved"),
      description: t(
        "Receive a notification when a comment thread you were involved in is resolved"
      ),
    },
    {
      event: NotificationEventType.ReactionsCreate,
      icon: <SmileyIcon />,
      title: t("Reaction added"),
      description: t(
        "Receive a notification when someone reacts to your comment"
      ),
    },
    {
      event: NotificationEventType.CreateCollection,
      icon: <CollectionIcon />,
      title: t("Collection created"),
      description: t(
        "Receive a notification whenever a new collection is created"
      ),
    },
    {
      event: NotificationEventType.InviteAccepted,
      icon: <UserIcon />,
      title: t("Invite accepted"),
      description: t(
        "Receive a notification when someone you invited creates an account"
      ),
    },
    {
      event: NotificationEventType.AddUserToDocument,
      icon: <DocumentIcon />,
      title: t("Invited to document"),
      description: t(
        "Receive a notification when a document is shared with you"
      ),
    },
    {
      event: NotificationEventType.AddUserToCollection,
      icon: <CollectionIcon />,
      title: t("Invited to collection"),
      description: t(
        "Receive a notification when you are given access to a collection"
      ),
    },
    {
      event: NotificationEventType.ExportCompleted,
      icon: <CheckboxIcon checked />,
      title: t("Export completed"),
      description: t(
        "Receive a notification when an export you requested has been completed"
      ),
    },
    {
      visible: isCloudHosted,
      icon: <AcademicCapIcon />,
      event: NotificationEventType.Onboarding,
      title: t("Getting started"),
      description: t("Tips on getting started with features and functionality"),
    },
    {
      visible: isCloudHosted,
      icon: <StarredIcon />,
      event: NotificationEventType.Features,
      title: t("New features"),
      description: t("Receive an email when new features of note are added"),
    },
  ];

  const showSuccessMessage = debounce(() => {
    toast.success(t("Notifications saved"));
  }, 500);

  const handleChannelsChange = React.useCallback(
    (eventType: NotificationEventType) =>
      async (channels: NotificationChannelType[]) => {
        for (const channel of [
          NotificationChannelType.Email,
          NotificationChannelType.Slack,
        ]) {
          const shouldEnable = channels.includes(channel);
          const currentlyEnabled = user.subscribedToEventType(
            eventType,
            channel
          );

          if (shouldEnable !== currentlyEnabled) {
            await user.setNotificationEventType(
              eventType,
              shouldEnable,
              channel
            );
          }
        }
        showSuccessMessage();
      },
    [user, showSuccessMessage]
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
        <Trans>
          Manage when and where you receive notifications. Choose to receive
          notifications via email, Slack, or both.
        </Trans>
      </Text>

      {env.EMAIL_ENABLED && can.manage && (
        <Notice>
          <Trans>
            The email integration is currently disabled. Please set the
            associated environment variables and restart the server to enable
            notifications.
          </Trans>
        </Notice>
      )}

      {!hasSlackLinked && (
        <Notice>
          <Trans
            defaults="To receive Slack notifications, <link>link your Slack account</link> in the integrations settings."
            components={{
              link: <Link to={settingsPath("slack")} />,
            }}
          />
        </Notice>
      )}

      <h2>{t("Notification Channels")}</h2>

      {options.map((option) => {
        const emailSetting = user.subscribedToEventType(
          option.event,
          NotificationChannelType.Email
        );
        const slackSetting = user.subscribedToEventType(
          option.event,
          NotificationChannelType.Slack
        );

        const enabledChannels: NotificationChannelType[] = [];
        if (emailSetting) {
          enabledChannels.push(NotificationChannelType.Email);
        }
        if (slackSetting) {
          enabledChannels.push(NotificationChannelType.Slack);
        }

        return (
          <SettingRow
            key={option.event}
            visible={option.visible}
            label={
              <HStack spacing={4}>
                {option.icon} {option.title}
              </HStack>
            }
            name={option.event}
            description={option.description}
          >
            <ChannelSelector
              value={enabledChannels}
              onChange={handleChannelsChange(option.event)}
              slackDisabled={!hasSlackLinked}
            />
          </SettingRow>
        );
      })}
    </Scene>
  );
}

export default observer(Notifications);
