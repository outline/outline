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
  });

  const [allowedDomains, setAllowedDomains] = useState([
    ...(team.allowedDomains ?? []),
  ]);
  const [lastKnownDomainCount, updateLastKnownDomainCount] = useState(
    allowedDomains.length
  );

  const [existingDomainsTouched, setExistingDomainsTouched] = useState(false);

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

  const handleSaveDomains = React.useCallback(async () => {
    try {
      await auth.updateTeam({
        allowedDomains,
      });
      showSuccessMessage();
      setExistingDomainsTouched(false);
      updateLastKnownDomainCount(allowedDomains.length);
    } catch (err) {
      showToast(err.message, {
        type: "error",
      });
    }
  }, [auth, allowedDomains, showSuccessMessage, showToast]);

  const handleDefaultRoleChange = React.useCallback(
    async (newDefaultRole: string) => {
      await saveData({ ...data, defaultUserRole: newDefaultRole });
    },
    [data, saveData]
  );

  const handleInviteRequiredChange = React.useCallback(
    async (ev: React.ChangeEvent<HTMLInputElement>) => {
      const inviteRequired = ev.target.checked;
      const newData = { ...data, inviteRequired };

      if (inviteRequired) {
        dialogs.openModal({
          isCentered: true,
          title: t("Are you sure you want to require invites?"),
          content: (
            <ConfirmationDialog
              onSubmit={async () => {
                await saveData(newData);
              }}
              submitText={t("I’m sure")}
              savingText={`${t("Saving")}…`}
              danger
            >
              <Trans
                defaults="New users will first need to be invited to create an account. <em>Default role</em> and <em>Allowed domains</em> will no longer apply."
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
    const newDomains = allowedDomains.filter((_, i) => index !== i);

    setAllowedDomains(newDomains);

    const touchedExistingDomain = index < lastKnownDomainCount;
    if (touchedExistingDomain) {
      setExistingDomainsTouched(true);
    }
  };

  const handleAddDomain = () => {
    const newDomains = [...allowedDomains, ""];

    setAllowedDomains(newDomains);
  };

  const createOnDomainChangedHandler = (index: number) => (
    ev: React.ChangeEvent<HTMLInputElement>
  ) => {
    const newDomains = allowedDomains.slice();

    newDomains[index] = ev.currentTarget.value;
    setAllowedDomains(newDomains);

    const touchedExistingDomain = index < lastKnownDomainCount;
    if (touchedExistingDomain) {
      setExistingDomainsTouched(true);
    }
  };

  const showSaveChanges =
    existingDomainsTouched ||
    allowedDomains.filter((value: string) => value !== "").length > // New domains were added
      lastKnownDomainCount;

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
          label={t("Require invites")}
          name="inviteRequired"
          description={t(
            "Require members to be invited to the team before they can create an account using SSO."
          )}
        >
          <Switch
            id="inviteRequired"
            checked={data.inviteRequired}
            onChange={handleInviteRequiredChange}
          />
        </SettingRow>
      )}

      {!data.inviteRequired && (
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
      )}

      {!data.inviteRequired && (
        <SettingRow
          label={t("Allowed domains")}
          name="allowedDomains"
          description={t(
            "The domains which should be allowed to create new accounts using SSO. Changing this setting does not affect existing user accounts."
          )}
        >
          {allowedDomains.map((domain, index) => (
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
            {!allowedDomains.length ||
            allowedDomains[allowedDomains.length - 1] !== "" ? (
              <Fade>
                <Button type="button" onClick={handleAddDomain} neutral>
                  {allowedDomains.length ? (
                    <Trans>Add another</Trans>
                  ) : (
                    <Trans>Add a domain</Trans>
                  )}
                </Button>
              </Fade>
            ) : (
              <span />
            )}

            {showSaveChanges && (
              <Fade>
                <Button
                  type="button"
                  onClick={handleSaveDomains}
                  disabled={auth.isSaving}
                >
                  <Trans>Save changes</Trans>
                </Button>
              </Fade>
            )}
          </Flex>
        </SettingRow>
      )}
    </Scene>
  );
}

const Remove = styled("div")`
  margin-top: 6px;
`;

export default observer(Security);
