import { observer } from "mobx-react";
import { CopyIcon, InternetIcon, ReplaceIcon } from "outline-icons";
import * as React from "react";
import { Controller, useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { useParams } from "react-router-dom";
import { toast } from "sonner";
import { OAuthClientValidation } from "@shared/validations";
import OAuthClient from "~/models/oauth/OAuthClient";
import Breadcrumb from "~/components/Breadcrumb";
import Button from "~/components/Button";
import ConfirmationDialog from "~/components/ConfirmationDialog";
import ContentEditable from "~/components/ContentEditable";
import Heading from "~/components/Heading";
import Input from "~/components/Input";
import LoadingIndicator from "~/components/LoadingIndicator";
import NudeButton from "~/components/NudeButton";
import { FormData } from "~/components/OAuthClient/OAuthClientForm";
import Scene from "~/components/Scene";
import Switch from "~/components/Switch";
import Tooltip from "~/components/Tooltip";
import useRequest from "~/hooks/useRequest";
import useStores from "~/hooks/useStores";
import OAuthClientMenu from "~/menus/OAuthClientMenu";
import isCloudHosted from "~/utils/isCloudHosted";
import { settingsPath } from "~/utils/routeHelpers";
import { ActionRow } from "./components/ActionRow";
import { CopyButton } from "./components/CopyButton";
import ImageInput from "./components/ImageInput";
import SettingRow from "./components/SettingRow";

type Props = {
  oauthClient: OAuthClient;
};

const LoadingState = observer(function LoadingState() {
  const { id } = useParams<{ id: string }>();
  const { oauthClients } = useStores();
  const oauthClient = oauthClients.get(id);
  const { request } = useRequest(() => oauthClients.fetch(id));

  React.useEffect(() => {
    if (!oauthClient) {
      void request();
    }
  }, [oauthClient]);

  if (!oauthClient) {
    return <LoadingIndicator />;
  }

  return <Application oauthClient={oauthClient} />;
});

const Application = observer(function Application({ oauthClient }: Props) {
  const { t } = useTranslation();
  const { dialogs } = useStores();

  const {
    register,
    handleSubmit: formHandleSubmit,
    formState,
    getValues,
    setError,
    control,
  } = useForm<FormData>({
    mode: "all",
    defaultValues: {
      name: oauthClient.name ?? "",
      developerName: oauthClient.developerName ?? "",
      developerUrl: oauthClient.developerUrl ?? "",
      description: oauthClient.description ?? "",
      avatarUrl: oauthClient.avatarUrl ?? "",
      redirectUris: oauthClient.redirectUris ?? [],
      published: oauthClient.published ?? false,
    },
  });

  const handleSubmit = React.useCallback(
    async (data: FormData) => {
      try {
        await oauthClient.save(data);
        toast.success(
          oauthClient.published
            ? t("Application published")
            : t("Application updated")
        );
      } catch (error) {
        toast.error(error.message);
      }
    },
    [oauthClient, t]
  );

  const handleRotateSecret = React.useCallback(async () => {
    const onDelete = async () => {
      try {
        await oauthClient.rotateClientSecret();
        toast.success(t("Client secret rotated"));
      } catch (err) {
        toast.error(err.message);
      }
    };

    dialogs.openModal({
      title: t("Rotate secret"),
      content: (
        <ConfirmationDialog onSubmit={onDelete} danger>
          {t(
            "Rotating the client secret will invalidate the current secret. Make sure to update any applications using these credentials."
          )}
        </ConfirmationDialog>
      ),
    });
  }, [t, dialogs, oauthClient]);

  return (
    <Scene
      title={oauthClient.name}
      left={
        <Breadcrumb
          items={[
            {
              type: "route",
              title: t("Applications"),
              to: settingsPath("applications"),
              icon: <InternetIcon />,
            },
          ]}
        />
      }
      actions={<OAuthClientMenu oauthClient={oauthClient} showEdit={false} />}
    >
      <form onSubmit={formHandleSubmit(handleSubmit)}>
        <Heading>
          <Controller
            control={control}
            name="name"
            render={({ field }) => (
              <ContentEditable
                value={field.value}
                placeholder={t("Name")}
                onChange={field.onChange}
                maxLength={OAuthClientValidation.maxNameLength}
              />
            )}
          />
        </Heading>

        <SettingRow
          label={t("Icon")}
          name="avatarUrl"
          description={t("Displayed to users when authorizing")}
        >
          <Controller
            control={control}
            name="avatarUrl"
            render={({ field }) => (
              <ImageInput
                onSuccess={(url) => field.onChange(url)}
                onError={(err) => setError("avatarUrl", { message: err })}
                model={{
                  id: oauthClient.id,
                  avatarUrl: field.value,
                  initial: getValues().name[0],
                }}
                borderRadius={0}
              />
            )}
          />
        </SettingRow>

        <SettingRow
          name="description"
          label={t("Tagline")}
          description={t("A short description")}
        >
          <Input
            type="text"
            {...register("description", {
              maxLength: OAuthClientValidation.maxDescriptionLength,
            })}
            flex
          />
        </SettingRow>

        <SettingRow
          name="details"
          label={t("Details")}
          description={t(
            "Developer information shown to users when authorizing"
          )}
          border={isCloudHosted}
        >
          <Input
            type="text"
            label={t("Developer name")}
            {...register("developerName", {
              maxLength: OAuthClientValidation.maxDeveloperNameLength,
            })}
            flex
          />
          <Input
            type="text"
            label={t("Developer URL")}
            {...register("developerUrl", {
              maxLength: OAuthClientValidation.maxDeveloperUrlLength,
            })}
            flex
          />
        </SettingRow>
        {isCloudHosted && (
          <SettingRow
            name="published"
            label={t("Published")}
            description={t(
              "Allow users from other workspaces to authorize this app"
            )}
            border={false}
          >
            <Switch id="published" {...register("published")} />
          </SettingRow>
        )}

        <h2>{t("Credentials")}</h2>
        <SettingRow
          name="clientId"
          label={t("OAuth client ID")}
          description={t("The public identifier for this app")}
        >
          <Input id="clientId" value={oauthClient.clientId} readOnly>
            <CopyButton
              value={oauthClient.clientId}
              success={t("Copied to clipboard")}
              tooltip={t("Copy")}
              icon={<CopyIcon size={20} />}
            />
          </Input>
        </SettingRow>
        <SettingRow
          name="clientSecret"
          label={t("OAuth client secret")}
          description={t(
            "Store this value securely, do not expose it publicly"
          )}
        >
          <Input
            id="clientSecret"
            type="password"
            value={oauthClient.clientSecret}
            readOnly
          >
            <Tooltip content={t("Rotate secret")} placement="top">
              <NudeButton type="button" onClick={handleRotateSecret}>
                <ReplaceIcon size={20} />
              </NudeButton>
            </Tooltip>

            <CopyButton
              value={oauthClient.clientSecret}
              success={t("Copied to clipboard")}
              tooltip={t("Copy")}
              icon={<CopyIcon size={20} />}
            />
          </Input>
        </SettingRow>
        <SettingRow
          name="redirectUris"
          label={t("Callback URLs")}
          description={t(
            "Where users are redirected after authorizing this app"
          )}
        >
          <Controller
            control={control}
            name="redirectUris"
            render={({ field }) => (
              <Input
                id="redirectUris"
                type="textarea"
                placeholder="https://example.com/callback"
                ref={field.ref}
                value={field.value.join("\n")}
                rows={Math.max(2, field.value.length + 1)}
                onChange={(event) => {
                  field.onChange(event.target.value.split("\n"));
                }}
                required
              />
            )}
          />
        </SettingRow>
        <SettingRow
          name="authorizationUrl"
          label={t("Authorization URL")}
          description={t("Where users are redirected to authorize this app")}
          border={false}
        >
          <Input
            id="authorizationUrl"
            value={oauthClient.authorizationUrl}
            readOnly
          >
            <CopyButton
              value={oauthClient.authorizationUrl}
              success={t("Copied to clipboard")}
              tooltip={t("Copy link")}
            />
          </Input>
        </SettingRow>

        <ActionRow>
          <Button
            type="submit"
            disabled={formState.isSubmitting || !formState.isValid}
          >
            {formState.isSubmitting ? `${t("Saving")}…` : t("Save")}
          </Button>
        </ActionRow>
      </form>
    </Scene>
  );
});

export default LoadingState;
