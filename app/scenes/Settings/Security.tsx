import { debounce } from "lodash";
import { observer } from "mobx-react";
import { CloseIcon, PadlockIcon } from "outline-icons";
import { useState } from "react";
import * as React from "react";
import { useTranslation, Trans } from "react-i18next";
import styled from "styled-components";
import Button from "~/components/Button";
import ConfirmationDialog from "~/components/ConfirmationDialog";
import Fade from "~/components/Fade";
import Flex from "~/components/Flex";
import Heading from "~/components/Heading";
import Input from "~/components/Input";
import InputSelect from "~/components/InputSelect";
import NudeButton from "~/components/NudeButton";
import Scene from "~/components/Scene";
import Switch from "~/components/Switch";
import Text from "~/components/Text";
import Tooltip from "~/components/Tooltip";
import env from "~/env";
import useCurrentTeam from "~/hooks/useCurrentTeam";
import useStores from "~/hooks/useStores";
import useToasts from "~/hooks/useToasts";
import isCloudHosted from "~/utils/isCloudHosted";
import SettingRow from "./components/SettingRow";

function Security() {
  const { auth, dialogs } = useStores();
  const team = useCurrentTeam();
  const { t } = useTranslation();
  const { showToast } = useToasts();
  const [data, setData] = useState({
    sharing: team.sharing,
    documentEmbeds: team.documentEmbeds,
    guestSignin: team.guestSignin,
    defaultUserRole: team.defaultUserRole,
    memberCollectionCreate: team.memberCollectionCreate,
    inviteRequired: team.inviteRequired,
    allowedDomains: team.allowedDomains,
  });

  const authenticationMethods = team.signinMethods;

  const showSuccessMessage = React.useMemo(
    () =>
      debounce(() => {
        showToast(t("Settings saved"), {
          type: "success",
        });
      }, 250),
    [showToast, t]
  );

  const [domainsChanged, setDomainsChanged] = useState(false);

  const saveData = React.useCallback(
    async (newData) => {
      try {
        setData(newData);
        await auth.updateTeam(newData);
        showSuccessMessage();
      } catch (err) {
        showToast(err.message, {
          type: "error",
        });
      } finally {
        setDomainsChanged(false);
      }
    },
    [auth, showSuccessMessage, showToast]
  );

  const handleChange = React.useCallback(
    async (ev: React.ChangeEvent<HTMLInputElement>) => {
      await saveData({ ...data, [ev.target.id]: ev.target.checked });
    },
    [data, saveData]
  );

  const handleDefaultRoleChange = React.useCallback(
    async (newDefaultRole: string) => {
      await saveData({ ...data, defaultUserRole: newDefaultRole });
    },
    [data, saveData]
  );

  const handleAllowSignupsChange = React.useCallback(
    async (ev: React.ChangeEvent<HTMLInputElement>) => {
      const inviteRequired = !ev.target.checked;
      const newData = { ...data, inviteRequired };

      if (inviteRequired) {
        dialogs.openModal({
          isCentered: true,
          title: t("Are you sure you want to disable authorized signups?"),
          content: (
            <ConfirmationDialog
              onSubmit={async () => {
                await saveData(newData);
              }}
              submitText={t("I’m sure — Disable")}
              savingText={`${t("Disabling")}…`}
              danger
            >
              <Trans
                defaults="New account creation using <em>{{ authenticationMethods }}</em> will be disabled. New users will need to be invited."
                values={{
                  authenticationMethods,
                }}
                components={{
                  em: <strong />,
                }}
              />
            </ConfirmationDialog>
          ),
        });
        return;
      }

      await saveData(newData);
    },
    [data, saveData, t, dialogs, authenticationMethods]
  );

  const handleRemoveDomain = async (index: number) => {
    const newData = {
      ...data,
    };
    newData.allowedDomains && newData.allowedDomains.splice(index, 1);

    setData(newData);
    setDomainsChanged(true);
  };

  const handleAddDomain = () => {
    const newData = {
      ...data,
      allowedDomains: [...(data.allowedDomains || []), ""],
    };

    setData(newData);
  };

  const createOnDomainChangedHandler = (index: number) => (
    ev: React.ChangeEvent<HTMLInputElement>
  ) => {
    const newData = { ...data };

    newData.allowedDomains![index] = ev.currentTarget.value;
    setData(newData);
    setDomainsChanged(true);
  };

  return (
    <Scene title={t("Security")} icon={<PadlockIcon color="currentColor" />}>
      <Heading>{t("Security")}</Heading>
      <Text type="secondary">
        <Trans>
          Settings that impact the access, security, and content of your
          knowledge base.
        </Trans>
      </Text>

      <SettingRow
        label={t("Allow email authentication")}
        name="guestSignin"
        description={
          env.EMAIL_ENABLED
            ? t("When enabled, users can sign-in using their email address")
            : t("The server must have SMTP configured to enable this setting")
        }
      >
        <Switch
          id="guestSignin"
          checked={data.guestSignin}
          onChange={handleChange}
          disabled={!env.EMAIL_ENABLED}
        />
      </SettingRow>
      <SettingRow
        label={t("Public document sharing")}
        name="sharing"
        description={t(
          "When enabled, documents can be shared publicly on the internet by any team member"
        )}
      >
        <Switch id="sharing" checked={data.sharing} onChange={handleChange} />
      </SettingRow>
      <SettingRow
        label={t("Rich service embeds")}
        name="documentEmbeds"
        description={t(
          "Links to supported services are shown as rich embeds within your documents"
        )}
      >
        <Switch
          id="documentEmbeds"
          checked={data.documentEmbeds}
          onChange={handleChange}
        />
      </SettingRow>
      <SettingRow
        label={t("Collection creation")}
        name="memberCollectionCreate"
        description={t(
          "Allow members to create new collections within the knowledge base"
        )}
      >
        <Switch
          id="memberCollectionCreate"
          checked={data.memberCollectionCreate}
          onChange={handleChange}
        />
      </SettingRow>
      {isCloudHosted && (
        <SettingRow
          label={t("Allow authorized signups")}
          name="allowSignups"
          description={
            <Trans
              defaults="Allow authorized <em>{{ authenticationMethods }}</em> users to create new accounts without first receiving an invite"
              values={{
                authenticationMethods,
              }}
              components={{
                em: <strong />,
              }}
            />
          }
        >
          <Switch
            id="allowSignups"
            checked={!data.inviteRequired}
            onChange={handleAllowSignupsChange}
          />
        </SettingRow>
      )}

      <SettingRow
        label={t("Default role")}
        name="defaultUserRole"
        description={t(
          "The default user role for new accounts. Changing this setting does not affect existing user accounts."
        )}
      >
        <InputSelect
          id="defaultUserRole"
          value={data.defaultUserRole}
          options={[
            {
              label: t("Member"),
              value: "member",
            },
            {
              label: t("Viewer"),
              value: "viewer",
            },
          ]}
          onChange={handleDefaultRoleChange}
          ariaLabel={t("Default role")}
          short
        />
      </SettingRow>

      <SettingRow
        label={t("Allowed Domains")}
        name="allowedDomains"
        description={t(
          "The domains which should be allowed to create accounts. This applies to both SSO and Email logins. Changing this setting does not affect existing user accounts."
        )}
      >
        {data.allowedDomains &&
          data.allowedDomains.map((domain, index) => (
            <Flex key={index} gap={4}>
              <Input
                key={index}
                id={`allowedDomains${index}`}
                value={domain}
                autoFocus={!domain}
                placeholder="example.com"
                required
                flex
                onChange={createOnDomainChangedHandler(index)}
              />
              <Remove>
                <Tooltip tooltip={t("Remove domain")} placement="top">
                  <NudeButton onClick={() => handleRemoveDomain(index)}>
                    <CloseIcon />
                  </NudeButton>
                </Tooltip>
              </Remove>
            </Flex>
          ))}

        <Flex justify="space-between" gap={4} style={{ flexWrap: "wrap" }}>
          {!data.allowedDomains?.length ||
          data.allowedDomains[data.allowedDomains.length - 1] !== "" ? (
            <Fade>
              <Button type="button" onClick={handleAddDomain} neutral>
                {data.allowedDomains?.length ? (
                  <Trans>Add another</Trans>
                ) : (
                  <Trans>Add a domain</Trans>
                )}
              </Button>
            </Fade>
          ) : (
            <span />
          )}

          {domainsChanged && (
            <Fade>
              <Button
                type="button"
                onClick={handleChange}
                disabled={auth.isSaving}
              >
                <Trans>Save changes</Trans>
              </Button>
            </Fade>
          )}
        </Flex>
      </SettingRow>
    </Scene>
  );
}

const Remove = styled("div")`
  margin-top: 6px;
`;

export default observer(Security);
