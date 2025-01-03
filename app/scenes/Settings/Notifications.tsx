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
  StarredIcon,
  UserIcon,
} from "outline-icons";
import * as React from "react";
import { useTranslation, Trans } from "react-i18next";
import { toast } from "sonner";
import { NotificationEventType } from "@shared/types";
import Flex from "~/components/Flex";
import Heading from "~/components/Heading";
import Notice from "~/components/Notice";
import Scene from "~/components/Scene";
import Switch from "~/components/Switch";
import Text from "~/components/Text";
import env from "~/env";
import useCurrentTeam from "~/hooks/useCurrentTeam";
import useCurrentUser from "~/hooks/useCurrentUser";
import usePolicy from "~/hooks/usePolicy";
import isCloudHosted from "~/utils/isCloudHosted";
import SettingRow from "./components/SettingRow";

function Notifications() {
  const user = useCurrentUser();
  const team = useCurrentTeam();
  const { t } = useTranslation();
  const can = usePolicy(team.id);

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
      event: NotificationEventType.ResolveComment,
      icon: <DoneIcon />,
      title: t("Resolved"),
      description: t(
        "Receive a notification when a comment thread you were involved in is resolved"
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

  const handleChange = React.useCallback(
    async (ev: React.ChangeEvent<HTMLInputElement>) => {
      await user.setNotificationEventType(
        ev.target.name as NotificationEventType,
        ev.target.checked
      );
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
        <Trans>Manage when and where you receive email notifications.</Trans>
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

      <h2>{t("Notifications")}</h2>

      {options.map((option) => {
        const setting = user.subscribedToEventType(option.event);

        return (
          <SettingRow
            key={option.event}
            visible={option.visible}
            label={
              <Flex align="center" gap={4}>
                {option.icon} {option.title}
              </Flex>
            }
            name={option.event}
            description={option.description}
          >
            <Switch
              key={option.event}
              id={option.event}
              name={option.event}
              checked={!!setting}
              onChange={handleChange}
            />
          </SettingRow>
        );
      })}
    </Scene>
  );
}

export default observer(Notifications);
