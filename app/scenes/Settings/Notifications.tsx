import { debounce } from "lodash";
import { observer } from "mobx-react";
import { EmailIcon } from "outline-icons";
import * as React from "react";
import { useTranslation, Trans } from "react-i18next";
import Heading from "~/components/Heading";
import Input from "~/components/Input";
import Notice from "~/components/Notice";
import Scene from "~/components/Scene";
import Switch from "~/components/Switch";
import Text from "~/components/Text";
import env from "~/env";
import useCurrentUser from "~/hooks/useCurrentUser";
import useStores from "~/hooks/useStores";
import useToasts from "~/hooks/useToasts";
import isCloudHosted from "~/utils/isCloudHosted";
import SettingRow from "./components/SettingRow";

function Notifications() {
  const { notificationSettings } = useStores();
  const { showToast } = useToasts();
  const user = useCurrentUser();
  const { t } = useTranslation();

  const options = [
    {
      event: "documents.publish",
      title: t("Document published"),
      description: t(
        "Receive a notification whenever a new document is published"
      ),
    },
    {
      event: "documents.update",
      title: t("Document updated"),
      description: t(
        "Receive a notification when a document you created is edited"
      ),
    },
    {
      event: "collections.create",
      title: t("Collection created"),
      description: t(
        "Receive a notification whenever a new collection is created"
      ),
    },
    {
      separator: true,
    },
    {
      visible: isCloudHosted,
      event: "emails.onboarding",
      title: t("Getting started"),
      description: t(
        "Tips on getting started with Outline`s features and functionality"
      ),
    },
    {
      visible: isCloudHosted,
      event: "emails.features",
      title: t("New features"),
      description: t("Receive an email when new features of note are added"),
    },
  ];

  React.useEffect(() => {
    notificationSettings.fetchPage({});
  }, [notificationSettings]);

  const showSuccessMessage = debounce(() => {
    showToast(t("Notifications saved"), {
      type: "success",
    });
  }, 500);

  const handleChange = React.useCallback(
    async (ev: React.ChangeEvent<HTMLInputElement>) => {
      const setting = notificationSettings.getByEvent(ev.target.name);

      if (ev.target.checked) {
        await notificationSettings.save({
          event: ev.target.name,
        });
      } else if (setting) {
        await notificationSettings.delete(setting);
      }

      showSuccessMessage();
    },
    [notificationSettings, showSuccessMessage]
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
            if (option.separator || !option.event) {
              return <br />;
            }

            const setting = notificationSettings.getByEvent(option.event);

            return (
              <SettingRow
                visible={option.visible}
                label={option.title}
                name={option.event}
                description={option.description}
              >
                <Switch
                  key={option.event}
                  id={option.event}
                  name={option.event}
                  checked={!!setting}
                  onChange={handleChange}
                  disabled={
                    (setting && setting.isSaving) ||
                    notificationSettings.isFetching
                  }
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
