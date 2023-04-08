import { debounce } from "lodash";
import { observer } from "mobx-react";
import {
  AcademicCapIcon,
  CheckboxIcon,
  CollectionIcon,
  CommentIcon,
  EditIcon,
  EmailIcon,
  PublishIcon,
  StarredIcon,
  UserIcon,
} from "outline-icons";
import * as React from "react";
import { useTranslation, Trans } from "react-i18next";
import { NotificationEventType } from "@shared/types";
import Flex from "~/components/Flex";
import Heading from "~/components/Heading";
import Input from "~/components/Input";
import Notice from "~/components/Notice";
import Scene from "~/components/Scene";
import Switch from "~/components/Switch";
import Text from "~/components/Text";
import env from "~/env";
import useCurrentUser from "~/hooks/useCurrentUser";
import useToasts from "~/hooks/useToasts";
import isCloudHosted from "~/utils/isCloudHosted";
import SettingRow from "./components/SettingRow";

function Notifications() {
  const { showToast } = useToasts();
  const user = useCurrentUser();
  const { t } = useTranslation();

  const options = [
    {
      event: NotificationEventType.PublishDocument,
      icon: <PublishIcon color="currentColor" />,
      title: t("Document published"),
      description: t(
        "Receive a notification whenever a new document is published"
      ),
    },
    {
      event: NotificationEventType.UpdateDocument,
      icon: <EditIcon color="currentColor" />,
      title: t("Document updated"),
      description: t(
        "Receive a notification when a document you are subscribed to is edited"
      ),
    },
    {
      event: NotificationEventType.CreateComment,
      icon: <CommentIcon color="currentColor" />,
      title: t("Comment posted"),
      description: t(
        "Receive a notification when a document you are subscribed to or a thread you participated in receives a comment"
      ),
    },
    {
      event: NotificationEventType.Mentioned,
      icon: <EmailIcon color="currentColor" />,
      title: t("Mentioned"),
      description: t(
        "Receive a notification when someone mentions you in a document or comment"
      ),
    },
    {
      event: NotificationEventType.CreateCollection,
      icon: <CollectionIcon color="currentColor" />,
      title: t("Collection created"),
      description: t(
        "Receive a notification whenever a new collection is created"
      ),
    },
    {
      event: NotificationEventType.InviteAccepted,
      icon: <UserIcon color="currentColor" />,
      title: t("Invite accepted"),
      description: t(
        "Receive a notification when someone you invited creates an account"
      ),
    },
    {
      event: NotificationEventType.ExportCompleted,
      icon: <CheckboxIcon checked color="currentColor" />,
      title: t("Export completed"),
      description: t(
        "Receive a notification when an export you requested has been completed"
      ),
    },
    {
      visible: isCloudHosted,
      icon: <AcademicCapIcon color="currentColor" />,
      event: NotificationEventType.Onboarding,
      title: t("Getting started"),
      description: t("Tips on getting started with features and functionality"),
    },
    {
      visible: isCloudHosted,
      icon: <StarredIcon color="currentColor" />,
      event: NotificationEventType.Features,
      title: t("New features"),
      description: t("Receive an email when new features of note are added"),
    },
  ];

  const showSuccessMessage = debounce(() => {
    showToast(t("Notifications saved"), {
      type: "success",
    });
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
    <Scene title={t("Notifications")} icon={<EmailIcon color="currentColor" />}>
      <Heading>{t("Notifications")}</Heading>

      {showSuccessNotice && (
        <Notice>
          <Trans>
            Unsubscription successful. Your notification settings were updated
          </Trans>
        </Notice>
      )}
      <Text type="secondary">
        <Trans>Manage when and where you receive email notifications.</Trans>
      </Text>

      {env.EMAIL_ENABLED ? (
        <>
          <SettingRow
            label={t("Email address")}
            name="email"
            description={t(
              "Your email address should be updated in your SSO provider."
            )}
          >
            <Input type="email" value={user.email} readOnly />
          </SettingRow>

          <h2>{t("Notifications")}</h2>

          {options.map((option) => {
            const setting = user.subscribedToEventType(option.event);

            return (
              <SettingRow
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
        </>
      ) : (
        <Notice>
          <Trans>
            The email integration is currently disabled. Please set the
            associated environment variables and restart the server to enable
            notifications.
          </Trans>
        </Notice>
      )}
    </Scene>
  );
}

export default observer(Notifications);
