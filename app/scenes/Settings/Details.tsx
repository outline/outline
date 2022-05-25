import { observer } from "mobx-react";
import { TeamIcon } from "outline-icons";
import { useRef, useState } from "react";
import * as React from "react";
import { useTranslation, Trans } from "react-i18next";
import { getBaseDomain } from "@shared/utils/domains";
import Button from "~/components/Button";
import DefaultCollectionInputSelect from "~/components/DefaultCollectionInputSelect";
import Heading from "~/components/Heading";
import Input from "~/components/Input";
import Scene from "~/components/Scene";
import Text from "~/components/Text";
import env from "~/env";
import useCurrentTeam from "~/hooks/useCurrentTeam";
import useStores from "~/hooks/useStores";
import useToasts from "~/hooks/useToasts";
import isCloudHosted from "~/utils/isCloudHosted";
import ImageInput from "./components/ImageInput";
import SettingRow from "./components/SettingRow";

function Details() {
  const { auth } = useStores();
  const { showToast } = useToasts();
  const { t } = useTranslation();
  const team = useCurrentTeam();
  const form = useRef<HTMLFormElement>(null);
  const [name, setName] = useState(team.name);
  const [subdomain, setSubdomain] = useState(team.subdomain);
  const [avatarUrl, setAvatarUrl] = useState<string>(team.avatarUrl);
  const [defaultCollectionId, setDefaultCollectionId] = useState<string | null>(
    team.defaultCollectionId
  );

  const handleSubmit = React.useCallback(
    async (event?: React.SyntheticEvent) => {
      if (event) {
        event.preventDefault();
      }

      try {
        await auth.updateTeam({
          name,
          avatarUrl,
          subdomain,
          defaultCollectionId,
        });
        showToast(t("Settings saved"), {
          type: "success",
        });
      } catch (err) {
        showToast(err.message, {
          type: "error",
        });
      }
    },
    [auth, name, avatarUrl, subdomain, defaultCollectionId, showToast, t]
  );

  const handleNameChange = React.useCallback(
    (ev: React.ChangeEvent<HTMLInputElement>) => {
      setName(ev.target.value);
    },
    []
  );

  const handleSubdomainChange = React.useCallback(
    (ev: React.ChangeEvent<HTMLInputElement>) => {
      setSubdomain(ev.target.value.toLowerCase());
    },
    []
  );

  const handleAvatarUpload = async (avatarUrl: string) => {
    setAvatarUrl(avatarUrl);
    await auth.updateTeam({
      avatarUrl,
    });
    showToast(t("Logo updated"), {
      type: "success",
    });
  };

  const handleAvatarError = React.useCallback(
    (error: string | null | undefined) => {
      showToast(error || t("Unable to upload new logo"));
    },
    [showToast, t]
  );

  const onSelectCollection = React.useCallback(async (value: string) => {
    const defaultCollectionId = value === "home" ? null : value;
    setDefaultCollectionId(defaultCollectionId);
  }, []);

  const isValid = form.current?.checkValidity();

  return (
    <Scene title={t("Details")} icon={<TeamIcon color="currentColor" />}>
      <Heading>{t("Details")}</Heading>
      <Text type="secondary">
        <Trans>
          These settings affect the way that your knowledge base appears to
          everyone on the team.
        </Trans>
      </Text>

      <form onSubmit={handleSubmit} ref={form}>
        <SettingRow
          label={t("Logo")}
          name="avatarUrl"
          description={t(
            "The logo is displayed at the top left of the application."
          )}
        >
          <ImageInput
            onSuccess={handleAvatarUpload}
            onError={handleAvatarError}
            src={avatarUrl}
            borderRadius={0}
          />
        </SettingRow>
        <SettingRow
          label={t("Name")}
          name="name"
          description={t(
            "The team name, usually the same as your company name."
          )}
        >
          <Input
            id="name"
            autoComplete="organization"
            value={name}
            onChange={handleNameChange}
            required
          />
        </SettingRow>
        <SettingRow
          visible={env.SUBDOMAINS_ENABLED && isCloudHosted}
          label={t("Subdomain")}
          name="subdomain"
          description={
            subdomain ? (
              <>
                <Trans>Your knowledge base will be accessible at</Trans>{" "}
                <strong>
                  {subdomain}.{getBaseDomain()}
                </strong>
              </>
            ) : (
              t("Choose a subdomain to enable a login page just for your team.")
            )
          }
        >
          <Input
            id="subdomain"
            value={subdomain || ""}
            onChange={handleSubdomainChange}
            autoComplete="off"
            minLength={4}
            maxLength={32}
          />
        </SettingRow>
        <SettingRow
          border={false}
          label={t("Start view")}
          name="defaultCollectionId"
          description={t(
            "This is the screen that team members will first see when they sign in."
          )}
        >
          <DefaultCollectionInputSelect
            id="defaultCollectionId"
            onSelectCollection={onSelectCollection}
            defaultCollectionId={defaultCollectionId}
          />
        </SettingRow>

        <Button type="submit" disabled={auth.isSaving || !isValid}>
          {auth.isSaving ? `${t("Saving")}…` : t("Save")}
        </Button>
      </form>
    </Scene>
  );
}

export default observer(Details);
